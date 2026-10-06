import express from 'express';
import { register, login, logout, refreshToken, getMe } from '../controllers/auth.controller.js';
import { protect } from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validators/auth.validator.js';

const router = express.Router();

// ─── Public Routes ────────────────────────────────────────────────────────────

// POST /api/v1/auth/register
router.post('/register', validate({ body: registerSchema }), register);

// POST /api/v1/auth/login
router.post('/login', validate({ body: loginSchema }), login);

// POST /api/v1/auth/refresh-token
// Browser: reads refreshToken from httpOnly cookie automatically
// Mobile:  send { "refreshToken": "<token>" } in body
router.post('/refresh-token', validate({ body: refreshTokenSchema }), refreshToken);

// ─── Protected Routes ─────────────────────────────────────────────────────────

// POST /api/v1/auth/logout
router.post('/logout', protect, logout);

// GET  /api/v1/auth/me
router.get('/me', protect, getMe);

export default router;
