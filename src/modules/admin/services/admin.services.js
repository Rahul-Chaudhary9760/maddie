import User from '../../auth/models/user.model.js';
import Phlebotomist from '../../phlebotomist/models/phlebotomist.model.js';
import Booking from '../../booking/models/booking.model.js';
import Test from '../../medical-test/models/medical-test.model.js';
import { AppError } from '../../../utils/ApiError.js';
import {
    BOOKING_STATUS,
    TERMINAL_BOOKING_STATUSES,
    USER_ROLES
} from '../../../config/constants.js';
import { generateAccessToken, generateRefreshToken } from '../../auth/utils/token.utils.js';
import logger from '../../../utils/logger.js';

// ─── 1. Admin Authentication ──────────────────────────────────────────────────

/**
 * Admin Login
 * Verifies email/password and explicitly checks administrative role
 */
export const adminLogin = async ({ email, password }) => {
    logger.info(`👑 Admin login attempt: ${email}`);

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
        logger.warn(`Admin login failed: ${email} not found`);
        throw new AppError('Invalid email or password', 401);
    }

    // Role check: Only admin and lab_staff are permitted to access the admin portal
    if (![USER_ROLES.ADMIN, USER_ROLES.LAB_STAFF].includes(user.role)) {
        logger.warn(`🚫 Forbidden admin access attempt by non-admin user: ${email} (role: ${user.role})`);
        throw new AppError('Access denied. You do not have permission to access the admin dashboard.', 403);
    }

    const isMatch = await user.isPasswordCorrect(password);
    if (!isMatch) {
        logger.warn(`Admin login failed: Incorrect password for ${email}`);
        throw new AppError('Invalid email or password', 401);
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    const safeUser = await User.findById(user._id);
    logger.info(`✅ Admin authenticated: ${safeUser.email} (${safeUser.role})`);

    return { admin: safeUser, accessToken, refreshToken };
};

/**
 * Admin Logout
 */
export const adminLogout = async (adminId) => {
    await User.findByIdAndUpdate(
        adminId,
        { $unset: { refreshToken: 1 } },
        { new: true }
    );
    logger.info(`🚪 Admin logged out: ID ${adminId}`);
};

/**
 * Get Admin Profile
 */
export const getAdminProfile = async (adminId) => {
    const admin = await User.findById(adminId);
    if (!admin) {
        throw new AppError('Admin account not found', 404);
    }
    return admin;
};

// ─── 2. Dashboard Analytics & Stats ──────────────────────────────────────────

/**
 * Get aggregated dashboard statistics
 */
export const getDashboardStats = async () => {
    logger.debug('Generating dashboard statistics');

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    // Parallel aggregate queries for high performance and scalability
    const [
        bookingStats,
        todayBookingsCount,
        todayRevenueAgg,
        totalRevenueAgg,
        totalUsers,
        newUsersThisMonth,
        totalPhlebotomists,
        activePhlebotomists,
        recentBookings
    ] = await Promise.all([
        // Booking count by status
        Booking.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]),
        // Today's total bookings
        Booking.countDocuments({
            appointmentDate: { $gte: todayStart, $lte: todayEnd }
        }),
        // Today's revenue
        Booking.aggregate([
            {
                $match: {
                    status: BOOKING_STATUS.COMPLETED,
                    updatedAt: { $gte: todayStart, $lte: todayEnd }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$totalAmount' }
                }
            }
        ]),
        // Total completed revenue
        Booking.aggregate([
            {
                $match: { status: BOOKING_STATUS.COMPLETED }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$totalAmount' }
                }
            }
        ]),
        // Total registered patients
        User.countDocuments({ role: USER_ROLES.USER }),
        // New patients this month
        User.countDocuments({
            role: USER_ROLES.USER,
            createdAt: { $gte: firstDayOfMonth }
        }),
        // Phlebotomist counts
        Phlebotomist.countDocuments(),
        Phlebotomist.countDocuments({ isActive: true }),
        // Recent 5 bookings
        Booking.find()
            .populate('test', 'name category price')
            .populate('user', 'name email phone')
            .populate('assignedPhlebotomist', 'name phone')
            .sort({ createdAt: -1 })
            .limit(5)
            .lean()
    ]);

    // Format booking status counts
    const statusMap = {
        pending: 0,
        confirmed: 0,
        sample_collected: 0,
        completed: 0,
        cancelled: 0
    };
    let totalBookings = 0;
    bookingStats.forEach(stat => {
        if (statusMap[stat._id] !== undefined) {
            statusMap[stat._id] = stat.count;
        }
        totalBookings += stat.count;
    });

    return {
        bookings: {
            total: totalBookings,
            pending: statusMap.pending,
            confirmed: statusMap.confirmed,
            sampleCollected: statusMap.sample_collected,
            completed: statusMap.completed,
            cancelled: statusMap.cancelled,
            todayTotal: todayBookingsCount
        },
        revenue: {
            totalRevenue: totalRevenueAgg[0]?.total || 0,
            todayRevenue: todayRevenueAgg[0]?.total || 0
        },
        users: {
            totalUsers,
            newThisMonth: newUsersThisMonth
        },
        phlebotomists: {
            totalPhlebotomists,
            activePhlebotomists,
            inactivePhlebotomists: totalPhlebotomists - activePhlebotomists
        },
        recentBookings
    };
};

