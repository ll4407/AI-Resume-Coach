# Phase 4: Resume & Job Description CRUD API

## What We're Building

Full CRUD (Create, Read, Update, Delete) endpoints for:
- **Resumes** — users can save multiple resumes, each with structured sections
- **Job Descriptions** — users can save job postings they're targeting

All routes are:
- Protected behind JWT auth (must be logged in)
- Scoped to the authenticated user (you can only access your own data)

---

## Why This Matters

This is the data layer that everything else builds on. The AI analysis (Phase 7) needs resumes and job descriptions to compare. Hiring managers look for:
- Proper REST conventions (correct HTTP methods and status codes)
- Authorization scoping (not just authentication — can user X access resource Y?)
- Clean separation: routes → controllers → models
- Pagination on list endpoints (shows you think about scale)

---

## Prerequisites

- Phase 3 complete (auth working, `protect` middleware available)
- Your models (`Resume.ts`, `JobDescription.ts`) already exist from Phase 2

---

## API Endpoints Overview

### Resumes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/resumes` | Create a new resume |
| GET | `/api/resumes` | List all user's resumes (paginated) |
| GET | `/api/resumes/:id` | Get a single resume |
| PUT | `/api/resumes/:id` | Update a resume |
| DELETE | `/api/resumes/:id` | Delete a resume |

### Job Descriptions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/jobs` | Save a new job description |
| GET | `/api/jobs` | List all user's saved jobs (paginated) |
| GET | `/api/jobs/:id` | Get a single job description |
| PUT | `/api/jobs/:id` | Update a job description |
| DELETE | `/api/jobs/:id` | Delete a job description |

---

## Step 1: Resume Validation Rules

Add these to your `src/middleware/validate.ts` file (append after the existing validation arrays):

```typescript
// Validation rules for creating a resume
export const createResumeValidation: ValidationChain[] = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title is required and cannot exceed 200 characters'),
  body('targetRole')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Target role cannot exceed 200 characters'),
  body('sections')
    .optional()
    .isArray()
    .withMessage('Sections must be an array'),
  body('sections.*.title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Section title is required'),
  body('sections.*.content')
    .optional()
    .notEmpty()
    .withMessage('Section content is required'),
  body('sections.*.order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Section order must be a non-negative integer'),
  body('rawContent')
    .optional()
    .isString()
    .withMessage('Raw content must be a string'),
];

// Validation rules for updating a resume (all fields optional)
export const updateResumeValidation: ValidationChain[] = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('targetRole')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Target role cannot exceed 200 characters'),
  body('sections')
    .optional()
    .isArray()
    .withMessage('Sections must be an array'),
  body('sections.*.title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Section title is required'),
  body('sections.*.content')
    .optional()
    .notEmpty()
    .withMessage('Section content is required'),
  body('sections.*.order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Section order must be a non-negative integer'),
  body('rawContent')
    .optional()
    .isString()
    .withMessage('Raw content must be a string'),
];
```


### What's happening:

- **`body('sections.*.title')`** — The `.*` syntax validates each element in the array. So if `sections` has 5 items, each one's `title` is validated.
- **`.optional()`** — Field can be omitted entirely. But if provided, it must pass the remaining rules.
- **Create vs Update** — Create requires `title`. Update makes everything optional (partial updates).

---

## Step 2: Job Description Validation Rules

Also append these to `src/middleware/validate.ts`:

```typescript
// Validation rules for creating a job description
export const createJobValidation: ValidationChain[] = [
  body('role')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Job role is required and cannot exceed 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Job description text is required'),
  body('company')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Company name cannot exceed 200 characters'),
  body('url')
    .optional()
    .trim()
    .isURL()
    .withMessage('URL must be a valid URL'),
  body('keywordsExtracted')
    .optional()
    .isArray()
    .withMessage('Keywords must be an array'),
  body('keywordsExtracted.*')
    .optional()
    .isString()
    .withMessage('Each keyword must be a string'),
];

// Validation rules for updating a job description
export const updateJobValidation: ValidationChain[] = [
  body('role')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Job role cannot exceed 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Job description cannot be empty'),
  body('company')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Company name cannot exceed 200 characters'),
  body('url')
    .optional()
    .trim()
    .isURL()
    .withMessage('URL must be a valid URL'),
  body('keywordsExtracted')
    .optional()
    .isArray()
    .withMessage('Keywords must be an array'),
  body('keywordsExtracted.*')
    .optional()
    .isString()
    .withMessage('Each keyword must be a string'),
];
```

---

