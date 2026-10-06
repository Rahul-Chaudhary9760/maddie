import jwt from 'jsonwebtoken';

/**
 * Generate a short-lived Access Token (15 minutes)
 * Contains user's id and role as payload
 */
export const generateAccessToken = (user) => {
    return jwt.sign(
        { _id: user._id, role: user.role },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m' }
    );
};

/**
 * Generate a long-lived Refresh Token (7 days)
 * Only contains user id — minimal payload for security
 */
export const generateRefreshToken = (user) => {
    return jwt.sign(
        { _id: user._id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d' }
    );
};

/**
 * Cookie options shared across set/clear operations
 * httpOnly → JS cannot read the cookie (XSS protection)
 * secure   → HTTPS only in production
 * sameSite → CSRF protection
 */
export const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
};
