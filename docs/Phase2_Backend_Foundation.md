# Phase 2: Backend Foundation

## What We're Building

The Express server with:
- Middleware stack (CORS, security headers, logging, error handling)
- MongoDB connection via Mongoose
- Three data models: User, Resume, JobDescription
- A health check endpoint to verify everything works

By the end of this phase, you'll have a running server that connects to MongoDB and responds to requests.

---

## Why This Matters

This is the backbone of your entire app. Every feature (auth, AI analysis, GitHub integration) builds on top of this foundation. Hiring managers look for:
- Clean middleware setup (shows you understand how Express processes requests)
- Proper error handling (not just `console.log` and hope)
- Well-structured Mongoose models with validation

---

## Prerequisites

- Phase 1 complete
- MongoDB installed locally **OR** a free MongoDB Atlas cluster (cloud). Atlas is easier — no local install needed.

### Setting up MongoDB Atlas (free tier)

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) and create a free account
2. Create a free cluster (M0 tier — permanently free)
3. Under "Database Access" — create a database user with a password
4. Under "Network Access" — add your IP address (or `0.0.0.0/0` for development)
5. Click "Connect" → "Drivers" → copy the connection string
6. Paste it into your `server/.env` file as `MONGODB_URI`

Your connection string will look like:
```
mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/resume-coach?retryWrites=true&w=majority
```

---

## Step 1: Create the Server Folder Structure

Inside `server/`, create these folders and files:

```
server/src/
├── config/
│   └── db.ts              # MongoDB connection logic
├── controllers/           # (empty for now, used in Phase 3+)
├── middleware/
│   └── errorHandler.ts    # Global error handling middleware
├── models/
│   ├── User.ts
│   ├── Resume.ts
│   └── JobDescription.ts
├── routes/
│   └── health.ts          # Health check route
├── services/              # (empty for now, used in Phase 7+)
├── utils/                 # (empty for now)
└── index.ts               # Server entry point
```

Create the folders from your `server/` directory:

```cmd
mkdir src
mkdir src\config
mkdir src\controllers
mkdir src\middleware
mkdir src\models
mkdir src\routes
mkdir src\services
mkdir src\utils
```

---

## Step 2: Server Entry Point — `src/index.ts`

This is where your server starts. Create `server/src/index.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import healthRouter from './routes/health.js';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware Stack ---

// Security headers (XSS protection, content-type sniffing prevention, etc.)
app.use(helmet());

// CORS — allows your React frontend (different port) to call this API
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// Parse JSON request bodies (so you can read req.body)
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// HTTP request logging (shows method, URL, status, response time in terminal)
app.use(morgan('dev'));

// --- Routes ---
app.use('/api/health', healthRouter);

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
    process.exit(1);
  }
};

startServer();
```

### What's happening here (line by line):

1. **Imports** — Pull in all our middleware libraries and local modules
2. **`dotenv.config()`** — Reads your `.env` file and makes variables available as `process.env.VARIABLE_NAME`
3. **`express()`** — Creates the app instance (the core object everything attaches to)
4. **Middleware stack** — Each `app.use()` adds a function that runs on EVERY incoming request, in order:
   - `helmet()` → adds security headers
   - `cors()` → allows cross-origin requests from your frontend
   - `express.json()` → parses JSON bodies so `req.body` works
   - `morgan('dev')` → logs requests to your terminal
5. **Routes** — Maps URL paths to handler functions
6. **Error handler** — Catches any errors thrown by routes (must be last)
7. **`startServer()`** — Connects to MongoDB first, then starts listening for HTTP requests

### Why `async/await` for starting?

The MongoDB connection is asynchronous (it talks to a remote server). We want to make sure the database is connected *before* we start accepting requests. If the DB fails to connect, we exit immediately rather than serving broken responses.

---

## Step 3: Database Connection — `src/config/db.ts`

Create `server/src/config/db.ts`:

```typescript
import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  try {
    const conn = await mongoose.connect(mongoURI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};
```

### What's happening:

- **`mongoose.connect()`** — Opens a connection to your MongoDB database. Returns a promise that resolves when connected.
- **`process.exit(1)`** — If the database can't connect, kill the server. No point running without a database. Exit code `1` means "exited with error" (vs `0` which means "exited cleanly").
- **Guard clause** — If someone forgot to set `MONGODB_URI` in `.env`, throw a clear error instead of a cryptic undefined error later.

