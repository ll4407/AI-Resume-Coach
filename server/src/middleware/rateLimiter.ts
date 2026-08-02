import { rateLimit } from 'express-rate-limit';

// Strict limiter for auth endpoints (login, register)
export const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 10, // Max 10 requests per window per IP
	message: {
        success: false,
        error: 'too many attempts.  Please try again after 15 minutes.'
    },
    standardHeaders: 'draft-8', // Modern RateLimit headers (draft-8 is latest standard) 
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers (depracated)
});

// General API limiter (less strict)
export const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, 
	limit: 100, 
	message: {
        success: false,
        error: 'too many attempts.  Please slow down.'
    },
    standardHeaders: 'draft-8', 
	legacyHeaders: false,
});