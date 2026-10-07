import { z } from 'zod';
import { objectIdSchema } from '../../../utils/validation.utils.js';
import { BOOKING_STATUS, TIME_SLOTS, UPDATABLE_BOOKING_STATUSES } from '../../../config/constants.js';

export const addressValidationSchema = z.object({
    street: z
        .string({ required_error: 'Street address is required' })
        .trim()
        .min(3, 'Street address must be at least 3 characters long')
        .max(200, 'Street address cannot exceed 200 characters'),
    city: z
        .string({ required_error: 'City is required' })
        .trim()
        .min(2, 'City must be at least 2 characters long')
        .max(100, 'City cannot exceed 100 characters'),
    state: z
        .string()
        .trim()
        .max(100, 'State cannot exceed 100 characters')
        .optional()
        .default(''),
    pincode: z
        .string({ required_error: 'Pincode is required' })
        .trim()
        .min(4, 'Pincode must be at least 4 characters')
        .max(10, 'Pincode cannot exceed 10 characters'),
    landmark: z
        .string()
        .trim()
        .max(150, 'Landmark cannot exceed 150 characters')
        .optional()
        .default('')
});

export const createBookingSchema = z.object({
    testId: objectIdSchema,
    patientName: z
        .string({ required_error: 'Patient name is required' })
        .trim()
        .min(2, 'Patient name must be at least 2 characters long')
        .max(100, 'Patient name cannot exceed 100 characters'),
    patientAge: z
        .coerce
        .number({ required_error: 'Patient age is required' })
        .int('Patient age must be an integer')
        .min(1, 'Patient age must be at least 1')
        .max(120, 'Patient age cannot exceed 120'),
    patientGender: z
        .enum(['male', 'female', 'other'], {
            errorMap: () => ({ message: 'Gender must be either "male", "female", or "other"' })
        }),
    address: addressValidationSchema,
    appointmentDate: z
        .string({ required_error: 'Appointment date is required' })
        .refine((val) => !isNaN(Date.parse(val)), {
            message: 'Invalid appointment date format (use YYYY-MM-DD or ISO string)'
        })
        .refine((val) => {
            const date = new Date(val);
            const now = new Date();
            // Allow today's future time or upcoming dates
            return date > now;
        }, {
            message: 'Appointment date must be in the future'
        }),
    timeSlot: z
        .enum(TIME_SLOTS, {
            errorMap: () => ({ message: `Time slot must be one of: ${TIME_SLOTS.join(', ')}` })
        }),
    notes: z
        .string()
        .trim()
        .max(500, 'Notes cannot exceed 500 characters')
        .optional()
        .default('')
});

export const updateBookingStatusSchema = z.object({
    status: z
        .enum(UPDATABLE_BOOKING_STATUSES, {
            errorMap: () => ({ message: `Status must be one of: ${UPDATABLE_BOOKING_STATUSES.join(', ')}` })
        })
});

export const getBookingsQuerySchema = z.object({
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