// ─── 3. Booking Management ────────────────────────────────────────────────────

/**
 * Get paginated bookings with flexible filtering and text search
 */
export const getAdminBookings = async (filters = {}) => {
    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const query = {};

    if (filters.status) {
        query.status = filters.status;
    }
    if (filters.date) {
        const start = new Date(filters.date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(filters.date);
        end.setHours(23, 59, 59, 999);
        query.appointmentDate = { $gte: start, $lte: end };
    } else if (filters.startDate || filters.endDate) {
        query.appointmentDate = {};
        if (filters.startDate) {
            const s = new Date(filters.startDate);
            s.setHours(0, 0, 0, 0);
            query.appointmentDate.$gte = s;
        }
        if (filters.endDate) {
            const e = new Date(filters.endDate);
            e.setHours(23, 59, 59, 999);
            query.appointmentDate.$lte = e;
        }
    }

    if (filters.phlebotomist) {
        query.assignedPhlebotomist = filters.phlebotomist;
    }
    if (filters.isAssigned === 'true') {
        query.assignedPhlebotomist = { $ne: null };
    } else if (filters.isAssigned === 'false') {
        query.assignedPhlebotomist = null;
    }

    // Text search on patient name, patient phone, or direct ObjectId match
    if (filters.search) {
        const searchRegex = new RegExp(filters.search.trim(), 'i');
        const orConditions = [
            { patientName: searchRegex },
            { patientPhone: searchRegex }
        ];
        if (/^[0-9a-fA-F]{24}$/.test(filters.search.trim())) {
            orConditions.push({ _id: filters.search.trim() });
        }
        query.$or = orConditions;
    }

    const [total, bookings] = await Promise.all([
        Booking.countDocuments(query),
        Booking.find(query)
            .populate('test', 'name category price')
            .populate('user', 'name email phone')
            .populate('assignedPhlebotomist', 'name email phone vehicleType servicePincodes')
            .populate('assignedBy', 'name role')
            .populate('updatedBy', 'name role')
            .sort({ appointmentDate: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean()
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
        items: bookings,
        pagination: {
            total,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        }
    };
};

/**
 * Get detailed booking by ID
 */
export const getAdminBookingById = async (bookingId) => {
    const booking = await Booking.findById(bookingId)
        .populate('test', 'name category price description')
        .populate('user', 'name email phone')
        .populate('assignedPhlebotomist', 'name email phone vehicleType servicePincodes')
        .populate('assignedBy', 'name role email')
        .populate('updatedBy', 'name role email');

    if (!booking) {
        throw new AppError('Booking not found', 404);
    }
    return booking;
};

/**
 * Assign / Reassign Phlebotomist to a booking
 */
export const assignBookingPhlebotomist = async (bookingId, phlebotomistId, adminUser) => {
    logger.info(`Assigning phlebotomist: Booking=${bookingId}, Phlebotomist=${phlebotomistId}, ByAdmin=${adminUser._id}`);

    const booking = await Booking.findById(bookingId);
    if (!booking) {
        throw new AppError('Booking not found', 404);
    }

    if (TERMINAL_BOOKING_STATUSES.includes(booking.status)) {
        throw new AppError(`Cannot assign a phlebotomist to a booking that is '${booking.status}'`, 400);
    }

    if (!phlebotomistId) {
        booking.assignedPhlebotomist = null;
        booking.assignedAt = null;
        booking.assignedBy = null;
        await booking.save();
        logger.info(`Phlebotomist unassigned from booking ${bookingId}`);
    } else {
        const phlebo = await Phlebotomist.findById(phlebotomistId);
        if (!phlebo) {
            throw new AppError('Phlebotomist not found', 404);
        }
        if (!phlebo.isActive) {
            throw new AppError('This phlebotomist is currently marked inactive', 400);
        }

        booking.assignedPhlebotomist = phlebo._id;
        booking.assignedAt = new Date();
        booking.assignedBy = adminUser._id;

        if (booking.status === BOOKING_STATUS.PENDING) {
            booking.status = BOOKING_STATUS.CONFIRMED;
        }

        await booking.save();
        logger.info(`✅ Phlebotomist '${phlebo.name}' assigned to booking ${bookingId}`);
    }

    return await booking.populate([
        { path: 'test', select: 'name category price' },
        { path: 'user', select: 'name email phone' },
        { path: 'assignedPhlebotomist', select: 'name email phone vehicleType servicePincodes' },
        { path: 'assignedBy', select: 'name role' }
    ]);
};

/**
 * Update booking status by Admin / Lab Staff
 */
export const updateBookingStatusByAdmin = async (bookingId, status, adminUser, collectionNotes = '') => {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
        throw new AppError('Booking not found', 404);
    }

    if (TERMINAL_BOOKING_STATUSES.includes(booking.status)) {
        throw new AppError(`Cannot update a booking that is already '${booking.status}'`, 400);
    }

    const prevStatus = booking.status;
    booking.status = status;
    booking.updatedBy = adminUser._id;

    if (status === BOOKING_STATUS.SAMPLE_COLLECTED && !booking.sampleCollectedAt) {
        booking.sampleCollectedAt = new Date();
    }
    if (collectionNotes) {
        booking.collectionNotes = collectionNotes;
    }

    await booking.save();
    logger.info(`✅ Booking ${bookingId} transitioned '${prevStatus}' ➔ '${status}' by admin ${adminUser.email}`);

    return await booking.populate([
        { path: 'test', select: 'name category price' },
        { path: 'user', select: 'name email phone' },
        { path: 'assignedPhlebotomist', select: 'name email phone vehicleType' },
        { path: 'updatedBy', select: 'name role' }
    ]);
};

// ─── 4. User / Patient Details Management ─────────────────────────────────────

/**
 * Get paginated list of registered users with booking metrics
 */
export const getAdminUsers = async (filters = {}) => {
    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const match = {};
    if (filters.role) {
        match.role = filters.role;
    } else {
        match.role = USER_ROLES.USER; // Default to customers/patients
    }

    if (filters.search) {
        const searchRegex = new RegExp(filters.search.trim(), 'i');
        match.$or = [
            { name: searchRegex },
            { email: searchRegex },
            { phone: searchRegex }
        ];
    }

    const [total, users] = await Promise.all([
        User.countDocuments(match),
        User.find(match)
            .select('-password -refreshToken')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean()
    ]);

    // Aggregate booking stats per user for high-value customer insights
    const userIds = users.map(u => u._id);
    const bookingStats = await Booking.aggregate([
        { $match: { user: { $in: userIds } } },
        {
            $group: {
                _id: '$user',
                totalBookings: { $sum: 1 },
                totalSpent: {
                    $sum: {
                        $cond: [{ $eq: ['$status', BOOKING_STATUS.COMPLETED] }, '$totalAmount', 0]
                    }
                }
            }
        }
    ]);

    const statMap = {};
    bookingStats.forEach(s => {
        statMap[s._id.toString()] = {
            totalBookings: s.totalBookings,
            totalSpent: s.totalSpent
        };
    });

    const enrichedUsers = users.map(u => ({
        ...u,
        totalBookingsCount: statMap[u._id.toString()]?.totalBookings || 0,
        totalSpent: statMap[u._id.toString()]?.totalSpent || 0
    }));

    const totalPages = Math.ceil(total / limit) || 1;

    return {
        items: enrichedUsers,
        pagination: {
            total,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        }
    };
};

/**
 * Get single user profile with their full booking history
 */
export const getAdminUserById = async (userId) => {
    const user = await User.findById(userId).select('-password -refreshToken');
    if (!user) {
        throw new AppError('User not found', 404);
    }

    const bookings = await Booking.find({ user: userId })
        .populate('test', 'name category price')
        .populate('assignedPhlebotomist', 'name phone')
        .sort({ appointmentDate: -1 })
        .lean();

    const totalSpent = bookings
        .filter(b => b.status === BOOKING_STATUS.COMPLETED)
        .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    return {
        user,
        summary: {
            totalBookings: bookings.length,
            completedBookings: bookings.filter(b => b.status === BOOKING_STATUS.COMPLETED).length,
            totalSpent
        },
        bookings
    };
};

// ─── 5. Phlebotomist Management ───────────────────────────────────────────────

/**
 * Get paginated list of phlebotomists with live workload counts
 */
export const getAdminPhlebotomists = async (filters = {}) => {
    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const query = {};
    if (filters.isActive !== undefined) {
        query.isActive = filters.isActive === 'true';
    }

    if (filters.search) {
        const searchRegex = new RegExp(filters.search.trim(), 'i');
        query.$or = [
            { name: searchRegex },
            { email: searchRegex },
            { phone: searchRegex }
        ];
    }

    const [total, phlebotomists] = await Promise.all([
        Phlebotomist.countDocuments(query),
        Phlebotomist.find(query)
            .select('-password -refreshToken')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean()
    ]);

    const phleboIds = phlebotomists.map(p => p._id);

    // Compute active tasks and lifetime completed tasks
    const taskStats = await Booking.aggregate([
        { $match: { assignedPhlebotomist: { $in: phleboIds } } },
        {
            $group: {
                _id: '$assignedPhlebotomist',
                activeTasks: {
                    $sum: {
                        $cond: [
                            { $in: ['$status', [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.SAMPLE_COLLECTED]] },
                            1,
                            0
                        ]
                    }
                },
                completedTasks: {
                    $sum: {
                        $cond: [{ $eq: ['$status', BOOKING_STATUS.COMPLETED] }, 1, 0]
                    }
                }
            }
        }
    ]);

    const taskMap = {};
    taskStats.forEach(t => {
        taskMap[t._id.toString()] = {
            activeTasks: t.activeTasks,
            completedTasks: t.completedTasks
        };
    });

    const enriched = phlebotomists.map(p => ({
        ...p,
        activeBookingsCount: taskMap[p._id.toString()]?.activeTasks || 0,
        completedBookingsCount: taskMap[p._id.toString()]?.completedTasks || 0
    }));

    const totalPages = Math.ceil(total / limit) || 1;

    return {
        items: enriched,
        pagination: {
            total,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        }
    };
};

/**
 * Get single phlebotomist details with recent task history
 */
export const getAdminPhlebotomistById = async (phleboId) => {
    const phlebo = await Phlebotomist.findById(phleboId).select('-password -refreshToken');
    if (!phlebo) {
        throw new AppError('Phlebotomist not found', 404);
    }

    const recentBookings = await Booking.find({ assignedPhlebotomist: phleboId })
        .populate('test', 'name category price')
        .populate('user', 'name phone')
        .sort({ appointmentDate: -1 })
        .limit(20)
        .lean();

    const activeTasksCount = await Booking.countDocuments({
        assignedPhlebotomist: phleboId,
        status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.SAMPLE_COLLECTED] }
    });

    const completedTasksCount = await Booking.countDocuments({
        assignedPhlebotomist: phleboId,
        status: BOOKING_STATUS.COMPLETED
    });

    return {
        phlebotomist: phlebo,
        stats: {
            activeTasksCount,
            completedTasksCount,
            totalAssigned: recentBookings.length
        },
        recentBookings
    };
};

/**
 * Add a new Phlebotomist
 */
export const createPhlebotomistByAdmin = async (data) => {
    const existing = await Phlebotomist.findOne({
        $or: [{ email: data.email }, { phone: data.phone }]
    });

    if (existing) {
        throw new AppError('A phlebotomist with this email or phone already exists', 400);
    }

    const phlebo = await Phlebotomist.create(data);
    return await Phlebotomist.findById(phlebo._id).select('-password -refreshToken');
};

/**
 * Update Phlebotomist details (name, phone, vehicle, pincodes, isActive, password)
 */
export const updatePhlebotomistByAdmin = async (phleboId, updateData) => {
    const phlebo = await Phlebotomist.findById(phleboId);
    if (!phlebo) {
        throw new AppError('Phlebotomist not found', 404);
    }

    const allowed = ['name', 'phone', 'vehicleType', 'servicePincodes', 'isActive', 'password'];
    for (const key of allowed) {
        if (updateData[key] !== undefined) {
            phlebo[key] = updateData[key];
        }
    }

    await phlebo.save();
    return await Phlebotomist.findById(phlebo._id).select('-password -refreshToken');
};

/**
 * Delete Phlebotomist
 */
export const deletePhlebotomistByAdmin = async (phleboId) => {
    const phlebo = await Phlebotomist.findById(phleboId);
    if (!phlebo) {
        throw new AppError('Phlebotomist not found', 404);
    }

    const activeCount = await Booking.countDocuments({
        assignedPhlebotomist: phleboId,
        status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.SAMPLE_COLLECTED] }
    });

    if (activeCount > 0) {
        throw new AppError(`Cannot delete phlebotomist who currently has ${activeCount} active assigned booking tasks. Please reassign tasks first or set isActive to false.`, 400);
    }

    await Phlebotomist.findByIdAndDelete(phleboId);
    return { id: phleboId, message: 'Phlebotomist deleted successfully' };
};
