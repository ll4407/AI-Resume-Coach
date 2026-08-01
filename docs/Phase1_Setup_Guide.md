# Phase 1: Project Setup & Architecture

## What We're Doing

Setting up the project skeleton — folder structure, configuration files, linting, formatting, environment variables, and Git. By the end of this phase you'll have a clean, professional project structure that you can build on top of for every subsequent phase.

## Why This Matters

Hiring managers often look at your repo structure *before* reading your code. A well-organized project with proper configs signals that you know how real teams work. Sloppy setup = red flag.

---

## Prerequisites

Before starting, make sure you have these installed on your machine:

| Tool | Why You Need It | Check If Installed |
|------|----------------|--------------------|
| **Node.js 18+** | Runtime for backend + frontend tooling | `node --version` |
| **npm** (comes with Node) | Package manager | `npm --version` |
| **Git** | Version control | `git --version` |
| **VS Code / Kiro** | Code editor (you're already here) | — |

If you don't have Node.js, download it from [nodejs.org](https://nodejs.org/) (LTS version).

---

## Step 1: Create the Project Structure

We're using a **monorepo** approach — one Git repo with separate `client/` and `server/` folders. This keeps things simple while letting frontend and backend live together.

```
AI_Resume_Coach/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Route-level page components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── context/         # React context providers (auth, etc.)
│   │   ├── services/        # API call functions
│   │   ├── types/           # TypeScript type definitions
│   │   ├── utils/           # Helper functions
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── server/                  # Node.js/Express backend
│   ├── src/
│   │   ├── controllers/     # Route handler logic
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/          # Express route definitions
│   │   ├── middleware/      # Auth, validation, error handling
│   │   ├── services/        # Business logic (AI calls, GitHub API)
│   │   ├── utils/           # Helper functions
│   │   ├── config/          # DB connection, env config
│   │   └── index.ts         # Server entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── .gitignore
├── .eslintrc.json
├── .prettierrc
├── README.md
└── package.json             # Root package.json (for scripts that run both)
```

### Why this structure?

- **`controllers/`** — Keeps route handlers separate from route definitions. Each controller handles one "resource" (users, resumes, AI analysis).
- **`models/`** — One file per database model. Clean separation of your data layer.
- **`middleware/`** — Reusable functions that run before your route logic (auth checks, input validation, error formatting).
- **`services/`** — Business logic that doesn't belong in a controller (calling OpenAI, fetching from GitHub API).
- **`context/` (frontend)** — React Context for global state like authentication. Avoids prop drilling.
- **`types/`** — Shared TypeScript interfaces/types. Keeps your type definitions in one place.

---

## Step 2: Initialize the Root Project

Open a terminal in your `AI_Resume_Coach` folder and run:

```bash
npm init -y
```

**What this does:** Creates a `package.json` at the root. This is the "manifest" file for any Node.js project — it lists your project name, scripts, and dependencies.

---

## Step 3: Initialize the Server

```bash
mkdir server
cd server
npm init -y
```

Then install backend dependencies:

```bash
npm install express mongoose dotenv cors helmet morgan express-validator jsonwebtoken bcryptjs
npm install -D typescript @types/node @types/express @types/cors @types/morgan @types/jsonwebtoken @types/bcryptjs ts-node nodemon
```

### What each package does:

| Package | Purpose |
|---------|---------|
| `express` | Web framework — handles HTTP routes and middleware |
| `mongoose` | MongoDB ODM — lets you define schemas and query the database with JS objects |
| `dotenv` | Loads `.env` file variables into `process.env` |
| `cors` | Allows your frontend (different port/domain) to call your backend |
| `helmet` | Adds security headers to HTTP responses automatically |
| `morgan` | Logs incoming HTTP requests (useful for debugging) |
| `express-validator` | Validates and sanitizes request body/params |
| `jsonwebtoken` | Creates and verifies JWT tokens for authentication |
| `bcryptjs` | Hashes passwords securely (never store plain text passwords) |
| `typescript` | The TypeScript compiler |
| `@types/*` | Type definitions so TypeScript knows the shape of each library |
| `ts-node` | Runs TypeScript files directly without a separate compile step |
| `nodemon` | Auto-restarts your server when you save a file (dev only) |

The `-D` flag means "dev dependency" — tools you only need during development, not in production.

---

## Step 4: Configure TypeScript for the Server

Create `server/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### What these options mean:

- **`target: "ES2020"`** — Compile to modern JavaScript. No need to support ancient browsers on the server.
- **`module: "nodenext"`** — Use Node.js's native ES module system (`import`/`export`). This is the modern standard.
- **`moduleResolution: "nodenext"`** — Tells TypeScript to resolve imports the same way Node.js does with ESM (requires `.js` extensions in imports).
- **`strict: true`** — Enables all strict type checks. Catches bugs early. This is what makes TypeScript worth using.
- **`outDir: "./dist"`** — Compiled JavaScript goes here. You deploy `dist/`, not `src/`.
- **`rootDir: "./src"`** — Your source code lives here.
- **`esModuleInterop: true`** — Lets you use `import express from 'express'` instead of the uglier `import * as express` syntax.
- **`sourceMap: true`** — Maps compiled JS back to your TypeScript files for debugging.

**Note:** With `nodenext`, your `server/package.json` must include `"type": "module"`, and all local imports need `.js` extensions (e.g., `import { router } from './routes/auth.js'`). This looks odd in `.ts` files but is correct — TypeScript compiles `.ts` → `.js`, and Node needs the final extension at runtime.

---

## Step 5: Initialize the Client (Frontend)

Go back to the project root and create the React app using Vite (a fast build tool):

```bash
cd ..
npm create vite@latest client -- --template react-ts
cd client
npm install
```

**Why Vite instead of Create React App (CRA)?**
- CRA is deprecated and slow
- Vite starts in milliseconds, hot-reloads instantly, and is the modern standard
- Most companies have switched to Vite or Next.js

Then install frontend-specific dependencies:

```bash
npm install react-router-dom axios
npm install -D tailwindcss @tailwindcss/vite
```

| Package | Purpose |
|---------|---------|
| `react-router-dom` | Client-side routing (navigate between pages without full reload) |
| `axios` | HTTP client for making API calls to your backend |
| `tailwindcss` | Utility-first CSS framework (style with classes like `bg-blue-500 p-4`) |
| `@tailwindcss/vite` | Vite plugin for TailwindCSS |

---

## Step 6: Configure TailwindCSS

Update `client/vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
})
```

Replace the contents of `client/src/index.css` with:

```css
@import "tailwindcss";
```

**What's happening:** TailwindCSS scans your component files for class names and generates only the CSS you actually use. No bloated stylesheets.

---

## Step 7: Set Up ESLint and Prettier (Root Level)

These enforce consistent code style across the whole project.

From the project root:

```bash
npm install -D eslint prettier eslint-config-prettier eslint-plugin-react eslint-plugin-react-hooks @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

