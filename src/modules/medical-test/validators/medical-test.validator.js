import { z } from 'zod';
import { TEST_CATEGORIES } from '../../../config/constants.js';

export const createTestSchema = z.object({
    name: z
        .string({ required_error: 'Test name is required' })
        .trim()
        .min(2, 'Test name must be at least 2 characters long')
        .max(100, 'Test name cannot exceed 100 characters'),
    description: z
        .string({ required_error: 'Description is required' })
        .trim()
        .min(5, 'Description must be at least 5 characters long')
        .max(1000, 'Description cannot exceed 1000 characters'),
    price: z
        .coerce
        .number({ required_error: 'Price is required' })
        .positive('Price must be greater than 0'),
    category: z
        .enum(Object.values(TEST_CATEGORIES), {
            errorMap: () => ({ message: `Category must be one of: ${Object.values(TEST_CATEGORIES).join(', ')}` })
        })
        .default(TEST_CATEGORIES.BLOOD),
    isAvailable: z
        .boolean()
        .optional()
        .default(true)
});

export const updateTestSchema = createTestSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field must be provided to update'
    });
