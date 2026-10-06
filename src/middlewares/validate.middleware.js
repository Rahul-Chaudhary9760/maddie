import { ZodError } from 'zod';
import { AppError } from '../utils/ApiError.js';
import logger from '../utils/logger.js';

/**
 * Higher-order middleware for Zod schema validation
 * Validates req.body, req.query, and/or req.params against provided Zod schemas.
 * 
 * Usage:
 * router.post('/register', validate({ body: registerSchema }), registerHandler);
 * router.get('/:id', validate({ params: idParamSchema }), getByIdHandler);
 */
export const validate = ({ body, query, params } = {}) => {
    return (req, res, next) => {
        try {
            if (body) {
                req.body = body.parse(req.body);
            }
            if (query) {
                req.query = query.parse(req.query);
            }
            if (params) {
                req.params = params.parse(req.params);
            }
            next();
        } catch (error) {
            const issues = error.issues || error.errors;
            if (error instanceof ZodError || issues) {
                const formattedErrors = (issues || []).map((e) => ({
                    field: e.path.join('.') || 'input',
                    message: e.message,
                }));

                const summary = formattedErrors.map(e => `${e.field}: ${e.message}`).join(', ');
                logger.warn(`⚠️ Validation Failed on ${req.method} ${req.originalUrl} - ${summary}`);

                return next(new AppError(`Validation failed: ${summary}`, 400, formattedErrors));
            }
            next(error);
        }
    };
};

export default validate;
