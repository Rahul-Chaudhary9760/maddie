import * as adminService from '../services/admin.services.js';
import { catchAsync } from '../../../utils/catchAsync.js';
import { ApiResponse } from '../../../utils/ApiResponse.js';
import { cookieOptions } from '../../auth/utils/token.utils.js';

// ─── 1. Admin Auth & Profile ──────────────────────────────────────────────────

/**
 * POST /api/v1/admin/login
 * Body: { email, password }
 */
export const login = catchAsync(async (req, res) => {
    const { email, password } = req.body;
    const { admin, accessToken, refreshToken } = await adminService.adminLogin({ email, password });

    res
        .status(200)
        .cookie('accessToken', accessToken, {
            ...cookieOptions,
            maxAge: 15 * 60 * 1000
        })
        .cookie('refreshToken', refreshToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000
        })
        .json(
            new ApiResponse(200, { admin, accessToken }, 'Admin logged in successfully')
        );
});

/**
 * POST /api/v1/admin/logout
 */
export const logout = catchAsync(async (req, res) => {
    await adminService.adminLogout(req.user._id);

    res
        .status(200)
        .clearCookie('accessToken', cookieOptions)
        .clearCookie('refreshToken', cookieOptions)
        .json(
            new ApiResponse(200, {}, 'Admin logged out successfully')
        );
});

/**
 * GET /api/v1/admin/me
 */
export const getMe = catchAsync(async (req, res) => {
    const admin = await adminService.getAdminProfile(req.user._id);

    res.status(200).json(
        new ApiResponse(200, admin, 'Admin profile fetched successfully')
    );
});

// ─── 2. Dashboard Analytics & Stats ──────────────────────────────────────────

/**
 * GET /api/v1/admin/stats
 */
export const getDashboardStats = catchAsync(async (req, res) => {
    const stats = await adminService.getDashboardStats();

    res.status(200).json(
        new ApiResponse(200, stats, 'Dashboard statistics fetched successfully')
    );
});

// ─── 3. Bookings Management ───────────────────────────────────────────────────

/**
 * GET /api/v1/admin/bookings
 * Query: ?page=1&limit=10&status=pending&date=2026-10-20&search=john&phlebotomist=<id>&isAssigned=true
 */
export const getBookings = catchAsync(async (req, res) => {
    const data = await adminService.getAdminBookings(req.query);

    res.status(200).json(
        new ApiResponse(200, data, 'Bookings fetched successfully')
    );
});

/**
 * GET /api/v1/admin/bookings/:id
 */
export const getBookingById = catchAsync(async (req, res) => {
    const booking = await adminService.getAdminBookingById(req.params.id);

    res.status(200).json(
        new ApiResponse(200, booking, 'Booking details fetched successfully')
    );
});

/**
 * PATCH /api/v1/admin/bookings/:id/assign
 * Body: { phlebotomistId: string | null }
 */
export const assignPhlebotomist = catchAsync(async (req, res) => {
    const { phlebotomistId } = req.body;
    const booking = await adminService.assignBookingPhlebotomist(req.params.id, phlebotomistId, req.user);

    const message = phlebotomistId
        ? 'Phlebotomist assigned to booking successfully'
        : 'Phlebotomist unassigned from booking successfully';

    res.status(200).json(
        new ApiResponse(200, booking, message)
    );
});

/**
 * PATCH /api/v1/admin/bookings/:id/status
 * Body: { status, collectionNotes? }
 */
export const updateBookingStatus = catchAsync(async (req, res) => {
    const { status, collectionNotes } = req.body;
    const booking = await adminService.updateBookingStatusByAdmin(req.params.id, status, req.user, collectionNotes);

    res.status(200).json(
        new ApiResponse(200, booking, `Booking status updated to '${status}'`)
    );
});

// ─── 4. User / Patient Details Management ─────────────────────────────────────

/**
 * GET /api/v1/admin/users
 * Query: ?page=1&limit=10&search=rahul&role=user
 */
export const getUsers = catchAsync(async (req, res) => {
    const data = await adminService.getAdminUsers(req.query);

    res.status(200).json(
        new ApiResponse(200, data, 'Users list fetched successfully')
    );
});

/**
 * GET /api/v1/admin/users/:id
 */
export const getUserById = catchAsync(async (req, res) => {
    const data = await adminService.getAdminUserById(req.params.id);

    res.status(200).json(
        new ApiResponse(200, data, 'User details and booking history fetched successfully')
    );
});

// ─── 5. Phlebotomist Management ───────────────────────────────────────────────

/**
 * GET /api/v1/admin/phlebotomists
 * Query: ?page=1&limit=10&search=rajesh&isActive=true
 */
export const getPhlebotomists = catchAsync(async (req, res) => {
    const data = await adminService.getAdminPhlebotomists(req.query);

    res.status(200).json(
        new ApiResponse(200, data, 'Phlebotomists fetched successfully')
    );
});

/**
 * GET /api/v1/admin/phlebotomists/:id
 */
export const getPhlebotomistById = catchAsync(async (req, res) => {
    const data = await adminService.getAdminPhlebotomistById(req.params.id);

    res.status(200).json(
        new ApiResponse(200, data, 'Phlebotomist details fetched successfully')
    );
});

/**
 * POST /api/v1/admin/phlebotomists
 * Body: { name, email, phone, password, servicePincodes?, vehicleType? }
 */
export const createPhlebotomist = catchAsync(async (req, res) => {
    const phlebo = await adminService.createPhlebotomistByAdmin(req.body);

    res.status(201).json(
        new ApiResponse(201, phlebo, 'Phlebotomist account created successfully')
    );
});

/**
 * PATCH /api/v1/admin/phlebotomists/:id
 * Body: { name?, phone?, vehicleType?, servicePincodes?, isActive?, password? }
 */
export const updatePhlebotomist = catchAsync(async (req, res) => {
    const phlebo = await adminService.updatePhlebotomistByAdmin(req.params.id, req.body);

    res.status(200).json(
        new ApiResponse(200, phlebo, 'Phlebotomist updated successfully')
    );
});

/**
 * DELETE /api/v1/admin/phlebotomists/:id
 */
export const deletePhlebotomist = catchAsync(async (req, res) => {
    const result = await adminService.deletePhlebotomistByAdmin(req.params.id);

    res.status(200).json(
        new ApiResponse(200, result, 'Phlebotomist deleted successfully')
    );
});
