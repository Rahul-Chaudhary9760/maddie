import Booking from '../models/booking.model.js';
import Test from '../../medical-test/models/medical-test.model.js';
import User from '../../auth/models/user.model.js';
import Phlebotomist from '../../phlebotomist/models/phlebotomist.model.js';
import { AppError } from '../../../utils/ApiError.js';
import {
    BOOKING_STATUS,
    PHLEBOTOMIST_UPDATABLE_STATUSES,
    TERMINAL_BOOKING_STATUSES,
    UPDATABLE_BOOKING_STATUSES,
    USER_ROLES
} from '../../../config/constants.js';
import logger from '../../../utils/logger.js';

/**
 * Create a new booking
 * - Validates test exists and is available
 * - Validates appointment date is in the future
 * - Snapshots the current test price
 */
export const createBooking = async (userId, bookingData) => {
    const {
        testId,
        patientName,
        patientPhone,
        patientAge,
        patientGender,
        address,
        appointmentDate,
        timeSlot,
        notes
    } = bookingData;

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
        status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.SAMPLE_COLLECTED] }
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
        patientPhone: patientPhone || '',
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
        { path: 'user', select: 'name email phone' },
        { path: 'assignedPhlebotomist', select: 'name email phone' }
    ]);
};

/**
 * Get all bookings for the logged-in user
 */
export const getMyBookings = async (userId) => {
    logger.debug(`Fetching user bookings for userId=${userId}`);
    const bookings = await Booking.find({ user: userId })
        .populate('test', 'name category price description')
        .populate('assignedPhlebotomist', 'name email phone')
        .sort({ appointmentDate: -1 });

    return bookings;
};

/**
 * Get a single booking by ID
 * - Users can only view their own bookings
 * - Phlebotomists can view bookings assigned to them
 * - Admin/Lab staff can view any booking
 */
export const getBookingById = async (bookingId, requestingUser) => {
    logger.debug(`Fetching booking ${bookingId} for requesting user ${requestingUser._id} (${requestingUser.role})`);
    const booking = await Booking.findById(bookingId)
        .populate('test', 'name category price description')
        .populate('user', 'name email phone')
        .populate('assignedPhlebotomist', 'name email phone')
        .populate('assignedBy', 'name role')
        .populate('updatedBy', 'name role');

    if (!booking) {
        logger.warn(`Booking not found: ID=${bookingId}`);
        throw new AppError('Booking not found', 404);
    }

    const isOwner = booking.user._id.toString() === requestingUser._id.toString();
    const isPrivileged = [USER_ROLES.ADMIN, USER_ROLES.LAB_STAFF].includes(requestingUser.role);
    const isAssignedPhlebo = booking.assignedPhlebotomist &&
        booking.assignedPhlebotomist._id.toString() === requestingUser._id.toString();

    if (!isOwner && !isPrivileged && !isAssignedPhlebo) {
        logger.warn(`Unauthorized booking access: User ${requestingUser._id} attempted to view booking ${bookingId} owned by ${booking.user._id}`);
        throw new AppError('You are not authorized to view this booking', 403);
    }

    return booking;
};

/**
 * Get all bookings — Admin & Lab Staff only
 * Supports optional filtering by status, date, phlebotomist ID, and assignment state
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
    if (filters.phlebotomist) {
        query.assignedPhlebotomist = filters.phlebotomist;
    }
    if (filters.isAssigned === 'true') {
        query.assignedPhlebotomist = { $ne: null };
    } else if (filters.isAssigned === 'false') {
        query.assignedPhlebotomist = null;
    }

    logger.debug(`Admin/Staff fetching bookings with filters:`, filters);

    const bookings = await Booking.find(query)
        .populate('test', 'name category price')
        .populate('user', 'name email phone')
        .populate('assignedPhlebotomist', 'name email phone')
        .populate('assignedBy', 'name role')
        .populate('updatedBy', 'name role')
        .sort({ appointmentDate: 1 });

    return bookings;
};

/**
 * Assign or reassign a Phlebotomist to a booking — Admin & Lab Staff only
 */
