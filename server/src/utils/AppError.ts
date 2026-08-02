export class AppError extends Error {
    public statusCode: number;
    public isOperational: boolean;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
    
    // Removes the AppError constructor itself from the stack trace, 
    // so the trace points to where you threw it, not this file
    Error.captureStackTrace(this, this.constructor);
    }
}