import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const connectDB = async () => {
    try {
        logger.info('⏳ Connecting to MongoDB...');
        const conn = await mongoose.connect(process.env.MONGO_URI);
        logger.info(`✅ MongoDB Connected: ${conn.connection.host} (DB: ${conn.connection.name})`);

        // MongoDB lifecycle event listeners for debugging disconnects
        mongoose.connection.on('disconnected', () => {
            logger.warn('⚠️ MongoDB disconnected from server');
        });

        mongoose.connection.on('reconnected', () => {
            logger.info('🔄 MongoDB reconnected');
        });

        mongoose.connection.on('error', (err) => {
            logger.error('❌ MongoDB connection error:', err);
        });
    } catch (error) {
        logger.error(`❌ Error connecting to MongoDB: ${error.message}`, error);
        process.exit(1);
    }
};

export default connectDB;