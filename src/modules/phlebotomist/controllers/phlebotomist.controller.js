import * as phleboService from '../services/phlebotomist.services.js';
import { catchAsync } from '../../../utils/catchAsync.js';
import { ApiResponse } from '../../../utils/ApiResponse.js';
import { cookieOptions } from '../../auth/utils/token.utils.js';

// ─── Phlebotomist Auth & Profile ─────────────────────────────────────────────

/**
 * POST /api/v1/phlebotomists/login
 */
export const login = catchAsync(async (req, res) => {
    const { email, password } = req.body;
    const { phlebotomist, accessToken, refreshToken } = await phleboService.loginPhlebotomist({ email, password });

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
            new ApiResponse(200, { phlebotomist, accessToken }, 'Phlebotomist logged in successfully')
        );
});

/**
 * POST /api/v1/phlebotomists/logout
 */
export const logout = catchAsync(async (req, res) => {
    await phleboService.logoutPhlebotomist(req.user._id);

    res
        .status(200)
        .clearCookie('accessToken', cookieOptions)
        .clearCookie('refreshToken', cookieOptions)
        .json(
            new ApiResponse(200, {}, 'Phlebotomist logged out successfully')
        );
});

/**
 * POST /api/v1/phlebotomists/refresh-token
 */
export const refreshToken = catchAsync(async (req, res) => {
    const incomingToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const { accessToken, refreshToken: newRefreshToken } = await phleboService.refreshPhlebotomistToken(incomingToken);

    res
        .status(200)
        .cookie('accessToken', accessToken, {
            ...cookieOptions,
            maxAge: 15 * 60 * 1000
        })
        .cookie('refreshToken', newRefreshToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000
        })
        .json(
            new ApiResponse(200, { accessToken }, 'Access token refreshed successfully')
        );
});

/**
 * GET /api/v1/phlebotomists/me
 */
export const getMe = catchAsync(async (req, res) => {
    const phlebo = await phleboService.getPhlebotomistProfile(req.user._id);

    res.status(200).json(
        new ApiResponse(200, phlebo, 'Profile fetched successfully')
    );
});

/**
 * PATCH /api/v1/phlebotomists/me
 */
export const updateMe = catchAsync(async (req, res) => {
    const phlebo = await phleboService.updatePhlebotomistProfile(req.user._id, req.body);

    res.status(200).json(
        new ApiResponse(200, phlebo, 'Profile updated successfully')
    );
});

// ─── Phlebotomist App Operations (Tasks & Patient Samples) ───────────────────

/**
 * GET /api/v1/phlebotomists/my-assignments
 * Query: ?status=confirmed&date=2026-10-20
 */
export const getMyAssignments = catchAsync(async (req, res) => {
    const tasks = await phleboService.getMyAssignedBookings(req.user._id, req.query);

    res.status(200).json(
        new ApiResponse(200, tasks, 'Assigned patient bookings fetched successfully')
    );
});

/**
 * GET /api/v1/phlebotomists/my-assignments/:id
 */
export const getAssignmentDetail = catchAsync(async (req, res) => {
    const booking = await phleboService.getAssignmentById(req.user._id, req.params.id);

    res.status(200).json(
        new ApiResponse(200, booking, 'Assigned booking details fetched successfully')
    );
});

/**
 * PATCH /api/v1/phlebotomists/my-assignments/:id/sample-collected
 * Body: { collectionNotes?: string }
 */
export const markSampleCollected = catchAsync(async (req, res) => {
    const { collectionNotes } = req.body;
    const booking = await phleboService.markSampleCollected(req.user._id, req.params.id, collectionNotes);

    res.status(200).json(
        new ApiResponse(200, booking, 'Sample marked as collected successfully')
    );
});

/**
 * PATCH /api/v1/phlebotomists/my-assignments/:id/status
 * Body: { status: 'sample_collected' | 'completed', collectionNotes?: string }
 */
export const updateAssignmentStatus = catchAsync(async (req, res) => {
    const { status, collectionNotes } = req.body;
    const booking = await phleboService.updateTaskStatus(req.user._id, req.params.id, status, collectionNotes);

    res.status(200).json(
        new ApiResponse(200, booking, `Task status updated to '${status}'`)
    );
});

// ─── Admin Management Endpoints ──────────────────────────────────────────────

/**
 * GET /api/v1/phlebotomists
 * Auth: Admin | Lab Staff only
 */
export const getAllPhlebotomists = catchAsync(async (req, res) => {
    const phlebotomists = await phleboService.getAllPhlebotomists(req.query);

    res.status(200).json(
        new ApiResponse(200, phlebotomists, 'Phlebotomist directory fetched successfully')
    );
});

/**
 * GET /api/v1/phlebotomists/:id
 * Auth: Admin | Lab Staff only
 */
export const getPhlebotomistById = catchAsync(async (req, res) => {
    const phlebo = await phleboService.getPhlebotomistById(req.params.id);

    res.status(200).json(
        new ApiResponse(200, phlebo, 'Phlebotomist details fetched successfully')
    );
});

/**
 * POST /api/v1/phlebotomists
 * Auth: Admin only
 */
export const createPhlebotomist = catchAsync(async (req, res) => {
    const phlebo = await phleboService.createPhlebotomist(req.body);

    res.status(201).json(
        new ApiResponse(201, phlebo, 'Phlebotomist created successfully')
    );
});

/**
 * PATCH /api/v1/phlebotomists/:id
 * Auth: Admin only
 */
export const updatePhlebotomist = catchAsync(async (req, res) => {
    const phlebo = await phleboService.updatePhlebotomistByAdmin(req.params.id, req.body);

    res.status(200).json(
        new ApiResponse(200, phlebo, 'Phlebotomist updated successfully')
    );
});

/**
 * DELETE /api/v1/phlebotomists/:id
 * Auth: Admin only
 */
export const deletePhlebotomist = catchAsync(async (req, res) => {
    const result = await phleboService.deletePhlebotomist(req.params.id);

    res.status(200).json(
        new ApiResponse(200, result, 'Phlebotomist deleted successfully')
    );
});