### What is Mongoose?

Mongoose is an **ODM (Object Document Mapper)** for MongoDB. It lets you:
- Define schemas (what shape your data should have)
- Validate data before saving
- Query the database with JavaScript methods instead of raw queries

It's similar to how Entity Framework works in C# or SQLAlchemy in Python — an abstraction layer over the raw database.

---

## Step 4: Error Handling Middleware — `src/middleware/errorHandler.ts`

Create `server/src/middleware/errorHandler.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';

interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal Server Error';

  // Log the full error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      statusCode,
    });
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
```

### What's happening:

- **Error middleware signature** — Express knows this is an error handler because it has 4 parameters (`err, req, res, next`). Regular middleware only has 3.
- **`statusCode`** — If the error has a status code (like 404 or 401), use it. Otherwise default to 500 (generic server error).
- **`isOperational`** — A pattern to distinguish between "expected" errors (user sent bad data) and "unexpected" errors (your code crashed). You don't want to leak internal error details to users in production.
- **Stack trace in dev only** — In development, the full stack trace helps you debug. In production, it's a security risk (reveals file paths and internal structure).

### Why a global error handler?

Without this, unhandled errors would crash your server or send ugly HTML error pages. This ensures every error returns consistent JSON that your frontend can parse.

---

## Step 5: Health Check Route — `src/routes/health.ts`

Create `server/src/routes/health.ts`:

```typescript
import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  };

  res.status(200).json(healthCheck);
});

export default router;
```

### What's this for?

A health check endpoint lets you quickly verify:
- Is the server running?
- Is the database connected?
- How long has it been up?

Deployment platforms (Render, AWS, etc.) ping this endpoint to know if your app is alive. If it stops responding, they restart it automatically.

`mongoose.connection.readyState === 1` means "connected." Other values: 0 = disconnected, 2 = connecting, 3 = disconnecting.

---

## Step 6: User Model — `src/models/User.ts`

Create `server/src/models/User.ts`:

```typescript
import mongoose, { Schema } from 'mongoose';

// Plain interface — no need to extend Document (modern Mongoose 6+ pattern)
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
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

export const User = mongoose.model<IUser>('User', userSchema);
```

### What's happening:

- **`IUser` interface** — A plain TypeScript interface (not extending `Document`). Modern Mongoose (6+) infers all document methods (`save()`, `_id`, etc.) automatically when you pass the interface as a generic to the Schema and model. Extending `Document` is the legacy pattern and can cause type conflicts.
- **`Schema<IUser>`** — Passing the interface as a generic gives you full type safety on the schema definition.
- **`required: [true, 'message']`** — Validation with custom error messages.
- **`unique: true`** — MongoDB creates an index that prevents duplicate emails.
- **`select: false`** on password — When you query users (`User.find()`), the password field is excluded by default. You have to explicitly ask for it with `.select('+password')`. This prevents accidentally sending password hashes to the frontend.
- **`timestamps: true`** — Mongoose automatically manages `createdAt` and `updatedAt` fields. No need to set them manually.
- **`trim: true`** — Removes whitespace from the beginning/end of strings before saving.

### MongoDB vs SQL mental model:

| SQL | MongoDB/Mongoose |
|-----|-----------------|
| Table | Collection |
| Row | Document |
| Column | Field |
| Schema (CREATE TABLE) | Mongoose Schema |
| Foreign Key | ObjectId reference |

---

## Step 7: Resume Model — `src/models/Resume.ts`

Create `server/src/models/Resume.ts`:

```typescript
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

const resumeSectionSchema = new Schema<IResumeSection>(
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
```

### What's happening:

- **`userId` with `ref: 'User'`** — This is a reference (like a foreign key). It stores the ObjectId of the user who owns this resume. The `ref` tells Mongoose which model it points to, enabling `.populate()` later (auto-fetches the full user object).
- **`index: true`** — Creates a database index on `userId`. Since you'll query "get all resumes for user X" constantly, this makes that query fast.
- **`sections` array** — A resume has multiple sections (Summary, Experience, Skills, Education). Each is a subdocument with its own schema.
- **`{ _id: false }`** — Subdocuments in the sections array don't need their own unique IDs. Saves space.
- **`rawContent`** — The full resume as plain text (useful for sending to the AI for analysis).