export const assignPhlebotomist = async (bookingId, phlebotomistId, adminUser) => {
    logger.info(`Phlebotomist assignment request: Booking=${bookingId}, Phlebotomist=${phlebotomistId}, ByAdmin=${adminUser._id}`);

    const booking = await Booking.findById(bookingId);
    if (!booking) {
        logger.warn(`Assignment failed: Booking ${bookingId} not found`);
        throw new AppError('Booking not found', 404);
    }

    if (TERMINAL_BOOKING_STATUSES.includes(booking.status)) {
        logger.warn(`Assignment rejected: Booking ${bookingId} is already in terminal state '${booking.status}'`);
        throw new AppError(`Cannot assign a phlebotomist to a booking that is '${booking.status}'`, 400);
    }

    // Unassign if null
    if (!phlebotomistId) {
        booking.assignedPhlebotomist = null;
        booking.assignedAt = null;
        booking.assignedBy = null;
        await booking.save();
        logger.info(`Phlebotomist unassigned from booking ${bookingId}`);
    } else {
        // Validate phlebotomist exists in Phlebotomist collection
        const phlebo = await Phlebotomist.findById(phlebotomistId);
        if (!phlebo) {
            logger.warn(`Assignment failed: Phlebotomist ${phlebotomistId} not found`);
            throw new AppError('Phlebotomist not found', 404);
        }
        if (!phlebo.isActive) {
            logger.warn(`Assignment failed: Phlebotomist ${phlebotomistId} is inactive`);
            throw new AppError('This phlebotomist is currently marked inactive', 400);
        }

        booking.assignedPhlebotomist = phlebo._id;
        booking.assignedAt = new Date();
        booking.assignedBy = adminUser._id;

        // Auto-confirm pending booking when phlebotomist is assigned
        if (booking.status === BOOKING_STATUS.PENDING) {
            booking.status = BOOKING_STATUS.CONFIRMED;
        }

        await booking.save();
        logger.info(`✅ Phlebotomist '${phlebo.name}' (${phlebo._id}) assigned to booking ${bookingId}`);
    }

    return await booking.populate([
        { path: 'test', select: 'name category price' },
        { path: 'user', select: 'name email phone' },
        { path: 'assignedPhlebotomist', select: 'name email phone vehicleType servicePincodes' },
        { path: 'assignedBy', select: 'name role' }
    ]);
};

/**
 * Get assigned bookings for the logged-in Phlebotomist
 * Provides patient details, contact info, home address, and time slot
 */
export const getMyAssignments = async (phlebotomistId, filters = {}) => {
    logger.debug(`Fetching assigned bookings for phlebotomist ${phlebotomistId}`);

    const query = { assignedPhlebotomist: phlebotomistId };

    if (filters.status) {
        query.status = filters.status;
    }
    if (filters.date) {
        const day = new Date(filters.date);
        const nextDay = new Date(day);
        nextDay.setDate(nextDay.getDate() + 1);
        query.appointmentDate = { $gte: day, $lt: nextDay };
    }

    const bookings = await Booking.find(query)
        .populate('test', 'name category price description')
        .populate('user', 'name email phone')
        .populate('assignedBy', 'name role')
        .sort({ appointmentDate: 1, timeSlot: 1 });

    return bookings;
};

/**
 * Mark sample collected by Phlebotomist (or Admin / Staff)
 */
export const markSampleCollected = async (bookingId, requestingUser, collectionNotes = '') => {
    logger.info(`Sample collected request: Booking=${bookingId}, ByUser=${requestingUser._id} (${requestingUser.role})`);

    const booking = await Booking.findById(bookingId);
    if (!booking) {
        logger.warn(`Sample collected failed: Booking ${bookingId} not found`);
        throw new AppError('Booking not found', 404);
    }

    // If requesting user is a phlebotomist, ensure they are assigned to this booking
    if (requestingUser.role === USER_ROLES.PHLEBOTOMIST) {
        if (!booking.assignedPhlebotomist || booking.assignedPhlebotomist.toString() !== requestingUser._id.toString()) {
            logger.warn(`Unauthorized sample collection: Phlebotomist ${requestingUser._id} is not assigned to booking ${bookingId}`);
            throw new AppError('You are not authorized to collect the sample for this booking (not assigned to you)', 403);
        }
    }

    if (TERMINAL_BOOKING_STATUSES.includes(booking.status)) {
        logger.warn(`Sample collection rejected: Booking ${bookingId} is already in terminal state '${booking.status}'`);
        throw new AppError(`Cannot collect sample for a booking that is '${booking.status}'`, 400);
    }

    const prevStatus = booking.status;
    booking.status = BOOKING_STATUS.SAMPLE_COLLECTED;
    booking.sampleCollectedAt = new Date();
    if (collectionNotes) {
        booking.collectionNotes = collectionNotes;
    }
    booking.updatedBy = requestingUser._id;
    await booking.save();

    logger.info(`✅ Booking ${bookingId} marked as sample_collected (from '${prevStatus}') by ${requestingUser.email}`);

    return await booking.populate([
        { path: 'test', select: 'name category price' },
        { path: 'user', select: 'name email phone' },
        { path: 'assignedPhlebotomist', select: 'name email phone' },
        { path: 'updatedBy', select: 'name role' }
    ]);
};

