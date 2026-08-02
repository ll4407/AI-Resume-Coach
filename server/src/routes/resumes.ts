import { Router } from 'express';
import {
    createResume,
    getResume,
    getResumes,
    updateResume,
    deleteResume
} from '../controllers/resumeController.js';
import { protect } from '../middleware/auth.js';
import { 
    createResumeValidation, 
    updateResumeValidation,
    handleValidationErrors
} from '../middleware/validate.js';

const router = Router();

// all resume routes require authenticaiton
router.use(protect);

// POST /api/resumes
router.post(
    '/',
    createResumeValidation,
    handleValidationErrors,
    createResume
);

// GET /api/resumes
router.get('/', getResumes);

// GET /api/resumes/:id
router.get('/:id', getResume);

// PUT /api/resumes/:id
router.put(
    '/:id',
     updateResumeValidation,
     handleValidationErrors,
     updateResume
    );

// DELETE /api/resumes/:id
router.delete('/:id',deleteResume);

export default router;