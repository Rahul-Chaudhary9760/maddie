import express from 'express';
import {
    createBooking,
    getMyBookings,
    getBookingById,
    getAllBookings,
    updateBookingStatus,
    cancelMyBooking,
    assignPhlebotomist,
    getMyAssignments,
    markSampleCollected,
    getPhlebotomistsList
} from '../controllers/booking.controller.js';
import { protect, restrictTo } from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import { idParamSchema } from '../../../utils/validation.utils.js';
import {
    createBookingSchema,
    updateBookingStatusSchema,
    getBookingsQuerySchema,
    assignPhlebotomistSchema,
    collectSampleSchema,
    getPhlebotomistBookingsQuerySchema
} from '../validators/booking.validator.js';
import { USER_ROLES } from '../../../config/constants.js';

const router = express.Router();

// All booking routes require authentication
router.use(protect);

// ─── User Routes ──────────────────────────────────────────────────────────────

// POST   /api/v1/bookings                    → Create a new booking
router.post('/', validate({ body: createBookingSchema }), createBooking);

// GET    /api/v1/bookings/my                 → Get logged-in user's bookings
// NOTE: /my must come before /:id to avoid "my" being matched as an ID
router.get('/my', getMyBookings);

// ─── Phlebotomist Routes ──────────────────────────────────────────────────────

// GET    /api/v1/bookings/my-assignments     → Get phlebotomist's assigned bookings
router.get(
    '/my-assignments',
    restrictTo(USER_ROLES.PHLEBOTOMIST, USER_ROLES.ADMIN, USER_ROLES.LAB_STAFF),
    validate({ query: getPhlebotomistBookingsQuerySchema }),
    getMyAssignments
);

// ─── Admin & Lab Staff Management Routes ───────────────────────────────────────

// GET    /api/v1/bookings/phlebotomists      → List all phlebotomists with active workloads
router.get(
    '/phlebotomists',
    restrictTo(USER_ROLES.ADMIN, USER_ROLES.LAB_STAFF),
    getPhlebotomistsList
);

// GET    /api/v1/bookings                    → All bookings (filter by ?status, ?date, ?phlebotomist, ?isAssigned)
router.get(
    '/',
    restrictTo(USER_ROLES.ADMIN, USER_ROLES.LAB_STAFF),
    validate({ query: getBookingsQuerySchema }),
    getAllBookings
);

// ─── Specific Booking Actions & Detail ────────────────────────────────────────

// GET    /api/v1/bookings/:id                → Get single booking (owner, assigned phlebo, admin, staff)
router.get('/:id', validate({ params: idParamSchema }), getBookingById);

// PATCH  /api/v1/bookings/:id/cancel         → User cancels their own pending booking
router.patch('/:id/cancel', validate({ params: idParamSchema }), cancelMyBooking);

// PATCH  /api/v1/bookings/:id/assign-phlebotomist → Admin/Staff assigns phlebotomist to a booking
router.patch(
    '/:id/assign-phlebotomist',
    restrictTo(USER_ROLES.ADMIN, USER_ROLES.LAB_STAFF),
    validate({ params: idParamSchema, body: assignPhlebotomistSchema }),
    assignPhlebotomist
);

// PATCH  /api/v1/bookings/:id/sample-collected    → Phlebotomist marks sample collected
router.patch(
    '/:id/sample-collected',
    restrictTo(USER_ROLES.PHLEBOTOMIST, USER_ROLES.ADMIN, USER_ROLES.LAB_STAFF),
    validate({ params: idParamSchema, body: collectSampleSchema }),
    markSampleCollected
);

// PATCH  /api/v1/bookings/:id/status         → Update booking status
router.patch(
    '/:id/status',
    restrictTo(USER_ROLES.ADMIN, USER_ROLES.LAB_STAFF, USER_ROLES.PHLEBOTOMIST),
    validate({ params: idParamSchema, body: updateBookingStatusSchema }),
    updateBookingStatus
);

export default router;
