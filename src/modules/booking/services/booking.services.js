import Booking from '../models/booking.model.js';
import Test from '../../medical-test/models/medical-test.model.js';
import { AppError } from '../../../utils/ApiError.js';
import { BOOKING_STATUS, TERMINAL_BOOKING_STATUSES, USER_ROLES } from '../../../config/constants.js';
import logger from '../../../utils/logger.js';

/**
 * Create a new booking
 * - Validates test exists and is available
 * - Validates appointment date is in the future
 * - Snapshots the current test price
 */
export const createBooking = async (userId, bookingData) => {
    const { testId, patientName, patientAge, patientGender, address, appointmentDate, timeSlot, notes } = bookingData;
    logger.info(`📅 Creating booking: User=${userId}, Test=${testId}, Slot=${timeSlot}, Date=${appointmentDate}`);

    // Validate test exists and is available
    const test = await Test.findById(testId);
    if (!test) {
        logger.warn(`Booking failed: Test ${testId} not found`);
        throw new AppError('Test not found', 404);
    }
    if (!test.isAvailable) {
        logger.warn(`Booking failed: Test '${test.name}' is currently unavailable`);
        throw new AppError('This test is currently not available for booking', 400);
    }

    // Appointment date must be in the future
    const apptDate = new Date(appointmentDate);
    if (apptDate <= new Date()) {
        logger.warn(`Booking failed: Invalid date ${appointmentDate} (must be in future)`);
        throw new AppError('Appointment date must be a future date', 400);
    }

    // Prevent double booking — same test, same date, same slot
    const startOfDay = new Date(apptDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(apptDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingBooking = await Booking.findOne({
        test: testId,
        timeSlot,
        appointmentDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED] }
    });
    if (existingBooking) {
        logger.warn(`Booking clash: Slot '${timeSlot}' on ${appointmentDate} already taken for test '${test.name}'`);
        throw new AppError(
            `Slot '${timeSlot}' on this date is already booked. Please choose a different slot.`,
            409
        );
    }

    const booking = await Booking.create({
        user: userId,
        test: testId,
        patientName,
        patientAge,
        patientGender,
        address,
        appointmentDate: apptDate,
        timeSlot,
        totalAmount: test.price, // Snapshot price at booking time
        notes: notes || '',
    });

    logger.info(`✅ Booking created successfully: ID=${booking._id}, Patient=${patientName}, Amount=₹${test.price}`);

    // Return populated booking
    return await booking.populate([
        { path: 'test', select: 'name category price' },
        { path: 'user', select: 'name email' }
    ]);
};

/**
 * Get all bookings for the logged-in user
 */
export const getMyBookings = async (userId) => {
    logger.debug(`Fetching user bookings for userId=${userId}`);
    const bookings = await Booking.find({ user: userId })
        .populate('test', 'name category price description')
        .sort({ appointmentDate: -1 });

    return bookings;
};

/**
 * Get a single booking by ID
 * - Users can only view their own bookings
 * - Admin/Lab staff can view any booking
 */
export const getBookingById = async (bookingId, requestingUser) => {
    logger.debug(`Fetching booking ${bookingId} for requesting user ${requestingUser._id} (${requestingUser.role})`);
    const booking = await Booking.findById(bookingId)
        .populate('test', 'name category price description')
        .populate('user', 'name email')
        .populate('updatedBy', 'name role');

    if (!booking) {
        logger.warn(`Booking not found: ID=${bookingId}`);
        throw new AppError('Booking not found', 404);
    }

    // Regular users can only see their own bookings
    const isOwner = booking.user._id.toString() === requestingUser._id.toString();
    const isPrivileged = [USER_ROLES.ADMIN, USER_ROLES.LAB_STAFF].includes(requestingUser.role);

    if (!isOwner && !isPrivileged) {
        logger.warn(`Unauthorized booking access: User ${requestingUser._id} attempted to view booking ${bookingId} owned by ${booking.user._id}`);
        throw new AppError('You are not authorized to view this booking', 403);
    }

    return booking;
};

/**
 * Get all bookings — Admin & Lab Staff only
 * Supports optional filtering by status
 */
export const getAllBookings = async (filters = {}) => {
    const query = {};

    if (filters.status) {
        query.status = filters.status;
    }
    if (filters.date) {
        const day = new Date(filters.date);
        const nextDay = new Date(day);
        nextDay.setDate(nextDay.getDate() + 1);
        query.appointmentDate = { $gte: day, $lt: nextDay };
    }

    logger.debug(`Admin/Staff fetching bookings with filters:`, filters);

    const bookings = await Booking.find(query)
        .populate('test', 'name category price')
        .populate('user', 'name email')
        .populate('updatedBy', 'name role')
        .sort({ appointmentDate: 1 });

    return bookings;
};

/**
 * Update booking status — Admin & Lab Staff only
 * Valid transitions:
 *   pending → confirmed → completed
 *   pending | confirmed → cancelled
 */
export const updateBookingStatus = async (bookingId, newStatus, updatedByUserId) => {
    logger.info(`Status update request: Booking=${bookingId}, TargetStatus=${newStatus}, ByUser=${updatedByUserId}`);

    const booking = await Booking.findById(bookingId);
    if (!booking) {
        logger.warn(`Status update failed: Booking ${bookingId} not found`);
        throw new AppError('Booking not found', 404);
    }

    // Prevent re-updating already terminal states
    if (TERMINAL_BOOKING_STATUSES.includes(booking.status)) {
        logger.warn(`Status update rejected: Booking ${bookingId} is already in terminal state '${booking.status}'`);
        throw new AppError(
            `Cannot update a booking that is already '${booking.status}'`,
            400
        );
    }

    const prevStatus = booking.status;
    booking.status = newStatus;
    booking.updatedBy = updatedByUserId;
    await booking.save();

    logger.info(`✅ Booking ${bookingId} status transitioned: '${prevStatus}' ➔ '${newStatus}'`);

    return await booking.populate([
        { path: 'test', select: 'name category price' },
        { path: 'user', select: 'name email' },
        { path: 'updatedBy', select: 'name role' }
    ]);
};

/**
 * Cancel a booking — by the user who owns it
 * Only pending bookings can be cancelled by the user
 */
export const cancelMyBooking = async (bookingId, userId) => {
    logger.info(`Cancellation request: Booking=${bookingId}, RequestedByUser=${userId}`);

    const booking = await Booking.findOne({ _id: bookingId, user: userId });

    if (!booking) {
        logger.warn(`Cancellation failed: Booking ${bookingId} not found for user ${userId}`);
        throw new AppError('Booking not found', 404);
    }
    if (booking.status !== BOOKING_STATUS.PENDING) {
        logger.warn(`Cancellation rejected: Booking ${bookingId} status is '${booking.status}' (only pending can be cancelled)`);
        throw new AppError(
            `Only pending bookings can be cancelled. This booking is '${booking.status}'`,
            400
        );
    }

    booking.status = BOOKING_STATUS.CANCELLED;
    await booking.save();

    logger.info(`✅ Booking ${bookingId} successfully cancelled by owner ${userId}`);

    return booking;
};
