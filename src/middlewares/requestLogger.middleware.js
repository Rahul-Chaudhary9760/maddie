import logger from '../utils/logger.js';

/**
 * Middleware to log incoming HTTP requests and response performance
 * Displays: [HTTP] METHOD /path status responseTime (ms)
 * In development, also logs incoming params/body for debugging.
 */
export const requestLogger = (req, res, next) => {
    const start = Date.now();
    const { method, originalUrl, ip } = req;

    // Log response after it finishes sending
    res.on('finish', () => {
        const duration = Date.now() - start;
        const statusCode = res.statusCode;

        let statusColor = '\x1b[32m'; // Green for 2xx
        if (statusCode >= 500) {
            statusColor = '\x1b[31m'; // Red for 5xx
        } else if (statusCode >= 400) {
            statusColor = '\x1b[33m'; // Yellow for 4xx
        } else if (statusCode >= 300) {
            statusColor = '\x1b[36m'; // Cyan for 3xx
        }
        const resetColor = '\x1b[0m';

        const userTag = req.user ? ` [User: ${req.user.email} (${req.user.role})]` : '';
        const logMsg = `${method} ${originalUrl} ${statusColor}${statusCode}${resetColor} (${duration}ms)${userTag}`;

        if (statusCode >= 500) {
            logger.error(`Failed Request: ${logMsg}`);
        } else if (statusCode >= 400) {
            logger.warn(`Client Request Issue: ${logMsg}`);
        } else {
            logger.http(logMsg);
        }
    });

    next();
};
