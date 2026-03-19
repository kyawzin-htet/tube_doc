# TubeDoc

TubeDoc is a full-stack YouTube translation workspace with AI-assisted transcription, authentication, role-based access control, per-user usage tracking, premium upgrade requests, and an admin control panel.

It supports transcript extraction, AI-assisted transcription fallbacks, summary generation, download/export, and operational visibility for admins.

## Highlights

- Landing page for guests with link input before login
- Email/password authentication
- Google OAuth login
- Role-based access for `USER` and `ADMIN`
- Free tier with daily translation limits
- Premium request workflow with admin approval/cancel
- Per-user token balance, token cap, and restriction controls
- Real-time processing updates with Server-Sent Events
- YouTube transcript extraction with fallback transcription flow
- AI-generated summaries
- PDF and DOCX export for completed translations
- Admin analytics for total users, DAU, login activity, token usage, and estimated cost

## Core Features

### Authentication

- Email/password signup and login
- Google OAuth popup login
- JWT-based authenticated API access
- Admin bootstrap support through environment variables

### User Workspace

- Guest landing page with YouTube URL input
- Authenticated translation workspace
- Language selection before processing
- Live processing state with progress updates
- Saved translations list
- Translation detail modal with copy and export actions

### Usage and Limits

- Per-user translation tracking
- Per-user token balance and token cap
- Daily translation limits enforced in the backend
- Estimated token usage and estimated processing cost recorded per translation

### Premium Flow

- Free users can request Premium
- Requests enter `PENDING` state first
- Admin can approve or cancel each request
- Premium users receive higher translation limits and token allocation

### Admin Features

- Dashboard with:
  - total users
  - total translations
  - total token usage
  - estimated total cost
  - daily active users
  - pending premium requests
- Recent login activity view
- User management view for:
  - role updates
  - plan updates
  - daily limit updates
  - token balance updates
  - token cap updates
  - access restriction toggles

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- Axios
- date-fns
- lucide-react
- Custom CSS

### Backend

- NestJS 11
- TypeScript
- Prisma ORM
- PostgreSQL
- EventEmitter-based status streaming support

### AI and Processing

- Google Gemini via `@google/generative-ai`
- OpenAI SDK dependency available for processing integrations
- YouTube metadata access via `youtubei.js`
- FFmpeg via `fluent-ffmpeg`
- Python helper script for transcription flow

### Export

- `pdfkit` for PDF export
- `docx` for DOCX export

## Project Structure

```text
TubeDoc/
├── backend/
│   ├── prisma/
│   └── src/
│       ├── account/
│       ├── admin/
│       ├── auth/
│       ├── prisma/
│       └── youtube/
├── frontend/
│   └── src/
│       ├── components/
│       ├── constants/
│       ├── features/
│       ├── lib/
│       └── types/
└── README.md
```

### Backend Modules

- `auth/`: login, signup, Google OAuth, JWT, guards, roles
- `account/`: account summary, limits, usage, premium request flow
- `admin/`: analytics, login activity, user management, request approvals
- `youtube/`: processing pipeline, transcript retrieval, transcription fallback, summary generation, exports
- `prisma/`: database access

### Frontend Structure

- `components/`: reusable UI pieces such as modals, admin table rows, and layout elements
- `features/`: feature-level screens and panels for auth, workspace, account, and admin
- `constants/`: app-wide static data such as language and navigation definitions
- `lib/`: config, HTTP helpers, and formatting utilities
- `types/`: shared frontend TypeScript types

## How Usage Is Calculated

- User/account usage is read from persisted database records, not demo-only frontend values
- `translationUsage` records store:
  - transcript characters
  - summary characters
  - token estimates
  - estimated cost
- Admin totals and per-user counts are aggregated from database tables
- Token and cost values are estimated from the app’s configured formula, not exact provider billing invoices

## Prerequisites

- Node.js 18+
- npm
- PostgreSQL
- FFmpeg available in `PATH`
- Docker and Docker Compose if you want to run PostgreSQL locally with the included setup
- Google OAuth credentials if using Google login
- Gemini API key if using Gemini-based summarization/transcription

## Environment Variables

### Backend

Example backend `.env`:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tubedoc
PORT=3000
FRONTEND_URL=http://localhost:5173
BACKEND_BASE_URL=http://localhost:3000

JWT_SECRET=replace-this-in-production
GOOGLE_STATE_SECRET=replace-this-too

GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

SUMMARY_INPUT_COST_PER_1K_TOKENS=0.00015
SUMMARY_OUTPUT_COST_PER_1K_TOKENS=0.0006
TRANSCRIPTION_INPUT_COST_PER_1K_TOKENS=0.0001
TRANSCRIPTION_OUTPUT_COST_PER_1K_TOKENS=0.0004

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-me-now
```

### Frontend

Example frontend `.env`:

```bash
VITE_API_BASE_URL=http://localhost:3000/api
```

## Local Setup

### 1. Start PostgreSQL

If you are using the included Docker setup:

```bash
docker-compose up -d
```

### 2. Install and run the backend

```bash
cd backend
npm install
npx prisma migrate dev
npx prisma generate
npm run start:dev
```

### 3. Install and run the frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Open the app

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000/api`

## API Overview

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/google/start`

### Account

- `GET /api/account/me`
- `POST /api/account/upgrade-request`

### Videos

- `POST /api/videos/process`
- `GET /api/videos`
- `GET /api/videos/process/status/:jobId`
- `GET /api/videos/:id/download`
- `DELETE /api/videos/:id`

### Admin

- `GET /api/admin/overview`
- `PATCH /api/admin/users/:id`
- `POST /api/admin/upgrade-requests/:id/approve`
- `POST /api/admin/upgrade-requests/:id/cancel`

## Default Product Rules

- Free users default to `1` translation per day
- Premium users default to a higher daily limit
- Free users must request Premium first
- Premium activation requires admin approval
- Restricted users cannot process translations

## Development Notes

- Prisma migrations must be applied before using new auth and user-management features
- FFmpeg is required for audio-based fallback transcription flows
- Google OAuth requires matching configured frontend/backend callback origins
- Cost and token usage are tracked as application estimates

## Verification Commands

Typical local verification:

```bash
cd backend
npm run build
npm test -- --runInBand --watchman=false

cd ../frontend
npm run build
```

## Current Frontend Refactor

The frontend has been reorganized for maintainability using a feature-oriented structure:

- `App.tsx` handles orchestration only
- reusable UI lives in `components/`
- page/panel logic lives in `features/`
- shared types and helpers are centralized

This structure is intended to keep the codebase easier to extend as authentication, admin tooling, and processing features grow.
