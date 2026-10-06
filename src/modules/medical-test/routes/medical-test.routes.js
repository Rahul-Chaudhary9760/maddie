import express from 'express';
import {
    getTests,
    getTestById,
    addTest,
    updateTest,
    deactivateTest
} from '../controllers/medical-test.controller.js';
import { protect, restrictTo } from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import { idParamSchema } from '../../../utils/validation.utils.js';
import { createTestSchema, updateTestSchema } from '../validators/medical-test.validator.js';
import { USER_ROLES } from '../../../config/constants.js';

const router = express.Router();

// ─── Public Routes ────────────────────────────────────────────────────────────

// GET    /api/v1/tests       -> Saare available tests
router.get('/', getTests);

// GET    /api/v1/tests/:id   -> Ek specific test by ID
router.get('/:id', validate({ params: idParamSchema }), getTestById);

// ─── Admin Only Routes ────────────────────────────────────────────────────────

// POST   /api/v1/tests       -> Naya test add karo (Admin)
router.post(
    '/',
    protect,
    restrictTo(USER_ROLES.ADMIN),
    validate({ body: createTestSchema }),
    addTest
);

// PUT    /api/v1/tests/:id   -> Test update karo (Admin)
router.put(
    '/:id',
    protect,
    restrictTo(USER_ROLES.ADMIN),
    validate({ params: idParamSchema, body: updateTestSchema }),
    updateTest
);

// DELETE /api/v1/tests/:id   -> Test deactivate karo (soft delete) (Admin)
router.delete(
    '/:id',
    protect,
    restrictTo(USER_ROLES.ADMIN),
    validate({ params: idParamSchema }),
    deactivateTest
);

export default router;