Create `.eslintrc.json` at the project root:

```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint", "react", "react-hooks"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier"
  ],
  "settings": {
    "react": {
      "version": "detect"
    }
  },
  "rules": {
    "react/react-in-jsx-scope": "off",
    "no-console": "warn"
  },
  "ignorePatterns": ["dist", "node_modules", "*.js"]
}
```

Create `.prettierrc` at the project root:

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### Why both?

- **ESLint** = finds code *problems* (unused variables, missing types, bad patterns)
- **Prettier** = formats code *style* (spacing, quotes, line length)
- **`eslint-config-prettier`** = turns off ESLint rules that conflict with Prettier so they don't fight

---

## Step 8: Environment Variables

Create `server/.env.example`:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/resume-coach

# JWT
JWT_SECRET=your-secret-key-change-this
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret-change-this
JWT_REFRESH_EXPIRES_IN=30d

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# GitHub (for Phase 9)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

Then copy it to create your actual `.env`:

```bash
cd server
copy .env.example .env
```

**Why `.env.example` exists:** It shows other developers (and recruiters reading your repo) what environment variables are needed *without* exposing your actual secrets. The real `.env` is gitignored.

---

## Step 9: Set Up .gitignore

Create `.gitignore` at the project root:

```gitignore
# Dependencies
node_modules/

# Build output
dist/
build/

# Environment variables (NEVER commit these)
.env
.env.local
.env.production

# IDE
.vscode/
.idea/

# OS files
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# TypeScript cache
*.tsbuildinfo

# Coverage
coverage/
```

**Critical rule:** Never commit `.env` files. They contain secrets (API keys, database passwords). If you accidentally commit one, the key is compromised — rotate it immediately.

---

## Step 10: Add Scripts to package.json Files

