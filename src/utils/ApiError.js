export class AppError extends Error {
    constructor(message, statusCode, errors = null) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true; // To identify if it's a known error or a programming bug
        if (errors) {
            this.errors = errors;
        }
        
        Error.captureStackTrace(this, this.constructor);
    }
}