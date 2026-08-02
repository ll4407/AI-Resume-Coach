# Phase 3: Authentication

## What We're Building

A complete auth system with:
- User registration with password hashing (bcrypt)
- User login returning JWT access token + refresh token
- Auth middleware that protects routes
- Refresh token rotation (issue new refresh token on each use)
- Rate limiting on auth endpoints
- Input validation using express-validator

By the end of this phase, you'll be able to register users, log them in, and protect any route behind authentication.

---

## Why This Matters

Authentication is the first thing senior engineers scrutinize in a portfolio project. They're checking:
- Do you hash passwords properly? (not storing plain text)
- Do you use short-lived access tokens? (not 30-day JWTs)
- Do you validate input on the server? (not trusting the client)
- Do you handle errors gracefully? (not leaking info about whether an email exists)

---

## Prerequisites

- Phase 2 complete (server running, MongoDB connected)
- `express-rate-limit` installed (already done)
- `bcryptjs`, `jsonwebtoken`, `express-validator` installed (already in your package.json)

---

## Architecture Overview

```
Client sends email + password
        │
        ▼
┌─────────────────────┐
│  Rate Limiter        │  ← Blocks after too many attempts
├─────────────────────┤
│  Input Validation    │  ← Rejects malformed requests
├─────────────────────┤
│  Auth Controller     │  ← Business logic (hash, compare, sign tokens)
├─────────────────────┤
│  MongoDB (User)      │  ← Stores user with hashed password
└─────────────────────┘
        │
        ▼
Client receives: { accessToken (15min), refreshToken (7d) }
```

### Token Strategy

| Token | Lifetime | Purpose |
|-------|----------|---------|
| Access Token | 15 minutes | Sent with every API request in `Authorization` header |
| Refresh Token | 7 days | Used only to get a new access token when the old one expires |

Why two tokens? If someone steals an access token, it's only valid for 15 minutes. The refresh token is stored more securely and only sent to one endpoint (`/api/auth/refresh`).

---

## Step 1: Install the Rate Limiter

From `server/`:

```cmd
npm install express-rate-limit
```

This is already done if you followed along, but verify it's in your `package.json` under `dependencies`.

---

## Step 2: Create the Auth Utilities — `src/utils/tokens.ts`

This file handles JWT creation and verification. Separating it from the controller keeps things testable and reusable.

Create `server/src/utils/tokens.ts`:

```typescript
import jwt from 'jsonwebtoken';

interface TokenPayload {
  userId: string;
}

export const generateAccessToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not defined');

  return jwt.sign({ userId }, secret, {
    expiresIn: '15m',
  });
};

export const generateRefreshToken = (userId: string): string => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not defined');

  return jwt.sign({ userId }, secret, {
    expiresIn: '7d',
  });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not defined');

  return jwt.verify(token, secret) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not defined');

  return jwt.verify(token, secret) as TokenPayload;
};
```

### What's happening:

- **Two separate secrets** — Access and refresh tokens use different secrets. If one is compromised, the other still works.
- **Short access token lifetime (15m)** — Limits damage if stolen. The frontend silently refreshes it before expiration.
- **`jwt.sign()`** — Creates a token containing `{ userId }` encrypted with your secret. Anyone with the secret can decode it, but no one can forge it without the secret.
- **`jwt.verify()`** — Decodes a token AND checks it hasn't expired or been tampered with. Throws if invalid.

---

## Step 3: Create a Custom Error Class — `src/utils/AppError.ts`

This gives you clean, consistent errors throughout the app. Much better than throwing raw `Error` objects with manual status codes.

Create `server/src/utils/AppError.ts`:

```typescript
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    // Maintains proper stack trace in V8 (Node.js)
    Error.captureStackTrace(this, this.constructor);
  }
}
```

### What's happening:

- **`isOperational = true`** — Marks this as a "known" error (bad input, not found, unauthorized). Your error handler uses this to decide whether to show the real message or a generic "Internal Server Error."
- **`Error.captureStackTrace`** — Removes the `AppError` constructor itself from the stack trace, so the trace points to where you threw it, not this file.

Usage: `throw new AppError('Invalid credentials', 401);`

---

## Step 4: Auth Middleware — `src/middleware/auth.ts`

This middleware goes on any route that requires a logged-in user. It reads the JWT from the `Authorization` header, verifies it, and attaches the user to the request.

