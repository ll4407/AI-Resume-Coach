import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/tokens.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';

// Extend Express Request to include user info
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                name: string;
            };
        }
    }
}

export const protect = async (
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> => {
    // 1. Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AppError('Not authorized — no token provided', 401);
    }

    const token = authHeader.split(' ')[1];
    // 2. Verify the token
    try {
        const decoded = verifyAccessToken(token);
    
        // 3. Check if user still exists
        const user = await User.findById(decoded.userId)
        
        if(!user) {
            throw new AppError('User no longer exists', 401);
        }

        // 4. Attach user to request object
        req.user = {
            id: user?._id.toString(),
            email: user.email,
            name: user?.name,
        };

        next();
        
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('Not authorized - invalid token', 401);
    }
};