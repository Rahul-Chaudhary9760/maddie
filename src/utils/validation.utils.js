import { z } from 'zod';

/**
 * Standard MongoDB ObjectId validation schema (24 hex characters)
 */
export const objectIdSchema = z
    .string({ required_error: 'ID is required' })
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, { message: 'Invalid ID format (must be a 24-character hexadecimal string)' });

/**
 * Schema helper to validate route params containing an ':id' parameter
 */
export const idParamSchema = z.object({
    id: objectIdSchema
});