Update `server/package.json` scripts:

```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node --esm src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint src/ --ext .ts"
  }
}
```

- **`dev`** — Runs your server with auto-restart on file changes. The `--esm` flag is needed because we're using ES modules.
- **`build`** — Compiles TypeScript to JavaScript (for production)
- **`start`** — Runs the compiled production build
- **`lint`** — Checks code for problems

Also make sure your `server/package.json` includes `"type": "module"` at the top level (after `"version"`).

---

## Step 11: Create the Initial README

Create `README.md` at the project root:

```markdown
# AI Resume & Portfolio Coach

An AI-powered web app that helps job seekers optimize their resumes by analyzing job descriptions, identifying keyword gaps, generating impact-focused bullet points, and providing portfolio critiques.

## Tech Stack

- **Frontend:** React 18, TypeScript, TailwindCSS, Vite
- **Backend:** Node.js, Express, TypeScript
- **Database:** MongoDB with Mongoose
- **AI:** OpenAI API (GPT-4o)
- **Deployment:** Vercel (frontend), Render (backend), MongoDB Atlas

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- OpenAI API key

### Installation

1. Clone the repo
   ```bash
   git clone https://github.com/YOUR_USERNAME/ai-resume-coach.git
   cd ai-resume-coach
   ```

2. Install dependencies
   ```bash
   # Server
   cd server && npm install

   # Client
   cd ../client && npm install
   ```

3. Configure environment variables
   ```bash
   cd server
   cp .env.example .env
   # Edit .env with your values
   ```

4. Run the development servers
   ```bash
   # Server (from /server)
   npm run dev

   # Client (from /client)
   npm run dev
   ```

## Project Status

- [x] Phase 1: Project Setup & Architecture
- [ ] Phase 2: Backend Foundation
- [ ] Phase 3: Authentication
- [ ] Phase 4: Resume CRUD API
- [ ] Phase 5: Frontend Foundation
- [ ] Phase 6: Resume & Job Description UI
- [ ] Phase 7: AI Integration — Core Analysis
- [ ] Phase 8: AI Integration — Bullet Points
- [ ] Phase 9: GitHub Integration
- [ ] Phase 10: Portfolio Critique
- [ ] Phase 11: Before/After View
- [ ] Phase 12: Guest Demo Mode
- [ ] Phase 13: Production Hardening
- [ ] Phase 14: Deployment & CI/CD
- [ ] Phase 15: README & Presentation
```

---

## Step 12: Initialize Git and Make Your First Commit

```bash
cd ..  # back to project root (AI_Resume_Coach)
git init
git add .
git commit -m "Phase 1: Project setup with monorepo structure, TypeScript, ESLint, Prettier, and TailwindCSS"
```

---

## Phase 1 Checklist

Before moving to Phase 2, confirm all of these:

- [ ] `node --version` returns 18+
- [ ] Project has `client/` and `server/` folders
- [ ] `server/package.json` has all backend dependencies
- [ ] `client/` was created with Vite React-TS template
- [ ] TailwindCSS is configured in the client
- [ ] TypeScript is configured in both client and server
- [ ] ESLint and Prettier configs exist at root
- [ ] `.env.example` exists in server (`.env` is gitignored)
- [ ] `.gitignore` covers node_modules, dist, .env, OS files
- [ ] README.md exists with project description
- [ ] First Git commit is made with a meaningful message
- [ ] Running `cd server && npx tsc --noEmit` produces no errors (may warn about no files yet — that's fine)
- [ ] Running `cd client && npm run dev` starts the Vite dev server

---

## Common Mistakes to Avoid

1. **Don't install packages globally** — Use `npx` or project-local installs. Global installs cause version conflicts.
2. **Don't skip `strict: true` in tsconfig** — It's tempting to turn off strict mode when you get type errors, but those errors are catching real bugs.
3. **Don't commit `.env`** — Double-check your `.gitignore` before pushing.
4. **Don't use Create React App** — It's deprecated. Vite is the standard now.
5. **Don't skip the README** — Even a basic one shows professionalism.

---

## What's Next: Phase 2

In Phase 2 we'll build the backend foundation:
- Express server with middleware (CORS, helmet, error handling)
- MongoDB connection via Mongoose
- User, Resume, and JobDescription models
- Health check endpoint to verify everything is wired up

Once you've confirmed the checklist above, let me know and we'll move on.
