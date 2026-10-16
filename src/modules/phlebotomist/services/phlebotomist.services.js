import jwt from 'jsonwebtoken';
import Phlebotomist from '../models/phlebotomist.model.js';
import Booking from '../../booking/models/booking.model.js';
import { AppError } from '../../../utils/ApiError.js';
import {
    BOOKING_STATUS,
    PHLEBOTOMIST_UPDATABLE_STATUSES,
    TERMINAL_BOOKING_STATUSES
} from '../../../config/constants.js';
import { generateAccessToken, generateRefreshToken } from '../../auth/utils/token.utils.js';
import logger from '../../../utils/logger.js';

// ─── Phlebotomist Authentication & Profile ───────────────────────────────────

/**
 * Phlebotomist Login
 */
export const loginPhlebotomist = async ({ email, password }) => {
    logger.info(`🩸 Phlebotomist login attempt for: ${email}`);

    const phlebo = await Phlebotomist.findOne({ email }).select('+password');
    if (!phlebo) {
        logger.warn(`Phlebotomist login failed: ${email} not found`);
        throw new AppError('Invalid email or password', 401);
    }

    if (!phlebo.isActive) {
        logger.warn(`Phlebotomist login blocked: ${email} is inactive`);
        throw new AppError('Your phlebotomist account has been deactivated. Please contact admin.', 403);
    }

    const isMatch = await phlebo.isPasswordCorrect(password);
    if (!isMatch) {
        logger.warn(`Phlebotomist login failed: incorrect password for ${email}`);
        throw new AppError('Invalid email or password', 401);
    }

    const accessToken = generateAccessToken(phlebo);
    const refreshToken = generateRefreshToken(phlebo);

    phlebo.refreshToken = refreshToken;
    await phlebo.save({ validateBeforeSave: false });

    const safePhlebo = await Phlebotomist.findById(phlebo._id);
    logger.info(`✅ Phlebotomist logged in: ${safePhlebo.email} (${safePhlebo._id})`);

    return { phlebotomist: safePhlebo, accessToken, refreshToken };
};

/**
 * Phlebotomist Logout
 */
export const logoutPhlebotomist = async (phleboId) => {
    await Phlebotomist.findByIdAndUpdate(
        phleboId,
        { $unset: { refreshToken: 1 } },
        { new: true }
    );
    logger.info(`🚪 Phlebotomist logged out: ID ${phleboId}`);
};

/**
 * Refresh Phlebotomist Token
 */
