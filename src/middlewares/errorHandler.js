import logger from '../utils/logger.js';

export const globalErrorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    err.message = err.message || 'Internal Server Error';

    // Log the error for backend debugging
    if (err.statusCode >= 500) {
        logger.error(`💥 [500 Server Error] ${req.method} ${req.originalUrl} - ${err.message}`, err);
    } else {
        logger.warn(`⚠️ [${err.statusCode} Handled Error] ${req.method} ${req.originalUrl} - ${err.message}`);
    }

    res.status(err.statusCode).json({
        success: false,
        status: err.status,
        message: err.message,
        ...(err.errors && { errors: err.errors }),
        // Development mode mein stack trace bhejenge debug karne ke liye
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};