 import mongoose from 'mongoose';

 export const connectDB = async (): Promise<void> => {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
        throw new Error('MONGODB_URI is not defined in the environment variables')
    }

    try {
        const conn = await mongoose.connect(mongoURI);
        console.log(`MongoDB connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
 }