### Subdocuments vs References:

- **Subdocuments** (sections inside resume) — Used when the child data always belongs to the parent and is always loaded together. You'd never query a section without its resume.
- **References** (userId pointing to User) — Used when the related data is independent and might be queried on its own.

---

## Step 8: Job Description Model — `src/models/JobDescription.ts`

Create `server/src/models/JobDescription.ts`:

```typescript
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

const jobDescriptionSchema = new Schema<IJobDescription>(
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
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Job description text is required'],
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
```

### What's happening:

- **`keywordsExtracted: [String]`** — An array of strings. After the AI analyzes a job description, it extracts keywords like `["React", "TypeScript", "CI/CD", "AWS"]` and stores them here.
- **`url`** — Optional field to save the original job posting link.
- Same `userId` + `index` pattern as Resume — you always query job descriptions per user.

---

## Step 9: Update Your .env File

Make sure `server/.env` has your MongoDB connection string:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/resume-coach?retryWrites=true&w=majority
JWT_SECRET=change-this-to-a-random-string
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=change-this-to-another-random-string
JWT_REFRESH_EXPIRES_IN=30d
OPENAI_API_KEY=your-openai-api-key
CLIENT_URL=http://localhost:5173
```

Replace the MongoDB URI with your actual Atlas connection string (or `mongodb://localhost:27017/resume-coach` if running MongoDB locally).

---

## Step 10: Test It

From the `server/` directory, run:

```cmd
npm run dev
```

You should see:
```
Server running on port 5000 in development mode
MongoDB connected: cluster0-shard-00-xx.xxxxx.mongodb.net
```

Then open your browser or use curl:
```
http://localhost:5000/api/health
```

You should get back JSON like:
```json
{
  "status": "ok",
  "timestamp": "2026-08-01T...",
  "uptime": 3.456,
  "environment": "development",
  "database": "connected"
}
```

### Troubleshooting:

| Problem | Fix |
|---------|-----|
| "Cannot find module" errors | Make sure all imports end with `.js` (even for `.ts` files) |
| MongoDB connection timeout | Check your Atlas Network Access allows your IP |
| "MONGODB_URI is not defined" | Make sure `.env` exists in `server/` and `dotenv.config()` runs first |
| Port already in use | Change `PORT` in `.env` or kill the process using port 5000 |

---

## Step 11: Commit

```cmd
git add .
git commit -m "Phase 2: Express server with MongoDB connection, User/Resume/JobDescription models, and health check endpoint"
```

---

## Phase 2 Checklist

- [ ] `server/src/index.ts` — Express app with middleware stack
- [ ] `server/src/config/db.ts` — MongoDB connection function
- [ ] `server/src/middleware/errorHandler.ts` — Global error handler
- [ ] `server/src/models/User.ts` — User model with email/password/name
- [ ] `server/src/models/Resume.ts` — Resume model with sections
- [ ] `server/src/models/JobDescription.ts` — Job description model
- [ ] `server/src/routes/health.ts` — Health check returning JSON
- [ ] `npm run dev` starts without errors
- [ ] `/api/health` returns `{ "status": "ok", "database": "connected" }`
- [ ] Git commit made

---

## Key Concepts Recap

| Concept | What It Means |
|---------|---------------|
| Middleware | Functions that process requests before they hit your routes. They run in order. |
| Schema | The blueprint for what a document looks like in MongoDB (fields, types, validation). |
| Model | A JavaScript class built from a schema. You use it to create, read, update, delete documents. |
| ODM | Object Document Mapper — translates between JS objects and MongoDB documents (Mongoose). |
| Index | A database optimization that makes queries on a specific field fast (like a book's index). |
| Subdocument | A schema nested inside another schema (sections inside a resume). |
| Reference | A field that stores the ID of a document in another collection (userId → User). |

---

## What's Next: Phase 3

In Phase 3 we'll build authentication:
- User registration (signup) with password hashing
- User login returning JWT tokens
- Auth middleware that protects routes
- Rate limiting on auth endpoints

Once your health check is returning "connected," let me know and we'll move on.
