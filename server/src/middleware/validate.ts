import { body, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import {validationResult } from 'express-validator';

// Runs after validation chains - checks for errors
export const handleValidationErrors = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array().map((err) => ({
                field: err.type === 'field' ? err.path : undefined,
                message: err.msg,
      })),
    });
    return;
    }
    
    next();
};

// Validation rules for registration
export const registerValidation: ValidationChain[] = [
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 8})
        .withMessage('Password must be at least 8 characters')
        .matches(/[A-Z]/)
        .withMessage('Password must contain at least one uppercase letter')
        .matches(/[0-9]/)
        .withMessage('Password must contain at least one number'),
    body('name')
        .trim()
        .isLength({ min: 1, max: 100})
        .withMessage('Name is required and cannot exceed 100 characters'),
];

// Validation rules for login
export const loginValidation: ValidationChain[] = [
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
];

// Validation rules for refresh token
export const refreshvalidation: ValidationChain[] = [
    body('refreshtoken')
        .notEmpty()
        .withMessage('Refresh token is required',)
];