  import mongoose, { Schema, Types } from 'mongoose';

  export interface IResumeSection {
    title: string;
    content: string;
    order: number;
  }

  export interface IResume {
    userId: Types.ObjectId;
    title: string;
    targetRole: string;
    sections: IResumeSection[];
    rawContent: string;
    createdAt: Date;
    updatedAt: Date;
  }

  const resumeSectionSchema = new Schema<IResumeSection> (
    {
        title: {
            type: String,
            required: [true, 'Section title is required'],
            trim: true,
        },
        content: {
            type: String,
            required: [true, 'Section content is required'],
        },
        order: {
            type: Number,
            default: 0,
        },
    },
    { _id: false } // Subdocuments don't need their own IDs
);

const resumeSchema = new Schema<IResume>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User ID is required'],
            index: true,
        },
        title: {
            type: String,
            required: [true, 'Resume title is required'],
            trim: true,
            maxlength: [200, 'Title cannot exceed 200 characters'],
        },
        targetRole: {
            type: String,
            trim: true,
            default: '',
        },
        sections: [resumeSectionSchema],
        rawContent: {
            type: String,
            default: '',
        },
    },
    {
        timestamps: true,
    }
);

export const Resume = mongoose.model<IResume>('Resume', resumeSchema);