export const refreshPhlebotomistToken = async (incomingRefreshToken) => {
    if (!incomingRefreshToken) {
        throw new AppError('Refresh token is required', 401);
    }

    let decoded;
    try {
        decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
        throw new AppError('Invalid or expired refresh token. Please log in again.', 401);
    }

    const phlebo = await Phlebotomist.findById(decoded._id).select('+refreshToken');
    if (!phlebo) {
        throw new AppError('Phlebotomist account not found', 401);
    }
    if (phlebo.refreshToken !== incomingRefreshToken) {
        throw new AppError('Refresh token revoked or invalid. Please log in again.', 401);
    }

    const newAccessToken = generateAccessToken(phlebo);
    const newRefreshToken = generateRefreshToken(phlebo);

    phlebo.refreshToken = newRefreshToken;
    await phlebo.save({ validateBeforeSave: false });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

/**
 * Get Phlebotomist Profile
 */
export const getPhlebotomistProfile = async (phleboId) => {
    const phlebo = await Phlebotomist.findById(phleboId);
    if (!phlebo) {
        throw new AppError('Phlebotomist not found', 404);
    }
    return phlebo;
};

/**
 * Update Phlebotomist Profile (Self)
 */
export const updatePhlebotomistProfile = async (phleboId, updateData) => {
    const allowedUpdates = ['name', 'phone', 'vehicleType', 'servicePincodes'];
    const filteredData = {};
    for (const key of allowedUpdates) {
        if (updateData[key] !== undefined) {
            filteredData[key] = updateData[key];
        }
    }

    const phlebo = await Phlebotomist.findByIdAndUpdate(phleboId, filteredData, {
        new: true,
        runValidators: true
    });

    if (!phlebo) {
        throw new AppError('Phlebotomist not found', 404);
    }
    return phlebo;
};

// ─── Phlebotomist Tasks & Sample Collection (Mobile App) ─────────────────────

/**
 * Get assigned patient bookings for logged-in phlebotomist
 */
export const getMyAssignedBookings = async (phleboId, filters = {}) => {
    logger.debug(`Fetching assigned bookings for phlebotomist ${phleboId}`);

    const query = { assignedPhlebotomist: phleboId };

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
 * Get single assigned booking detail
 */
export const getAssignmentById = async (phleboId, bookingId) => {
    const booking = await Booking.findOne({
        _id: bookingId,
        assignedPhlebotomist: phleboId
    })
        .populate('test', 'name category price description')
        .populate('user', 'name email phone')
        .populate('assignedBy', 'name role')
        .populate('updatedBy', 'name role');

    if (!booking) {
        throw new AppError('Assigned booking not found', 404);
    }
    return booking;
};

/**
 * Phlebotomist marks sample collected from patient
 */
export const markSampleCollected = async (phleboId, bookingId, collectionNotes = '') => {
    logger.info(`Sample collected request by Phlebotomist ${phleboId} for Booking ${bookingId}`);

    const booking = await Booking.findById(bookingId);
    if (!booking) {
        throw new AppError('Booking not found', 404);
    }

    if (!booking.assignedPhlebotomist || booking.assignedPhlebotomist.toString() !== phleboId.toString()) {
        logger.warn(`Unauthorized: Phlebotomist ${phleboId} attempted to collect for unassigned booking ${bookingId}`);
        throw new AppError('You are not authorized to collect the sample for this booking (not assigned to you)', 403);
    }

    if (TERMINAL_BOOKING_STATUSES.includes(booking.status)) {
        throw new AppError(`Cannot collect sample for a booking that is '${booking.status}'`, 400);
    }

    const prevStatus = booking.status;
    booking.status = BOOKING_STATUS.SAMPLE_COLLECTED;
    booking.sampleCollectedAt = new Date();
    if (collectionNotes) {
        booking.collectionNotes = collectionNotes;
    }
    booking.updatedBy = phleboId;
    await booking.save();

    logger.info(`✅ Sample collected for Booking ${bookingId} (status: ${prevStatus} ➔ sample_collected)`);

    return await booking.populate([
        { path: 'test', select: 'name category price' },
        { path: 'user', select: 'name email phone' },
        { path: 'assignedPhlebotomist', select: 'name email phone' }
    ]);
};

/**
 * Phlebotomist updates task status
 */
export const updateTaskStatus = async (phleboId, bookingId, newStatus, collectionNotes = '') => {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
        throw new AppError('Booking not found', 404);
    }

    if (!booking.assignedPhlebotomist || booking.assignedPhlebotomist.toString() !== phleboId.toString()) {
        throw new AppError('You are not authorized to update this booking (not assigned to you)', 403);
    }

    if (!PHLEBOTOMIST_UPDATABLE_STATUSES.includes(newStatus)) {
        throw new AppError(
            `Phlebotomists can only set status to: ${PHLEBOTOMIST_UPDATABLE_STATUSES.join(', ')}`,
            400
        );
    }

    if (TERMINAL_BOOKING_STATUSES.includes(booking.status)) {
        throw new AppError(`Cannot update a booking that is already '${booking.status}'`, 400);
    }

    booking.status = newStatus;
    if (newStatus === BOOKING_STATUS.SAMPLE_COLLECTED && !booking.sampleCollectedAt) {
        booking.sampleCollectedAt = new Date();
    }
    if (collectionNotes) {
        booking.collectionNotes = collectionNotes;
    }
    booking.updatedBy = phleboId;
    await booking.save();

    return await booking.populate([
        { path: 'test', select: 'name category price' },
        { path: 'user', select: 'name email phone' },
        { path: 'assignedPhlebotomist', select: 'name email phone' }
    ]);
};

// ─── Admin Directory & Management of Phlebotomists ───────────────────────────

/**
 * Get all phlebotomists with current active workloads (for Admin decision making)
 */
export const getAllPhlebotomists = async (query = {}) => {
    logger.debug('Fetching phlebotomist directory');

    const filter = {};
    if (query.isActive !== undefined) {
        filter.isActive = query.isActive === 'true';
    }

    const phlebotomists = await Phlebotomist.find(filter)
        .select('-password -refreshToken')
        .sort({ name: 1 })
        .lean();

    if (!phlebotomists.length) {
        return [];
    }

    const phleboIds = phlebotomists.map(p => p._id);

    // Compute active workload count
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

    return phlebotomists.map(p => ({
        ...p,
        activeBookingsCount: countMap[p._id.toString()] || 0
    }));
};

/**
 * Get single phlebotomist by ID (Admin)
 */
export const getPhlebotomistById = async (id) => {
    const phlebo = await Phlebotomist.findById(id).select('-password -refreshToken');
    if (!phlebo) {
        throw new AppError('Phlebotomist not found', 404);
    }
    return phlebo;
};

/**
 * Create Phlebotomist (Admin)
 */
export const createPhlebotomist = async (data) => {
    const existing = await Phlebotomist.findOne({
        $or: [{ email: data.email }, { phone: data.phone }]
    });

    if (existing) {
        throw new AppError('A phlebotomist with this email or phone number already exists', 400);
    }

    const phlebo = await Phlebotomist.create(data);
    return await Phlebotomist.findById(phlebo._id).select('-password -refreshToken');
};

/**
 * Update Phlebotomist by Admin
 */
export const updatePhlebotomistByAdmin = async (id, updateData) => {
    // If password is being updated, hash it or save via document
    let phlebo = await Phlebotomist.findById(id);
    if (!phlebo) {
        throw new AppError('Phlebotomist not found', 404);
    }

    const allowed = ['name', 'phone', 'servicePincodes', 'vehicleType', 'isActive', 'password'];
    for (const key of allowed) {
        if (updateData[key] !== undefined) {
            phlebo[key] = updateData[key];
        }
    }

    await phlebo.save();
    return await Phlebotomist.findById(phlebo._id).select('-password -refreshToken');
};

/**
 * Deactivate or Delete Phlebotomist (Admin)
 */
export const deletePhlebotomist = async (id) => {
    const phlebo = await Phlebotomist.findById(id);
    if (!phlebo) {
        throw new AppError('Phlebotomist not found', 404);
    }

    // Check if phlebotomist has pending tasks
    const activeTasks = await Booking.countDocuments({
        assignedPhlebotomist: id,
        status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.SAMPLE_COLLECTED] }
    });

    if (activeTasks > 0) {
        throw new AppError(`Cannot delete phlebotomist with ${activeTasks} active booking tasks. Reassign them first or deactivate instead.`, 400);
    }

    await Phlebotomist.findByIdAndDelete(id);
    return { id, message: 'Phlebotomist removed successfully' };
};
