import mongoose, { Schema, Types } from 'mongoose';

export interface IJobDescription {
    userId: Types.ObjectId;
    company: string;
    role: string;
    description: string;
    keywordsExtracted: string[];
    url: string;
    createdAt: Date;
    updatedAt: Date;
}

const jobDescriptionSchema = new Schema<IJobDescription> (
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User ID is required'],
            index: true,
        },
        company: {
            type: String,
            trim: true,
            default: '',
        },
        role: {
            type: String,
            required: [true, 'Job role is required'],
            trime: true,
        },
        description: {
            type: String,
            required: [true, 'Job descripition is required'],
        },
        keywordsExtracted: {
            type: [String],
            default: [],
        },
        url: {
            type: String,
            trim: true,
            default: '',
        },
    },
    {
        timestamps: true,
    }
);

export const JobDescription = mongoose.model<IJobDescription>('JobDescription', jobDescriptionSchema);