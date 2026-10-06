import * as authService from '../services/auth.services.js';
import { catchAsync } from '../../../utils/catchAsync.js';
import { ApiResponse } from '../../../utils/ApiResponse.js';
import { cookieOptions } from '../utils/token.utils.js';

/**
 * POST /api/v1/auth/register
 * Body: { name, email, password, role? }
 */
export const register = catchAsync(async (req, res) => {
    const { name, email, password, role } = req.body;

    const user = await authService.registerUser({ name, email, password, role });

    res.status(201).json(
        new ApiResponse(201, user, 'Account created successfully')
    );
});

/**
 * POST /api/v1/auth/login
 * Body: { email, password }
 * Sets httpOnly cookies: accessToken, refreshToken
 */
export const login = catchAsync(async (req, res) => {
    const { email, password } = req.body;

    const { user, accessToken, refreshToken } = await authService.loginUser({ email, password });

    res
        .status(200)
        .cookie('accessToken', accessToken, {
            ...cookieOptions,
            maxAge: 15 * 60 * 1000 // 15 minutes in ms
        })
        .cookie('refreshToken', refreshToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in ms
        })
        .json(
            new ApiResponse(200, { user, accessToken }, 'Logged in successfully')
        );
});

/**
 * POST /api/v1/auth/logout
 * Requires: authenticated user (via protect middleware)
 * Clears cookies + invalidates refresh token in DB
 */
export const logout = catchAsync(async (req, res) => {
    await authService.logoutUser(req.user._id);

    res
        .status(200)
        .clearCookie('accessToken', cookieOptions)
        .clearCookie('refreshToken', cookieOptions)
        .json(
            new ApiResponse(200, {}, 'Logged out successfully')
        );
});

/**
 * POST /api/v1/auth/refresh-token
 * No auth header needed — uses the refreshToken cookie (or req.body.refreshToken for mobile)
 * Issues a new access token + rotates the refresh token
 */
export const refreshToken = catchAsync(async (req, res) => {
    // Cookie (browser) takes priority, fallback to body (mobile clients)
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    const { accessToken, refreshToken: newRefreshToken } =
        await authService.refreshAccessToken(incomingRefreshToken);

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
 * GET /api/v1/auth/me
 * Requires: authenticated user
 * Returns the current logged-in user's profile
 */
export const getMe = catchAsync(async (req, res) => {
    // req.user is already set by the protect middleware — no extra DB call needed
    const user = await authService.getMe(req.user._id);

    res.status(200).json(
        new ApiResponse(200, user, 'User profile fetched successfully')
    );
});
