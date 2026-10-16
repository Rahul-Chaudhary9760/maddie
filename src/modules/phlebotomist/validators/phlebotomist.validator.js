import { z } from 'zod';
import { objectIdSchema } from '../../../utils/validation.utils.js';
import { BOOKING_STATUS, PHLEBOTOMIST_UPDATABLE_STATUSES } from '../../../config/constants.js';

export const phlebotomistLoginSchema = z.object({
    email: z
        .string({ required_error: 'Email is required' })
        .trim()
        .toLowerCase()
        .email('Invalid email address format'),
    password: z
        .string({ required_error: 'Password is required' })
        .min(1, 'Password is required')
});

export const createPhlebotomistSchema = z.object({
    name: z
        .string({ required_error: 'Name is required' })
        .trim()
        .min(2, 'Name must be at least 2 characters long')
        .max(100, 'Name cannot exceed 100 characters'),
    email: z
        .string({ required_error: 'Email is required' })
        .trim()
        .toLowerCase()
        .email('Invalid email address format'),
    phone: z
        .string({ required_error: 'Phone number is required' })
        .trim()
        .min(7, 'Phone number must be at least 7 digits')
        .max(20, 'Phone number cannot exceed 20 characters'),
    password: z
        .string({ required_error: 'Password is required' })
        .min(6, 'Password must be at least 6 characters long')
        .max(100, 'Password cannot exceed 100 characters'),
    servicePincodes: z
        .array(z.string().trim().min(3).max(10))
        .optional()
        .default([]),
    vehicleType: z
        .string()
        .trim()
        .max(50)
        .optional()
        .default('Bike'),
    isActive: z
        .boolean()
        .optional()
        .default(true)
});

export const updatePhlebotomistSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, 'Name must be at least 2 characters long')
        .max(100, 'Name cannot exceed 100 characters')
        .optional(),
    phone: z
        .string()
        .trim()
        .min(7, 'Phone number must be at least 7 digits')
        .max(20, 'Phone number cannot exceed 20 characters')
        .optional(),
    servicePincodes: z
        .array(z.string().trim().min(3).max(10))
        .optional(),
    vehicleType: z
        .string()
        .trim()
        .max(50)
        .optional(),
    isActive: z
        .boolean()
        .optional()
});

export const phleboCollectSampleSchema = z.object({
    collectionNotes: z
        .string()
        .trim()
        .max(500, 'Collection notes cannot exceed 500 characters')
        .optional()
        .default('')
});

export const phleboUpdateStatusSchema = z.object({
    status: z
        .enum(PHLEBOTOMIST_UPDATABLE_STATUSES, {
            errorMap: () => ({ message: `Status must be one of: ${PHLEBOTOMIST_UPDATABLE_STATUSES.join(', ')}` })
        }),
    collectionNotes: z
        .string()
        .trim()
        .max(500, 'Collection notes cannot exceed 500 characters')
        .optional()
});

export const phleboTasksQuerySchema = z.object({
    status: z
        .enum(Object.values(BOOKING_STATUS), {
            errorMap: () => ({ message: `Status filter must be one of: ${Object.values(BOOKING_STATUS).join(', ')}` })
        })
        .optional(),
    date: z
        .string()
        .refine((val) => !isNaN(Date.parse(val)), {
            message: 'Invalid date filter format (use YYYY-MM-DD)'
        })
        .optional()
});
