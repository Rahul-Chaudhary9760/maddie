import jwt from 'jsonwebtoken';
import User from '../modules/auth/models/user.model.js';
import { AppError } from '../utils/ApiError.js';
import { catchAsync } from '../utils/catchAsync.js';
import { USER_ROLES } from '../config/constants.js';
import logger from '../utils/logger.js';

/**
 * protect middleware
 * 
 * Verifies the access token from:
 *   1. Authorization header → "Bearer <token>"
 *   2. httpOnly cookie      → accessToken
 * 
 * Attaches the authenticated user to req.user
 */
export const protect = catchAsync(async (req, res, next) => {
    let token;

    // Check Authorization header first (for mobile/API clients)
    if (req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }
    // Fallback to cookie (for browser clients)
    else if (req.cookies?.accessToken) {
        token = req.cookies.accessToken;
    }

    if (!token) {
        logger.warn(`🔒 Auth Failed: No token provided for ${req.method} ${req.originalUrl}`);
        throw new AppError('You are not logged in. Please log in to access this resource.', 401);
    }

    // Verify token signature and expiry
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (err) {
        logger.warn(`🔒 Auth Failed: Invalid or expired token for ${req.method} ${req.originalUrl} (${err.message})`);
        throw new AppError('Invalid or expired access token. Please log in again.', 401);
    }

    // Check if user still exists (account not deleted after token was issued)
    const currentUser = await User.findById(decoded._id);
    if (!currentUser) {
        logger.warn(`🔒 Auth Failed: User for token ${decoded._id} no longer exists in DB`);
        throw new AppError('The user belonging to this token no longer exists.', 401);
    }

    // Attach user to request for downstream use
    req.user = currentUser;
    next();
});

/**
 * restrictTo(...roles) middleware
 * 
 * Used after protect to restrict access based on role.
 * Example: router.delete('/:id', protect, restrictTo('admin'), deleteTest)
 */
export const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            logger.warn(`🚫 Permission Denied: User '${req.user.email}' (${req.user.role}) attempted forbidden action on ${req.method} ${req.originalUrl}`);
            return next(
                new AppError('You do not have permission to perform this action.', 403)
            );
        }
        next();
    };
};
