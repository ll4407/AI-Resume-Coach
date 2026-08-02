import { Router } from 'express';
import { register, login, refresh, getMe} from '../controllers/authController.js';
import { protect } from  '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { 
    registerValidation,
    loginValidation,
    refreshvalidation,
    handleValidationErrors,
} from '../middleware/validate.js';

const router = Router();

// POST /api/auth/register
router.post(
    '/register', 
    authLimiter,
    registerValidation, 
    handleValidationErrors,
    register
);

// POST /api/auth/login
router.post(
    '/login',
    authLimiter,
    loginValidation,
    handleValidationErrors,
    login
);

// POST /api/auth/refresh
router.post(
    '/refresh',
    authLimiter,
    refreshvalidation,
    handleValidationErrors,
    refresh
);

// Get /api/auth/me (protected)
router.get('/me', protect, getMe);

export default router;