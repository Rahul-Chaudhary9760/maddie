import { z } from 'zod';
import { objectIdSchema } from '../../../utils/validation.utils.js';
import { BOOKING_STATUS, UPDATABLE_BOOKING_STATUSES, USER_ROLES } from '../../../config/constants.js';

export const adminLoginSchema = z.object({
    email: z
        .string({ required_error: 'Email is required' })
        .trim()
        .toLowerCase()
        .email('Invalid email address format'),
    password: z
        .string({ required_error: 'Password is required' })
        .min(1, 'Password is required')
});

export const adminBookingsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(10),
    search: z.string().trim().optional(),
    status: z.enum(Object.values(BOOKING_STATUS)).optional(),
    date: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid date format (use YYYY-MM-DD)'
    }).optional(),
    startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid startDate format (use YYYY-MM-DD)'
    }).optional(),
    endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid endDate format (use YYYY-MM-DD)'
    }).optional(),
    phlebotomist: objectIdSchema.optional(),
    isAssigned: z.enum(['true', 'false']).optional()
});

export const adminUsersQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(10),
    search: z.string().trim().optional(),
    role: z.enum(Object.values(USER_ROLES)).optional()
});

export const adminPhlebotomistsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(10),
    search: z.string().trim().optional(),
    isActive: z.enum(['true', 'false']).optional()
});

export const adminCreatePhlebotomistSchema = z.object({
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

export const adminUpdatePhlebotomistSchema = z.object({
    name: z.string().trim().min(2).max(100).optional(),
    phone: z.string().trim().min(7).max(20).optional(),
    vehicleType: z.string().trim().max(50).optional(),
    servicePincodes: z.array(z.string().trim().min(3).max(10)).optional(),
    isActive: z.boolean().optional(),
    password: z.string().min(6).max(100).optional()
});

export const adminAssignPhlebotomistSchema = z.object({
    phlebotomistId: z.union([objectIdSchema, z.null()], {
        required_error: 'phlebotomistId is required (valid 24-character hex ID or null to unassign)'
    })
});

export const adminUpdateBookingStatusSchema = z.object({
    status: z.enum(UPDATABLE_BOOKING_STATUSES, {
        errorMap: () => ({ message: `Status must be one of: ${UPDATABLE_BOOKING_STATUSES.join(', ')}` })
    }),
    collectionNotes: z.string().trim().max(500).optional()
});