## Step 3: Resume Controller — `src/controllers/resumeController.ts`

Create `server/src/controllers/resumeController.ts`:

```typescript
import { Request, Response } from 'express';
import { Resume } from '../models/Resume.js';
import { AppError } from '../utils/AppError.js';

// POST /api/resumes
export const createResume = async (req: Request, res: Response): Promise<void> => {
  const { title, targetRole, sections, rawContent } = req.body;

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
  });
};

// GET /api/resumes
export const getResumes = async (req: Request, res: Response): Promise<void> => {
  // Pagination from query params (defaults: page 1, 10 per page)
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
  const skip = (page - 1) * limit;

  const [resumes, total] = await Promise.all([
    Resume.find({ userId: req.user!.id })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-rawContent'), // Exclude rawContent from list (it can be large)
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
    userId: req.user!.id,
  });

  if (!resume) {
    throw new AppError('Resume not found', 404);
  }

  res.status(200).json({
    success: true,
    data: resume,
  });
};

// PUT /api/resumes/:id
export const updateResume = async (req: Request, res: Response): Promise<void> => {
  const { title, targetRole, sections, rawContent } = req.body;

  const resume = await Resume.findOneAndUpdate(
    { _id: req.params.id, userId: req.user!.id },
    { title, targetRole, sections, rawContent },
    { new: true, runValidators: true }
  );

  if (!resume) {
    throw new AppError('Resume not found', 404);
  }

  res.status(200).json({
    success: true,
    data: resume,
  });
};

// DELETE /api/resumes/:id
export const deleteResume = async (req: Request, res: Response): Promise<void> => {
  const resume = await Resume.findOneAndDelete({
    _id: req.params.id,
    userId: req.user!.id,
  });

  if (!resume) {
    throw new AppError('Resume not found', 404);
  }

  res.status(200).json({
    success: true,
    data: null,
    message: 'Resume deleted successfully',
  });
};
```


### What's happening:

**createResume:**
- `req.user!.id` comes from the `protect` middleware (set in Phase 3). The `!` tells TypeScript "I know this exists" since the route is protected.
- Returns 201 (Created) — the correct status for a new resource.

**getResumes (list with pagination):**
- `Promise.all([...])` — Runs the query and count in parallel. Faster than running them sequentially.
- `.sort({ updatedAt: -1 })` — Most recently edited resumes first.
- `.select('-rawContent')` — Excludes the potentially large `rawContent` field from list results. Saves bandwidth. The full content loads when you fetch a single resume.
- `Math.min(50, ...)` — Caps the page size at 50 to prevent abuse.
- Returns pagination metadata so the frontend can render page numbers.

**getResume (single):**
- Queries by BOTH `_id` and `userId`. This is the authorization scoping — even if you guess another user's resume ID, you get 404 (not someone else's data).
- Returns 404 for both "doesn't exist" and "belongs to another user" — don't reveal that the resource exists to unauthorized users.

**updateResume:**
- `findOneAndUpdate` with `{ new: true }` — Returns the updated document (not the old one).
- `runValidators: true` — Ensures Mongoose schema validation runs on updates too (by default, Mongoose only validates on `.create()`).

**deleteResume:**
- `findOneAndDelete` — Finds and deletes in a single atomic operation.
- Returns 200 with `data: null` — The resource is gone. Some APIs return 204 (No Content) instead, but 200 with a message is more informative for debugging.

---

## Step 4: Job Description Controller — `src/controllers/jobController.ts`

Create `server/src/controllers/jobController.ts`:

```typescript
import { Request, Response } from 'express';
import { JobDescription } from '../models/JobDescription.js';
import { AppError } from '../utils/AppError.js';

// POST /api/jobs
export const createJob = async (req: Request, res: Response): Promise<void> => {
  const { company, role, description, url, keywordsExtracted } = req.body;

  const job = await JobDescription.create({
    userId: req.user!.id,
    company,
    role,
    description,
    url: url || '',
    keywordsExtracted: keywordsExtracted || [],
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

  const [jobs, total] = await Promise.all([
    JobDescription.find({ userId: req.user!.id })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-description'), // Exclude full description from list
    JobDescription.countDocuments({ userId: req.user!.id }),
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

  if (!job) {
    throw new AppError('Job description not found', 404);
  }

  res.status(200).json({
    success: true,
    data: job,
  });
};

// PUT /api/jobs/:id
export const updateJob = async (req: Request, res: Response): Promise<void> => {
  const { company, role, description, url, keywordsExtracted } = req.body;

  const job = await JobDescription.findOneAndUpdate(
    { _id: req.params.id, userId: req.user!.id },
    { company, role, description, url, keywordsExtracted },
    { new: true, runValidators: true }
  );

  if (!job) {
    throw new AppError('Job description not found', 404);
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
    userId: req.user!.id,
  });

  if (!job) {
    throw new AppError('Job description not found', 404);
  }

  res.status(200).json({
    success: true,
    data: null,
    message: 'Job description deleted successfully',
  });
};
```