/**
 * Update booking status — Admin, Lab Staff, or assigned Phlebotomist
 */
export const updateBookingStatus = async (bookingId, newStatus, requestingUser, collectionNotes = '') => {
    logger.info(`Status update request: Booking=${bookingId}, TargetStatus=${newStatus}, ByUser=${requestingUser._id} (${requestingUser.role})`);

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

    // Role-specific validation
    if (requestingUser.role === USER_ROLES.PHLEBOTOMIST) {
        const isAssigned = booking.assignedPhlebotomist &&
            booking.assignedPhlebotomist.toString() === requestingUser._id.toString();

        if (!isAssigned) {
            logger.warn(`Status update rejected: Phlebotomist ${requestingUser._id} not assigned to booking ${bookingId}`);
            throw new AppError('You are not assigned to this booking', 403);
        }

        if (!PHLEBOTOMIST_UPDATABLE_STATUSES.includes(newStatus)) {
            logger.warn(`Status update rejected: Phlebotomists cannot set status '${newStatus}'`);
            throw new AppError(
                `Phlebotomists can only set status to: ${PHLEBOTOMIST_UPDATABLE_STATUSES.join(', ')}`,
                400
            );
        }
    } else if (![USER_ROLES.ADMIN, USER_ROLES.LAB_STAFF].includes(requestingUser.role)) {
        throw new AppError('You do not have permission to update booking status', 403);
    }

    const prevStatus = booking.status;
    booking.status = newStatus;
    booking.updatedBy = requestingUser._id;

    if (newStatus === BOOKING_STATUS.SAMPLE_COLLECTED && !booking.sampleCollectedAt) {
        booking.sampleCollectedAt = new Date();
    }
    if (collectionNotes) {
        booking.collectionNotes = collectionNotes;
    }

    await booking.save();

    logger.info(`✅ Booking ${bookingId} status transitioned: '${prevStatus}' ➔ '${newStatus}'`);

    return await booking.populate([
        { path: 'test', select: 'name category price' },
        { path: 'user', select: 'name email phone' },
        { path: 'assignedPhlebotomist', select: 'name email phone' },
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

/**
 * Get list of all phlebotomists with their current active workload
 * Admin & Lab Staff use this to decide which phlebotomist to assign
 */
export const getPhlebotomistsList = async () => {
    logger.debug('Fetching phlebotomist directory with workload stats');

    const phlebotomists = await Phlebotomist.find({ isActive: true })
        .select('name email phone vehicleType servicePincodes createdAt')
        .sort({ name: 1 })
        .lean();

    if (!phlebotomists.length) {
        return [];
    }

    const phleboIds = phlebotomists.map(p => p._id);

    // Count how many non-terminal bookings are currently assigned to each phlebotomist
    const activeCounts = await Booking.aggregate([
        {
            $match: {
                assignedPhlebotomist: { $in: phleboIds },
                status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.SAMPLE_COLLECTED] }
            }
        },
        {
            $group: {
                _id: '$assignedPhlebotomist',
                activeCount: { $sum: 1 }
            }
        }
    ]);

    const countMap = {};
    activeCounts.forEach(c => {
        countMap[c._id.toString()] = c.activeCount;
    });

    return phlebotomists.map(phlebo => ({
        ...phlebo,
        activeBookingsCount: countMap[phlebo._id.toString()] || 0
    }));
};

