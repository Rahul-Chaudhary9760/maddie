import { z } from 'zod';
import { USER_ROLES } from '../../../config/constants.js';

export const registerSchema = z.object({
    name: z
        .string({ required_error: 'Name is required' })
        .trim()
        .min(2, 'Name must be at least 2 characters long')
        .max(50, 'Name cannot exceed 50 characters'),
    email: z
        .string({ required_error: 'Email is required' })
        .trim()
        .toLowerCase()
        .email('Invalid email address format'),
    password: z
        .string({ required_error: 'Password is required' })
        .min(6, 'Password must be at least 6 characters long')
        .max(100, 'Password cannot exceed 100 characters'),
    role: z
        .enum(Object.values(USER_ROLES), {
            errorMap: () => ({ message: `Role must be one of: ${Object.values(USER_ROLES).join(', ')}` })
        })
        .optional()
});

export const loginSchema = z.object({
    email: z
        .string({ required_error: 'Email is required' })
        .trim()
        .toLowerCase()
        .email('Invalid email address format'),
    password: z
        .string({ required_error: 'Password is required' })
        .min(1, 'Password is required')
});

export const refreshTokenSchema = z.object({
    refreshToken: z
        .string()
        .trim()
        .min(1, 'Refresh token cannot be empty')
        .optional()
});
