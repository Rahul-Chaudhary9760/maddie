import express from 'express';
import {
    login,
    logout,
    getMe,
    getDashboardStats,
    getBookings,
    getBookingById,
    assignPhlebotomist,
    updateBookingStatus,
    getUsers,
    getUserById,
    getPhlebotomists,
    getPhlebotomistById,
    createPhlebotomist,
    updatePhlebotomist,
    deletePhlebotomist
} from '../controllers/admin.controller.js';
import { protect, restrictTo } from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import { idParamSchema } from '../../../utils/validation.utils.js';
import {
    adminLoginSchema,
    adminBookingsQuerySchema,
    adminUsersQuerySchema,
    adminPhlebotomistsQuerySchema,
    adminCreatePhlebotomistSchema,
    adminUpdatePhlebotomistSchema,
    adminAssignPhlebotomistSchema,
    adminUpdateBookingStatusSchema
} from '../validators/admin.validator.js';
import { USER_ROLES } from '../../../config/constants.js';

const router = express.Router();

// ─── 1. Public Admin Auth ─────────────────────────────────────────────────────

// POST /api/v1/admin/login → Specifically authenticates admins & staff
router.post('/login', validate({ body: adminLoginSchema }), login);

// ─── Protected Admin Portal Routes ───────────────────────────────────────────
// All routes below require valid token + ADMIN or LAB_STAFF role
router.use(protect);
router.use(restrictTo(USER_ROLES.ADMIN, USER_ROLES.LAB_STAFF));

// POST /api/v1/admin/logout
router.post('/logout', logout);

// GET  /api/v1/admin/me
router.get('/me', getMe);

// GET  /api/v1/admin/stats → Dashboard overview KPIs, revenue, booking distribution
router.get('/stats', getDashboardStats);

// ─── 2. Bookings Management ───────────────────────────────────────────────────

// GET   /api/v1/admin/bookings → Paginated bookings with search & date filters
router.get('/bookings', validate({ query: adminBookingsQuerySchema }), getBookings);

// GET   /api/v1/admin/bookings/:id → Full booking details with patient & assignment info
router.get('/bookings/:id', validate({ params: idParamSchema }), getBookingById);

// PATCH /api/v1/admin/bookings/:id/assign → Assign or unassign phlebotomist
router.patch(
    '/bookings/:id/assign',
    validate({ params: idParamSchema, body: adminAssignPhlebotomistSchema }),
    assignPhlebotomist
);

// PATCH /api/v1/admin/bookings/:id/status → Update status (confirmed, sample_collected, etc.)
router.patch(
    '/bookings/:id/status',
    validate({ params: idParamSchema, body: adminUpdateBookingStatusSchema }),
    updateBookingStatus
);

// ─── 3. User / Patient Details Management ─────────────────────────────────────

// GET /api/v1/admin/users → Paginated list of users with total bookings & spend metrics
router.get('/users', validate({ query: adminUsersQuerySchema }), getUsers);

// GET /api/v1/admin/users/:id → User details + complete historical bookings
router.get('/users/:id', validate({ params: idParamSchema }), getUserById);

// ─── 4. Phlebotomist Directory & Operations ───────────────────────────────────

// GET  /api/v1/admin/phlebotomists → Paginated list with live workload
router.get('/phlebotomists', validate({ query: adminPhlebotomistsQuerySchema }), getPhlebotomists);

// GET  /api/v1/admin/phlebotomists/:id → Phlebotomist profile + recent task history
router.get('/phlebotomists/:id', validate({ params: idParamSchema }), getPhlebotomistById);

// POST /api/v1/admin/phlebotomists → Add new phlebotomist (Admin only)
router.post(
    '/phlebotomists',
    restrictTo(USER_ROLES.ADMIN),
    validate({ body: adminCreatePhlebotomistSchema }),
    createPhlebotomist
);

// PATCH /api/v1/admin/phlebotomists/:id → Update phlebo details or activate/deactivate (Admin only)
router.patch(
    '/phlebotomists/:id',
    restrictTo(USER_ROLES.ADMIN),
    validate({ params: idParamSchema, body: adminUpdatePhlebotomistSchema }),
    updatePhlebotomist
);

// DELETE /api/v1/admin/phlebotomists/:id → Delete phlebotomist (Admin only)
router.delete(
    '/phlebotomists/:id',
    restrictTo(USER_ROLES.ADMIN),
    validate({ params: idParamSchema }),
    deletePhlebotomist
);

export default router;
