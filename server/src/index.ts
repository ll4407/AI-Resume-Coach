import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import resumeRouter from './routes/resumes.js';
import jobRouter from './routes/jobs.js';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware Stack ---

// Security headers (XSS protection, content-type sniffing prevention, etc.)
app.use(helmet());

// CORS - allows the React frontend (different port) to call this API
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// Parse JSON request bodies 
app.use(express.json({ limit: '10mb'}));

// Parse URL-encoded form data
app.use(express.urlencoded({ extended: true}));

// HTTP request logging (shows method, URL, status, response time in terminal)
app.use(morgan('dev'));

// --- Routes ---
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/resumes', resumeRouter);
app.use('/api/jobs', jobRouter);

// --- Error Handling (must be LAST middleware) ---
app.use(errorHandler);

// --- Start Server ---
const startServer = async (): Promise<void> => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1)
    }
};

startServer();