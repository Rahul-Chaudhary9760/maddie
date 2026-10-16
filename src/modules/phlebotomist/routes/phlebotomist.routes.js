import express from 'express';
import {
    login,
    logout,
    refreshToken,
    getMe,
    updateMe,
    getMyAssignments,
    getAssignmentDetail,
    markSampleCollected,
    updateAssignmentStatus,
    getAllPhlebotomists,
    getPhlebotomistById,
    createPhlebotomist,
    updatePhlebotomist,
    deletePhlebotomist
} from '../controllers/phlebotomist.controller.js';
import { protect, restrictTo } from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import { idParamSchema } from '../../../utils/validation.utils.js';
import {
    phlebotomistLoginSchema,
    createPhlebotomistSchema,
    updatePhlebotomistSchema,
    phleboCollectSampleSchema,
    phleboUpdateStatusSchema,
    phleboTasksQuerySchema
} from '../validators/phlebotomist.validator.js';
import { USER_ROLES } from '../../../config/constants.js';

const router = express.Router();

// ─── Public Phlebotomist Auth Routes ──────────────────────────────────────────

// POST   /api/v1/phlebotomists/login
router.post('/login', validate({ body: phlebotomistLoginSchema }), login);

// POST   /api/v1/phlebotomists/refresh-token
router.post('/refresh-token', refreshToken);

// ─── Protected Phlebotomist Self Routes ───────────────────────────────────────

// POST   /api/v1/phlebotomists/logout
router.post('/logout', protect, logout);

// GET    /api/v1/phlebotomists/me
router.get('/me', protect, getMe);

// PATCH  /api/v1/phlebotomists/me
router.patch('/me', protect, validate({ body: updatePhlebotomistSchema }), updateMe);

// ─── Phlebotomist App Task Endpoints ─────────────────────────────────────────

// GET    /api/v1/phlebotomists/my-assignments
router.get(
    '/my-assignments',
    protect,
    restrictTo(USER_ROLES.PHLEBOTOMIST),
    validate({ query: phleboTasksQuerySchema }),
    getMyAssignments
);

// GET    /api/v1/phlebotomists/my-assignments/:id
router.get(
    '/my-assignments/:id',
    protect,
    restrictTo(USER_ROLES.PHLEBOTOMIST),
    validate({ params: idParamSchema }),
    getAssignmentDetail
);

// PATCH  /api/v1/phlebotomists/my-assignments/:id/sample-collected
router.patch(
    '/my-assignments/:id/sample-collected',
    protect,
    restrictTo(USER_ROLES.PHLEBOTOMIST),
    validate({ params: idParamSchema, body: phleboCollectSampleSchema }),
    markSampleCollected
);

// PATCH  /api/v1/phlebotomists/my-assignments/:id/status
router.patch(
    '/my-assignments/:id/status',
    protect,
    restrictTo(USER_ROLES.PHLEBOTOMIST),
    validate({ params: idParamSchema, body: phleboUpdateStatusSchema }),
    updateAssignmentStatus
);

// ─── Admin & Lab Staff Management Directory ───────────────────────────────────

// GET    /api/v1/phlebotomists
router.get(
    '/',
    protect,
    restrictTo(USER_ROLES.ADMIN, USER_ROLES.LAB_STAFF),
    getAllPhlebotomists
);

// POST   /api/v1/phlebotomists
router.post(
    '/',
    protect,
    restrictTo(USER_ROLES.ADMIN),
    validate({ body: createPhlebotomistSchema }),
    createPhlebotomist
);

// GET    /api/v1/phlebotomists/:id
router.get(
    '/:id',
    protect,
    restrictTo(USER_ROLES.ADMIN, USER_ROLES.LAB_STAFF),
    validate({ params: idParamSchema }),
    getPhlebotomistById
);

// PATCH  /api/v1/phlebotomists/:id
router.patch(
    '/:id',
    protect,
    restrictTo(USER_ROLES.ADMIN),
    validate({ params: idParamSchema, body: updatePhlebotomistSchema }),
    updatePhlebotomist
);

// DELETE /api/v1/phlebotomists/:id
router.delete(
    '/:id',
    protect,
    restrictTo(USER_ROLES.ADMIN),
    validate({ params: idParamSchema }),
    deletePhlebotomist
);

export default router;
