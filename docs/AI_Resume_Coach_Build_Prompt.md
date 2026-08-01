# AI-Powered Resume & Portfolio Coach — Build Guide Prompt

Use this prompt with an AI assistant (Claude, ChatGPT, Copilot, etc.) to guide you step-by-step through building this project. Copy the entire prompt below into a new conversation when you're ready to start.

---

## The Prompt

```
You are my senior full-stack engineering mentor. I'm building an AI-Powered Resume & Portfolio Coach as a portfolio project to land a software engineering job. Guide me through building it step-by-step, one phase at a time. Don't dump everything at once — after each step, wait for me to confirm I've completed it before moving to the next.

## Project Overview

A web app where users can:
- Create an account and save multiple resumes
- Paste a target job description
- Get AI-powered feedback: missing keywords, suggested edits, tailored bullet points
- Connect their GitHub to auto-generate impact-focused bullet points from repos
- Get a "portfolio critique" on their project READMEs and live links
- See a Before/After comparison of their resume

## Tech Stack

- Frontend: React 18+ with TypeScript, React Router v6, TailwindCSS
- Backend: Node.js + Express, JWT authentication
- Database: MongoDB with Mongoose
- AI: OpenAI API (GPT-4o or GPT-4o-mini) called from backend only
- Deployment: Frontend on Vercel, Backend on Render, MongoDB Atlas
- CI/CD: GitHub Actions
- Version Control: Git with meaningful, small commits

## Build Phases

### Phase 1: Project Setup & Architecture
- Initialize monorepo or separate frontend/backend repos
- Set up TypeScript configs, ESLint, Prettier
- Create folder structure following best practices
- Set up environment variables (.env with .env.example)
- Initialize Git with a proper .gitignore
- Create a basic README with project description

### Phase 2: Backend Foundation
- Express server with error handling middleware
- MongoDB connection with Mongoose
- User model (email, password hash, name, created_at)
- Resume model (user_id, title, content, sections, target_role, created_at, updated_at)
- JobDescription model (user_id, company, role, description, keywords_extracted)
- Input validation middleware (express-validator or zod)
- Health check endpoint

### Phase 3: Authentication
- User registration with password hashing (bcrypt)
- User login returning JWT access token + refresh token
- Auth middleware that protects routes
- Password reset flow (optional but impressive)
- Rate limiting on auth endpoints

### Phase 4: Resume CRUD API
- POST /api/resumes — create new resume
- GET /api/resumes — list user's resumes
- GET /api/resumes/:id — get single resume
- PUT /api/resumes/:id — update resume
- DELETE /api/resumes/:id — delete resume
- Same pattern for job descriptions
- Ensure all routes are protected and scoped to the authenticated user

### Phase 5: Frontend Foundation
- React app with TypeScript and TailwindCSS
- React Router with protected route wrapper
- Auth pages: Login, Register
- Layout: Navbar, Sidebar, Main content area
- Auth context/store for JWT management
- Axios or fetch wrapper with token refresh logic
- Responsive design from the start

### Phase 6: Resume & Job Description UI
- Dashboard showing saved resumes as cards
- Resume editor (can be a structured form with sections: summary, experience, skills, education)
- Job description input page (paste full JD text)
- Basic state management for forms

### Phase 7: AI Integration — Core Analysis
- Backend route: POST /api/ai/analyze
- Accepts: resume content + job description text
- Sends structured prompt to OpenAI API:
  - Extract keywords from the job description
  - Compare against resume content
  - Identify gaps and missing skills/keywords
  - Suggest specific edits with "High Impact" vs "Nice to Have" labels
- Return structured JSON response (not raw text)
- Handle token limits, rate limiting, and API errors gracefully
- Store analysis results linked to the resume

### Phase 8: AI Integration — Bullet Point Generator
- Backend route: POST /api/ai/generate-bullets
- Accepts: raw experience description + target role
- Returns: 3-5 impact-focused bullet points using STAR/XYZ format
- Show original vs AI-suggested side by side

### Phase 9: GitHub Integration
- Backend route: POST /api/github/analyze
- User provides GitHub username or connects via OAuth
- Fetch public repos via GitHub API
- AI analyzes: repo names, descriptions, READMEs, languages, commit frequency
- Generates portfolio-ready bullet points like:
  "Built a [X] using [tech stack] that [impact/metric], demonstrating [skill]"
- Display results with option to add directly to resume

### Phase 10: Portfolio Critique Mode
- User provides URLs to live projects or GitHub repos
- Backend fetches README content and metadata
- AI evaluates: clarity, technical depth, demo availability, documentation quality
- Returns scored feedback with specific improvement suggestions

### Phase 11: Before/After View
- Split-screen UI showing original resume vs AI-improved version
- Highlight changes (added keywords, reworded bullets, new sections)
- Allow user to accept/reject individual suggestions
- Export final version

### Phase 12: Guest Demo Mode
- Allow unauthenticated users to try one analysis with sample data
- Pre-populated example resume + job description
- Limited to 1 analysis (prompt to sign up for more)
- This is critical for recruiters evaluating your portfolio

### Phase 13: Production Hardening
- Error boundaries in React
- Proper HTTP error responses with consistent format
- Request logging (morgan or pino)
- API rate limiting per user
- Input sanitization
- CORS configuration
- Environment-specific configs (dev/staging/prod)
- Basic monitoring (uptime, response times)

### Phase 14: Deployment & CI/CD
- MongoDB Atlas cluster setup
- Backend deployed to Render with environment variables
- Frontend deployed to Vercel with environment variables
- GitHub Actions workflow: lint → test → build → deploy
- Custom domain (optional but nice)

### Phase 15: README & Presentation
- Hero screenshot showing the AI analysis in action
- Problem statement: "Tailoring resumes is slow and error-prone"
- Architecture diagram (simple boxes and arrows)
- Tech stack badges
- Setup instructions (clone, install, configure .env, run)
- "Hardest challenges" section (token limits, prompt engineering, rate limiting)
- Link to live demo
- Link to 2-3 minute Loom walkthrough

## Rules for Guiding Me

1. Start with Phase 1. Don't skip ahead.
2. For each phase, give me:
   - What to do (specific commands, file names, code structure)
   - Why it matters (what hiring managers notice)
   - A checklist I can confirm before moving on
3. When showing code, give complete working files — no "// rest of code here" shortcuts.
4. If I get stuck or hit an error, help me debug it.
5. Remind me to commit after each phase with a meaningful message.
6. If I ask "what would a senior engineer do differently?" — tell me honestly.
7. Keep explanations concise. I learn by building, not reading essays.
8. Call out common mistakes before I make them.

## My Background

[EDIT THIS SECTION — add your info so the AI can tailor guidance to your level]

- Languages I'm comfortable with: ___
- Frameworks I've used before: ___
- Have I used TypeScript before? ___
- Have I deployed anything before? ___
- Am I familiar with MongoDB? ___
- Am I comfortable with Git? ___

Let's start with Phase 1. What do I do first?
```

---

## Tips for Using This Prompt

1. **Fill in the "My Background" section** before you start so the AI calibrates its explanations.
2. **One phase at a time.** Don't rush. Each phase should result in working code you can demo.
3. **Commit after every phase.** Your Git history is part of your portfolio.
4. **If you get stuck**, paste the error into the chat. Don't guess.
5. **Timebox it.** Aim for 3-4 weeks total. If a phase takes more than 3 days, simplify scope and move on.
6. **Deploy early (Phase 14 can happen after Phase 5).** A live URL, even if incomplete, is better than a local-only app.

## Estimated Timeline

| Phase | Time | Priority |
|-------|------|----------|
| 1-4 (Backend) | 4-5 days | Must have |
| 5-6 (Frontend) | 3-4 days | Must have |
| 7-8 (AI Core) | 3-4 days | Must have |
| 9-10 (GitHub + Critique) | 3-4 days | Should have |
| 11 (Before/After) | 2 days | Should have |
| 12 (Guest Demo) | 1 day | Must have |
| 13-14 (Production) | 2-3 days | Must have |
| 15 (README/Presentation) | 1-2 days | Must have |

Total: ~3-4 weeks of focused work
