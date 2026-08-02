import mongoose, { Schema } from 'mongoose';

 export interface IUser {
    email: string;
    password: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
 }


 const userSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [8, 'Password must be at least 8 characters'],
            select: false, // Don't include password in queries by default
        },
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            maxlength: [100, 'Name cannot exceed 100 characters']
        },
    },
    {
        timestamps: true, // Automatically adds createdAt and updatedAt
    }
 );

 export const User = mongoose.model<IUser>('User', userSchema);