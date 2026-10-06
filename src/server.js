import 'dotenv/config';
import app from './app.js';
import connectDB from './config/db.js';
import logger from './utils/logger.js';

const PORT = process.env.PORT || 8000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Handle uncaught exceptions (synchronous bugs)
process.on('uncaughtException', (err) => {
    logger.error('💥 UNCAUGHT EXCEPTION! Shutting down server...', err);
    process.exit(1);
});

// Database connect hone ke baad hi server start karein
connectDB()
    .then(() => {
        const server = app.listen(PORT, () => {
            logger.info(`🚀 Server running on port ${PORT} in [${NODE_ENV}] mode`);
            logger.info(`👉 Health check: http://localhost:${PORT}/health`);
        });

        // Handle unhandled promise rejections (asynchronous unhandled errors)
        process.on('unhandledRejection', (err) => {
            logger.error('💥 UNHANDLED PROMISE REJECTION! Closing server gracefully...', err);
            server.close(() => {
                process.exit(1);
            });
        });
    })
    .catch((error) => {
        logger.error('❌ Server startup failed due to database connection error', error);
    });