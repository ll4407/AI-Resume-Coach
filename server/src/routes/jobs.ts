import { Router } from "express";
import { 
    createJob,
    getJobs,
    getJob,
    updateJob,
    deleteJob
} from '../controllers/jobController.js';
import { protect } from "../middleware/auth.js";
import { 
    createJobValidation, 
    updateJobValidation,
    handleValidationErrors
} from "../middleware/validate.js";

const router = Router();    

// all jobs routes require authenticaiton
router.use(protect);

// POST /api/jobs
router.post(
    '/',
    createJobValidation,
    handleValidationErrors,
    createJob
);

// GET /api/jobs
router.get('/', getJobs);

// GET /api/jobs/:id
router.get('/:id', getJob);

// PUT /api/jobs/:id
router.put(
    '/:id',
    updateJobValidation,
    handleValidationErrors,
    updateJob
);

// DELETE /api/jobs/:id
router.delete('/:id', deleteJob);

export default router;