Create `server/src/middleware/auth.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/tokens.js';
import { AppError } from '../utils/AppError.js';
import { User } from '../models/User.js';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
      };
    }
  }
}

export const protect = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  // 1. Get token from Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Not authorized — no token provided', 401);
  }

  const token = authHeader.split(' ')[1];

  // 2. Verify the token
  try {
    const decoded = verifyAccessToken(token);

    // 3. Check if user still exists (they might have been deleted after token was issued)
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new AppError('User no longer exists', 401);
    }

    // 4. Attach user to request object for use in route handlers
    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Not authorized — invalid token', 401);
  }
};
```

### What's happening:

1. **Extract token** — Expects header format: `Authorization: Bearer <token>`
2. **Verify** — Decodes the JWT and checks expiration/signature
3. **User lookup** — Confirms the user hasn't been deleted since the token was issued
4. **Attach to request** — Downstream route handlers can access `req.user.id` to know who's making the request

### Why `declare global`?

Express's `Request` type doesn't have a `user` property by default. This declaration merges our custom property into the global Express types so TypeScript doesn't complain when you write `req.user`.

### Express 5 note:

Express 5 natively catches errors thrown in `async` route handlers and middleware — no need for `express-async-handler` wrappers or try/catch in every route. Just `throw` and the error handler picks it up.

---

## Step 5: Rate Limiting Middleware — `src/middleware/rateLimiter.ts`

Prevents brute-force attacks on login/register endpoints.

Create `server/src/middleware/rateLimiter.ts`:

```typescript
import rateLimit from 'express-rate-limit';

// Strict limiter for auth endpoints (login, register)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // Max 10 requests per window per IP
  message: {
    success: false,
    error: 'Too many attempts. Please try again after 15 minutes.',
  },
  standardHeaders: 'draft-8', // Modern RateLimit headers (draft-8 is latest standard)
  legacyHeaders: false, // Disable X-RateLimit-* headers (deprecated)
});

// General API limiter (less strict)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  message: {
    success: false,
    error: 'Too many requests. Please slow down.',
  },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});
```

### What's happening:

- **`windowMs`** — Time window in milliseconds. After 15 minutes, the counter resets.
- **`limit`** — Max requests allowed in that window. 10 for auth (strict), 100 for general API (lenient).
- **`standardHeaders: 'draft-8'`** — Uses the latest IETF rate limit header standard. Clients can read `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset` headers to know their status.
- **`legacyHeaders: false`** — Disables the old `X-RateLimit-*` headers. No reason to use both.

### Why rate limit auth specifically?

Without it, an attacker can try thousands of passwords per second. With 10 attempts per 15 minutes, brute-force becomes impractical.

---

## Step 6: Validation Middleware — `src/middleware/validate.ts`

Uses `express-validator` to validate and sanitize incoming request bodies.

Create `server/src/middleware/validate.ts`:

```typescript
import { body, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

// Runs after validation chains — checks for errors and returns them
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map((err) => ({
        field: err.type === 'field' ? err.path : undefined,
        message: err.msg,
      })),
    });
    return;
  }

  next();
};

// Validation rules for registration
export const registerValidation: ValidationChain[] = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number'),
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name is required and cannot exceed 100 characters'),
];

// Validation rules for login
export const loginValidation: ValidationChain[] = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// Validation rules for refresh token
export const refreshValidation: ValidationChain[] = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
];
```

### What's happening:

- **`body('field')`** — Targets a specific field in `req.body`
- **Chained validators** — `.isEmail()`, `.isLength()`, `.matches()` run in order
- **`.normalizeEmail()`** — Lowercases and normalizes email (e.g., removes dots from Gmail addresses)
- **`handleValidationErrors`** — A middleware that runs AFTER the validators. If any failed, it returns a 400 with structured error details. If all passed, it calls `next()` to proceed.

### Why validate on the server?

Client-side validation improves UX. Server-side validation is for **security**. A malicious user can bypass your frontend entirely and send raw HTTP requests. The server must never trust input.

---

## Step 7: Auth Controller — `src/controllers/authController.ts`

This contains the actual registration, login, and refresh logic.

Create `server/src/controllers/authController.ts`:

```typescript
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/tokens.js';

// POST /api/auth/register
export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password, name } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('An account with this email already exists', 409);
  }

  // Hash the password
  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create the user
  const user = await User.create({
    email,
    password: hashedPassword,
    name,
  });

  // Generate tokens
  const accessToken = generateAccessToken(user._id.toString());
  const refreshToken = generateRefreshToken(user._id.toString());

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
      accessToken,
      refreshToken,
    },
  });
};

// POST /api/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  // Find user and explicitly include the password field
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    // Generic message — don't reveal whether the email exists
    throw new AppError('Invalid email or password', 401);
  }

  // Compare provided password with stored hash
  const isPasswordCorrect = await bcrypt.compare(password, user.password);

  if (!isPasswordCorrect) {
    throw new AppError('Invalid email or password', 401);
  }

  // Generate tokens
  const accessToken = generateAccessToken(user._id.toString());
  const refreshToken = generateRefreshToken(user._id.toString());

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
      accessToken,
      refreshToken,
    },
  });
};

// POST /api/auth/refresh
export const refresh = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;

  // Verify the refresh token
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  // Check user still exists
  const user = await User.findById(decoded.userId);
  if (!user) {
    throw new AppError('User no longer exists', 401);
  }

  // Token rotation — issue new pair of tokens
  const newAccessToken = generateAccessToken(user._id.toString());
  const newRefreshToken = generateRefreshToken(user._id.toString());

  res.status(200).json({
    success: true,
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    },
  });
};

// GET /api/auth/me
export const getMe = async (req: Request, res: Response): Promise<void> => {
  const user = await User.findById(req.user!.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    },
  });
};
```

### What's happening:

**Register:**
1. Check if email is already taken (return 409 Conflict, not 400)
2. Hash the password with bcrypt (salt rounds = 12, good balance of security vs speed)
3. Save to database
4. Return tokens immediately (user is logged in after registering — no double step)

**Login:**
1. Find user by email, explicitly requesting the password field (`.select('+password')`)
2. Compare the plain-text password against the stored hash using `bcrypt.compare()`
3. Use the SAME error message for "email not found" and "wrong password" — prevents attackers from discovering which emails are registered

**Refresh:**
1. Verify the refresh token's signature and expiration
2. Issue a brand new access + refresh token pair (rotation)
3. The old refresh token is now effectively replaced

**getMe:**
- A protected endpoint that returns the currently authenticated user's info. Used by the frontend to check "am I still logged in?" on page load.

### Why bcrypt salt rounds = 12?

Each increase in rounds doubles the computation time. 10 was the standard for years, but modern hardware is faster. 12 takes ~250ms to hash — fast enough for UX, slow enough to make brute-force impractical.

---

## Step 8: Auth Routes — `src/routes/auth.ts`

Wire up the controller functions to URL paths with validation and rate limiting.

Create `server/src/routes/auth.ts`:

```typescript
import { Router } from 'express';
import { register, login, refresh, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import {
  registerValidation,
  loginValidation,
  refreshValidation,
  handleValidationErrors,
} from '../middleware/validate.js';

const router = Router();

// POST /api/auth/register
router.post(
  '/register',
  authLimiter,
  registerValidation,
  handleValidationErrors,
  register
);

// POST /api/auth/login
router.post(
  '/login',
  authLimiter,
  loginValidation,
  handleValidationErrors,
  login
);

// POST /api/auth/refresh
router.post(
  '/refresh',
  authLimiter,
  refreshValidation,
  handleValidationErrors,
  refresh
);

// GET /api/auth/me (protected)
router.get('/me', protect, getMe);

export default router;
```

### What's happening:

Each route has a middleware chain that runs left to right:
1. **Rate limiter** → blocks if too many requests from this IP
2. **Validation rules** → checks `req.body` fields
3. **handleValidationErrors** → returns 400 if validation failed
4. **Controller function** → actual business logic

The `/me` route uses `protect` instead — it validates the JWT, not the body.

### Middleware order matters:

Rate limiter first means even malformed requests count against the limit. This prevents attackers from flooding your validator with garbage.

---

## Step 9: Register the Auth Routes in `src/index.ts`

Update your `server/src/index.ts` to include the auth routes:

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

The only changes are:
- Added `import authRouter from './routes/auth.js';`
- Added `app.use('/api/auth', authRouter);`

---

## Step 10: Fix the User Model

Your current `User.ts` has an unused import (`createDeflate` from `node:zlib`). Remove it:

```typescript
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
      select: false,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', userSchema);
```

---

## Step 11: Update Your .env

Make sure these are set in `server/.env`:

```env
JWT_SECRET=your-random-string-at-least-32-chars
JWT_REFRESH_SECRET=a-different-random-string-at-least-32-chars
```

