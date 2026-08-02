import { Request, Response } from 'express';
import { Resume } from '../models/Resume.js';
import { AppError } from '../utils/AppError.js';

// POST /api/resume
export const createResume = async (req: Request, res: Response): Promise<void> => {
    const { title, targetRole, sections, rawContent} = req.body;

    const resume = await Resume.create({
        userId: req.user!.id,
        title,
        targetRole,
        sections: sections || [],
        rawContent: rawContent || '',
    });

    res.status(201).json({
        success: true,
        data: resume,
    })
};

// GET /api/resumes
export const getResumes = async (req: Request, res: Response): Promise<void> => {
  // Pagination from query params (defaults: page 1, 10 per page)
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
  const skip = (page - 1) * limit;

  const [resumes, total] = await Promise.all([
    Resume.find({ userId: req.user!.id})
        .sort({ updatedAt: -1})
        .skip(skip)
        .limit(limit)
        .select('-rawContent'), // Exclude rawContent from list
    Resume.countDocuments({ userId: req.user!.id }),
    ]);

  res.status(200).json({
    success: true,
    data: resumes,
    pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
    },
  });
};

// GET /api/resumes/:id
export const getResume = async (req: Request, res: Response): Promise<void> => {
    const resume = await Resume.findOne({
        _id: req.params.id,
        userId: req.user!.id
    });

    if(!resume) {
        throw new AppError('Resume not found',404)
    }

    res.status(200).json({
        success: true,
        data: resume,
    });
};

// PUT /api/resumes/:id
export const updateResume = async ( req: Request, res: Response): Promise<void> => {
    const { title, targetRole, sections, rawContent } = req.body;

    const resume = await Resume.findOneAndUpdate(
        { _id: req.params.id, userId: req.user!.id },
        { title, targetRole, sections, rawContent },
        { new: true, runValidators: true }
    );

    if(!resume){
        throw new AppError('Resume not found', 404);
    }

    res.status(200).json({
        success: true,
        data: resume,
    });
};

// DELETE /api/resumes/:id
export const deleteResume = async (req: Request, res: Response): Promise<void> => {
    const job = await Resume.findOneAndDelete({
        _id: req.params.id,
        userId: req.user!.id,
    });

    if(!job){
        throw new AppError('Resume not found', 404);
    }

    res.status(200).json({
        success: true,
        data: null,
        message: 'Resume deleted successfully',
    })
};
