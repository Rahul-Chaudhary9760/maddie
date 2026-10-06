import express from 'express';
import {
    createBooking,
    getMyBookings,
    getBookingById,
    getAllBookings,
    updateBookingStatus,
    cancelMyBooking
} from '../controllers/booking.controller.js';
import { protect, restrictTo } from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import { idParamSchema } from '../../../utils/validation.utils.js';
import {
    createBookingSchema,
    updateBookingStatusSchema,
    getBookingsQuerySchema
} from '../validators/booking.validator.js';
import { USER_ROLES } from '../../../config/constants.js';

const router = express.Router();

// All booking routes require authentication
router.use(protect);

// ─── User Routes ──────────────────────────────────────────────────────────────

// POST   /api/v1/bookings             → Create a new booking
router.post('/', validate({ body: createBookingSchema }), createBooking);

// GET    /api/v1/bookings/my          → Get logged-in user's bookings
// NOTE: /my must come before /:id to avoid "my" being matched as an ID
router.get('/my', getMyBookings);

// GET    /api/v1/bookings/:id         → Get single booking (owner or privileged)
router.get('/:id', validate({ params: idParamSchema }), getBookingById);

// PATCH  /api/v1/bookings/:id/cancel  → User cancels their own pending booking
router.patch('/:id/cancel', validate({ params: idParamSchema }), cancelMyBooking);

// ─── Admin & Lab Staff Routes ─────────────────────────────────────────────────

// GET    /api/v1/bookings             → All bookings (with optional ?status & ?date filters)
router.get(
    '/',
    restrictTo(USER_ROLES.ADMIN, USER_ROLES.LAB_STAFF),
    validate({ query: getBookingsQuerySchema }),
    getAllBookings
);

// PATCH  /api/v1/bookings/:id/status  → Update booking status
router.patch(
    '/:id/status',
    restrictTo(USER_ROLES.ADMIN, USER_ROLES.LAB_STAFF),
    validate({ params: idParamSchema, body: updateBookingStatusSchema }),
    updateBookingStatus
);

export default router;