To generate random secrets, you can run this in your terminal:

```cmd
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run it twice — one for each secret.

---

## Step 12: Test It

Start your server:

```cmd
cd server
npm run dev
```

### Test Registration

Using PowerShell (or any HTTP client like Postman/Thunder Client):

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method POST -ContentType "application/json" -Body '{"email":"test@example.com","password":"Password123","name":"Test User"}'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "test@example.com", "name": "Test User" },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

### Test Login

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"test@example.com","password":"Password123"}'
```

### Test Protected Route

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/me" -Method GET -Headers @{Authorization="Bearer YOUR_ACCESS_TOKEN_HERE"}
```

### Test Validation (should fail)

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method POST -ContentType "application/json" -Body '{"email":"not-an-email","password":"short","name":""}'
```

Expected: 400 with validation error details.

### Troubleshooting

| Problem | Fix |
|---------|-----|
| "JWT_SECRET is not defined" | Check your `.env` file has the variable set |
| "Cannot find module './utils/tokens.js'" | Make sure file is at `src/utils/tokens.ts` with `.js` in the import |
| 409 on register | You already registered that email — use a different one or clear your DB |
| Empty `req.body` | Make sure you're sending `Content-Type: application/json` |

---

## Step 13: Commit

```cmd
git add .
git commit -m "Phase 3: JWT authentication with register, login, refresh, and protected routes"
```

---

## Phase 3 Checklist

- [ ] `src/utils/AppError.ts` — Custom error class with status codes
- [ ] `src/utils/tokens.ts` — JWT generation and verification helpers
- [ ] `src/middleware/auth.ts` — Protect middleware that verifies tokens
- [ ] `src/middleware/rateLimiter.ts` — Rate limiting for auth and API
- [ ] `src/middleware/validate.ts` — Input validation rules with express-validator
- [ ] `src/controllers/authController.ts` — Register, login, refresh, getMe
- [ ] `src/routes/auth.ts` — Auth route definitions with middleware chains
- [ ] `src/index.ts` — Updated with auth routes
- [ ] `User.ts` — Cleaned up (removed unused import)
- [ ] `.env` has `JWT_SECRET` and `JWT_REFRESH_SECRET` set
- [ ] Registration works and returns tokens
- [ ] Login works with correct credentials
- [ ] Login fails gracefully with wrong credentials
- [ ] `/api/auth/me` works with a valid token
- [ ] `/api/auth/me` returns 401 without a token
- [ ] Rate limiting kicks in after 10 rapid requests
- [ ] Git commit made

---

## File Structure After Phase 3

```
server/src/
├── config/
│   └── db.ts
├── controllers/
│   └── authController.ts    ← NEW
├── middleware/
│   ├── auth.ts              ← NEW
│   ├── errorHandler.ts
│   ├── rateLimiter.ts       ← NEW
│   └── validate.ts          ← NEW
├── models/
│   ├── User.ts              ← UPDATED (removed unused import)
│   ├── Resume.ts
│   └── JobDescription.ts
├── routes/
│   ├── auth.ts              ← NEW
│   └── health.ts
├── services/
├── utils/
│   ├── AppError.ts          ← NEW
│   └── tokens.ts            ← NEW
└── index.ts                 ← UPDATED (added auth routes)
```

---

## Key Concepts Recap

| Concept | What It Means |
|---------|---------------|
| JWT (JSON Web Token) | A signed, encoded string containing a payload (like userId). Can be verified without a database lookup. |
| Access Token | Short-lived JWT sent with every request. Proves "I am logged in." |
| Refresh Token | Longer-lived JWT used only to get a new access token. Stored securely by the client. |
| Token Rotation | Issuing a new refresh token every time one is used. Limits the window if a refresh token is stolen. |
| Bcrypt | A hashing algorithm designed to be slow. Makes brute-force password cracking impractical. |
| Salt | Random data mixed into the hash. Ensures two users with the same password get different hashes. |
| Rate Limiting | Restricting how many requests an IP can make in a time window. Prevents brute-force attacks. |
| Input Validation | Checking that request data meets expected format/rules before processing it. |

---

## What's Next: Phase 4

In Phase 4 we'll build the Resume and Job Description CRUD API:
- Full create/read/update/delete for resumes
- Same for job descriptions
- All routes protected with auth middleware
- Scoped to the authenticated user (you can only see your own data)

Once all your auth endpoints are working, let me know and we'll move on.
