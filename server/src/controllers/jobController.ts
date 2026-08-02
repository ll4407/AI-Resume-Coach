import { Request, Response } from 'express';
import { JobDescription } from '../models/JobDescription.js';
import { AppError } from '../utils/AppError.js';

// POST /api/jobs
export const createJob = async (req: Request, res: Response): Promise<void> => {
    const { 
        company, 
        role, 
        description, 
        keywordsExtracted, 
        url
    } = req.body;

    const job = await JobDescription.create({
        userId: req.user!.id,
        company, 
        role, 
        description,
        keywordsExtracted: keywordsExtracted || [],
        url: url || '',
    });

    res.status(201).json({
        success: true,
        data: job,
    });
};

// GET /api/jobs
export const getJobs = async (req: Request, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
  const skip = (page - 1) * limit;

  const [ jobs, total ] = await Promise.all([
    JobDescription.find({ userId: req.user!.id })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-description'), // Exclude description
    JobDescription.countDocuments({userId: req.user!.id}),
  ]);

  res.status(200).json({
    success: true,
    data: jobs,
    pagination: {
        page,
        limit, 
        total,
        pages: Math.ceil(total / limit),
    },
  });
};

// GET /api/jobs/:id
export const getJob = async (req: Request, res: Response): Promise<void> => {
    const job = await JobDescription.findOne({
        _id: req.params.id,
        userId: req.user!.id,
    });

    if(!job){
        throw new AppError('Job not found', 404)
    };

    res.status(200).json({
        success: true,
        data: job,
    });
};

// PUT /api/jobs/:id
export const updateJob = async (req: Request, res: Response): Promise<void> => {
    const [ 
        company, 
        role, 
        description, 
        keywordsExtracted,
        url
    ] = req.body;

    const job = await JobDescription.findOneAndUpdate(
        { _id: req.params.id, userId: req.user!.id },
        { company, role, description, keywordsExtracted, url },
        { new: true, runValidators: true }
    );

    if(!job){
        throw new AppError('Job not found', 404);
    }

    res.status(200).json({
        success: true,
        data: job,
    });
};

// DELETE /api/jobs/:id
export const deleteJob = async (req: Request, res: Response): Promise<void> => {
    const job = await JobDescription.findOneAndDelete({
        _id: req.params.id, 
        userId:  req.user!.id
    });

    if(!job){
        throw new AppError('Job not found', 404)
    }

    res.status(200).json({
        success: true,
        data: null,
        message: 'Job deleted successfully',
    })
};