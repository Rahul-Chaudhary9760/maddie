import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { globalErrorHandler } from './middlewares/errorHandler.js';
import { requestLogger } from './middlewares/requestLogger.middleware.js';
import { AppError } from './utils/ApiError.js';

// Route imports
import testRoutes from './modules/medical-test/routes/medical-test.routes.js';
import authRoutes from './modules/auth/routes/auth.routes.js';
import bookingRoutes from './modules/booking/routes/booking.routes.js';

const app = express();

// ─── Global Middlewares ───────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Needed to read req.cookies (for httpOnly token auth)

// ─── Request Logger Middleware (Tracks method, url, status, latency) ───────────
app.use(requestLogger);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'active', message: 'API is working fine' });
});

// ─── Route Registration ───────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tests', testRoutes);
app.use('/api/v1/bookings', bookingRoutes);

// ─── Unhandled Routes ─────────────────────────────────────────────────────────
app.use((req, res, next) => {
    next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(globalErrorHandler);

export default app;