### What's happening:

Same patterns as the resume controller. Key difference:
- `.select('-description')` on the list endpoint — job descriptions can be very long (full JD text). Only load it when fetching a single job.
- `keywordsExtracted` starts as an empty array. In Phase 7 (AI integration), the AI will populate this after analyzing the JD.

---

## Step 5: Resume Routes — `src/routes/resumes.ts`

Create `server/src/routes/resumes.ts`:

```typescript
import { Router } from 'express';
import {
  createResume,
  getResumes,
  getResume,
  updateResume,
  deleteResume,
} from '../controllers/resumeController.js';
import { protect } from '../middleware/auth.js';
import {
  createResumeValidation,
  updateResumeValidation,
  handleValidationErrors,
} from '../middleware/validate.js';

const router = Router();

// All resume routes require authentication
router.use(protect);

// POST /api/resumes
router.post('/', createResumeValidation, handleValidationErrors, createResume);

// GET /api/resumes
router.get('/', getResumes);

// GET /api/resumes/:id
router.get('/:id', getResume);

// PUT /api/resumes/:id
router.put('/:id', updateResumeValidation, handleValidationErrors, updateResume);

// DELETE /api/resumes/:id
router.delete('/:id', deleteResume);

export default router;
```

### What's happening:

- **`router.use(protect)`** — Applies the auth middleware to ALL routes in this router. No need to repeat `protect` on every individual route.
- Validation only on POST and PUT (the ones that accept a body). GET and DELETE don't need body validation.
- No rate limiter here — the general API limiter (from Phase 3) can be applied globally later if needed.

---

## Step 6: Job Description Routes — `src/routes/jobs.ts`

Create `server/src/routes/jobs.ts`:

```typescript
import { Router } from 'express';
import {
  createJob,
  getJobs,
  getJob,
  updateJob,
  deleteJob,
} from '../controllers/jobController.js';
import { protect } from '../middleware/auth.js';
import {
  createJobValidation,
  updateJobValidation,
  handleValidationErrors,
} from '../middleware/validate.js';

const router = Router();

// All job routes require authentication
router.use(protect);

// POST /api/jobs
router.post('/', createJobValidation, handleValidationErrors, createJob);

// GET /api/jobs
router.get('/', getJobs);

// GET /api/jobs/:id
router.get('/:id', getJob);

// PUT /api/jobs/:id
router.put('/:id', updateJobValidation, handleValidationErrors, updateJob);

// DELETE /api/jobs/:id
router.delete('/:id', deleteJob);

export default router;
```

---

## Step 7: Register Routes in `src/index.ts`

Update your `server/src/index.ts` to add the new routes. Add these imports at the top:

```typescript
import resumeRouter from './routes/resumes.js';
import jobRouter from './routes/jobs.js';
```

Then add the routes in the `// --- Routes ---` section:

```typescript
// --- Routes ---
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/resumes', resumeRouter);
app.use('/api/jobs', jobRouter);
```

Your full `src/index.ts` should now look like:

```typescript
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
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));

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
    process.exit(1);
  }
};

startServer();
```

---

## Step 8: Fix the Typo in JobDescription Model

Your `JobDescription.ts` has a typo — `trime: true` should be `trim: true`. Fix this line in `server/src/models/JobDescription.ts`:

```typescript
// Change this:
trime: true,

// To this:
trim: true,
```

---

## Step 9: Test It

Start your server:

```cmd
cd server
npm run dev
```

You'll need an access token for all these requests. First log in to get one:

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"test@example.com","password":"Password123"}'
$token = $response.data.accessToken
```

### Test Create Resume

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/resumes" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body '{"title":"My Software Engineer Resume","targetRole":"Senior Frontend Engineer","sections":[{"title":"Summary","content":"Experienced frontend developer with 5 years of React expertise.","order":0},{"title":"Experience","content":"Built scalable web apps at Company X.","order":1}]}'
```

Expected: 201 with the full resume object including an `_id`.

