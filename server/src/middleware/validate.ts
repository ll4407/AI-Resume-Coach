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

// Validation rules for creating a resume
export const createResumeValidation: ValidationChain[] = [
    body('title')
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Title is required and cannot excceed 200 characters'),
    body('targetRole')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Target role cannot exceed 200 characters'),
    body('sections')
        .optional()
        .isArray()
        .withMessage('Sections must be an array'),
    body('sections.*.title')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Section title is reequired'),
    body('sections.*.content')
        .optional()
        .notEmpty()
        .withMessage('Section content is requried'),
    body('sections.*.order')
        .optional()
        .isInt({ min: 0})
        .withMessage('Section order must be a non-negative integer'),
    body('rawContent')
        .optional()
        .isString()
        .withMessage('Raw content must be a string'),
];


//  Validation rules for updating a resume
export const updateResumeValidation: ValidationChain[] = [
        body('title')
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Title is required and cannot excceed 200 characters'),
    body('targetRole')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Target role cannot exceed 200 characters'),
    body('sections')
        .optional()
        .isArray()
        .withMessage('Sections must be an array'),
    body('sections.*.title')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Section title is reequired'),
    body('sections.*.content')
        .optional()
        .notEmpty()
        .withMessage('Section content is requried'),
    body('sections.*.order')
        .optional()
        .isInt({ min: 0})
        .withMessage('Section order must be a non-negative integer'),
    body('rawContent')
        .optional()
        .isString()
        .withMessage('Raw content must be a string'),
];

// Validation rules for creating a job description
export const createJobValidation: ValidationChain[] = [
  body('role')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Job role is required and cannot exceed 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Job description text is required'),
  body('company')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Company name cannot exceed 200 characters'),
  body('url')
    .optional()
    .trim()
    .isURL()
    .withMessage('URL must be a valid URL'),
  body('keywordsExtracted')
    .optional()
    .isArray()
    .withMessage('Keywords must be an array'),
  body('keywordsExtracted.*')
    .optional()
    .isString()
    .withMessage('Each keyword must be a string'),
];

// Validation rules for updating a job description
export const updateJobValidation: ValidationChain[] = [
  body('role')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Job role cannot exceed 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Job description cannot be empty'),
  body('company')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Company name cannot exceed 200 characters'),
  body('url')
    .optional()
    .trim()
    .isURL()
    .withMessage('URL must be a valid URL'),
  body('keywordsExtracted')
    .optional()
    .isArray()
    .withMessage('Keywords must be an array'),
  body('keywordsExtracted.*')
    .optional()
    .isString()
    .withMessage('Each keyword must be a string'),
];