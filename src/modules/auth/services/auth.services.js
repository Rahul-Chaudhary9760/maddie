import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { AppError } from '../../../utils/ApiError.js';
import { generateAccessToken, generateRefreshToken } from '../utils/token.utils.js';
import logger from '../../../utils/logger.js';

/**
 * Register a new user
 * - Checks for duplicate email
 * - Creates user (password hashed via pre-save hook in model)
 * - Returns user without sensitive fields
 */
export const registerUser = async ({ name, email, password, role }) => {
    logger.info(`📝 Registration attempt for: ${email} [role: ${role || 'user'}]`);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        logger.warn(`Registration failed: Email already exists (${email})`);
        throw new AppError('An account with this email already exists', 400);
    }

    const user = await User.create({ name, email, password, role });

    // Return user object without password
    const createdUser = await User.findById(user._id);
    logger.info(`✅ User registered successfully: ${createdUser.email} [ID: ${createdUser._id}]`);

    return createdUser;
};

/**
 * Login a user
 * - Validates credentials
 * - Generates access & refresh tokens
 * - Saves refresh token to DB (so we can invalidate it on logout)
 * - Returns user + both tokens
 */
export const loginUser = async ({ email, password }) => {
    logger.info(`🔑 Login attempt for: ${email}`);

    // Explicitly select password since it's hidden by default (select: false)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
        logger.warn(`❌ Login failed: User not found (${email})`);
        throw new AppError('Invalid email or password', 401);
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        logger.warn(`❌ Login failed: Incorrect password for (${email})`);
        throw new AppError('Invalid email or password', 401);
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Persist refresh token in DB for future validation/logout
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // Return user without sensitive fields
    const loggedInUser = await User.findById(user._id);
    logger.info(`✅ Login successful: ${loggedInUser.email} [Role: ${loggedInUser.role}]`);

    return { user: loggedInUser, accessToken, refreshToken };
};

/**
 * Logout a user
 * - Clears the refresh token from DB (invalidates the session)
 */
export const logoutUser = async (userId) => {
    await User.findByIdAndUpdate(
        userId,
        { $unset: { refreshToken: 1 } }, // Remove field from DB entirely
        { new: true }
    );
    logger.info(`🚪 User logged out: User ID ${userId}`);
};

/**
 * Refresh Access Token
 * - Reads refresh token from cookie or body
 * - Verifies it against DB (ensures it wasn't tampered / revoked on logout)
 * - Issues a fresh access token + refresh token (rotation)
 */
export const refreshAccessToken = async (incomingRefreshToken) => {
    if (!incomingRefreshToken) {
        logger.warn('Token refresh failed: Missing refresh token');
        throw new AppError('Refresh token is missing. Please log in again.', 401);
    }

    // Verify the token signature
    let decoded;
    try {
        decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
        logger.warn(`Token refresh failed: Invalid token signature or expired (${err.message})`);
        throw new AppError('Refresh token is invalid or expired. Please log in again.', 401);
    }

    // Fetch user and compare stored token (DB token must match incoming token)
    const user = await User.findById(decoded._id).select('+refreshToken');
    if (!user) {
        logger.warn(`Token refresh failed: User ${decoded._id} not found in DB`);
        throw new AppError('User not found. Please log in again.', 401);
    }
    if (user.refreshToken !== incomingRefreshToken) {
        logger.warn(`Token refresh failed: Token mismatch or revoked for user ${user._id}`);
        throw new AppError('Refresh token has been revoked. Please log in again.', 401);
    }

    // Issue a new token pair (refresh token rotation — old one is replaced)
    const newAccessToken  = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    logger.info(`🔄 Access token refreshed for user: ${user.email} [ID: ${user._id}]`);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

/**
 * Get current logged-in user's profile
 */
export const getMe = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        logger.warn(`Fetch profile failed: User ${userId} not found`);
        throw new AppError('User not found', 404);
    }
    return user;
};