### Test List Resumes

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/resumes" -Method GET -Headers @{Authorization="Bearer $token"}
```

Expected: 200 with `data` array and `pagination` object.

### Test Get Single Resume

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/resumes/RESUME_ID_HERE" -Method GET -Headers @{Authorization="Bearer $token"}
```

### Test Update Resume

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/resumes/RESUME_ID_HERE" -Method PUT -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body '{"title":"Updated Resume Title"}'
```

### Test Delete Resume

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/resumes/RESUME_ID_HERE" -Method DELETE -Headers @{Authorization="Bearer $token"}
```

### Test Create Job Description

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/jobs" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body '{"role":"Senior Frontend Engineer","company":"Google","description":"We are looking for a Senior Frontend Engineer with 5+ years of experience in React, TypeScript, and modern web technologies. You will lead the development of our flagship product UI.","url":"https://careers.google.com/jobs/123"}'
```

### Test Without Auth (should fail)

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/resumes" -Method GET
```

Expected: 401 "Not authorized — no token provided"

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| 401 on all requests | Make sure you're passing the token: `Authorization: Bearer <token>` |
| "Cast to ObjectId failed" on GET /:id | The ID in the URL isn't a valid MongoDB ObjectId format |
| Validation errors on create | Check that required fields (`title` for resume, `role`+`description` for job) are in the body |
| 404 on a resource you just created | Double-check the ID. Also make sure you're logged in as the same user who created it |
| "Cannot find module" | Make sure all import paths end with `.js` |
| Updates not applying | Ensure `runValidators: true` is set and the field names in the body match the schema |

---

## Step 10: Commit

```cmd
git add .
git commit -m "Phase 4: Resume and Job Description CRUD with pagination and validation"
```

---

## Phase 4 Checklist

- [ ] `src/middleware/validate.ts` — Added resume and job validation rules
- [ ] `src/controllers/resumeController.ts` — Full CRUD for resumes
- [ ] `src/controllers/jobController.ts` — Full CRUD for job descriptions
- [ ] `src/routes/resumes.ts` — Resume route definitions
- [ ] `src/routes/jobs.ts` — Job description route definitions
- [ ] `src/index.ts` — Updated with resume and job routes
- [ ] `src/models/JobDescription.ts` — Fixed `trime` → `trim` typo
- [ ] Create resume works (201 response)
- [ ] List resumes works with pagination
- [ ] Get single resume includes full content
- [ ] Update resume works (partial updates allowed)
- [ ] Delete resume works
- [ ] Same operations work for job descriptions
- [ ] All endpoints return 401 without a token
- [ ] Can't access another user's data (scoped by userId)
- [ ] Git commit made

---

## File Structure After Phase 4

```
server/src/
├── config/
│   └── db.ts
├── controllers/
│   ├── authController.ts
│   ├── resumeController.ts   ← NEW
│   └── jobController.ts      ← NEW
├── middleware/
│   ├── auth.ts
│   ├── errorHandler.ts
│   ├── rateLimiter.ts
│   └── validate.ts           ← UPDATED (added CRUD validation rules)
├── models/
│   ├── User.ts
│   ├── Resume.ts
│   └── JobDescription.ts     ← UPDATED (fixed typo)
├── routes/
│   ├── auth.ts
│   ├── health.ts
│   ├── resumes.ts            ← NEW
│   └── jobs.ts               ← NEW
├── services/
├── utils/
│   ├── AppError.ts
│   └── tokens.ts
└── index.ts                  ← UPDATED (added new routes)
```

---

## Key Concepts Recap

| Concept | What It Means |
|---------|---------------|
| CRUD | Create, Read, Update, Delete — the four basic data operations |
| Authorization Scoping | Filtering queries by `userId` so users only see their own data |
| Pagination | Returning data in pages (limit/offset) instead of all at once |
| `findOneAndUpdate` | Atomic operation — finds and updates in one database call (no race conditions) |
| `{ new: true }` | Returns the updated document, not the original pre-update version |
| `runValidators: true` | Forces Mongoose to validate data on updates (not just creates) |
| `.select('-field')` | Excludes a field from query results (saves bandwidth) |
| `router.use(middleware)` | Applies middleware to all routes in this router file |

---

## What's Next: Phase 5

In Phase 5 we'll build the frontend foundation:
- React app with TypeScript and TailwindCSS
- React Router with protected route wrapper
- Auth pages (Login, Register)
- Layout (Navbar, Sidebar, Main content area)
- Auth context for JWT management
- Fetch wrapper with token refresh logic

Once all your CRUD endpoints are working, let me know and we'll move on.
