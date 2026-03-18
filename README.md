# TubeDoc: YouTube Translation Workspace

A production-ready system to authenticate users, process YouTube transcripts and summaries, and track per-user usage with admin controls.

## Features

- **Automatic Transcript Extraction**: Uses official/community YouTube Transcript API.
- **Whisper AI Fallback**: Automatically downloads audio and runs speech-to-text via OpenAI Whisper if no transcript exists.
- **AI-Powered Summarization**: Generates structured summaries with Gemini, with a local fallback when no API key is configured.
- **Real-time Status Updates**: Frontend tracks processing stages via Server-Sent Events (SSE).
- **PostgreSQL Storage**: Results stored in a persistent database using Prisma ORM.
- **Authentication**: Manual email/password login plus Google OAuth popup flow.
- **User Roles**: Normal users and admins, with admin-only analytics and user management tools.
- **Per-User Limits and Usage**: Free users are limited to one translation per day by default, with token usage and estimated cost tracked per account.
- **Premium Upgrade Flow**: Users can upgrade themselves to a premium tier with higher limits.
- **Admin Dashboard**: Monitor total users, login activity, DAU, token usage/cost, and edit user token allocations or restrictions.

## Prerequisites

1.  **Gemini API Key**: Optional, enables Gemini summarization and Gemini transcription fallback.
2.  **FFmpeg**: Required for audio processing (should be in PATH).
3.  **Docker**: For running PostgreSQL (or provide your own instance).
4.  **Node.js**: v18+ recommended.
5.  **Google OAuth credentials**: Required if you want "Login with Google".

## Setup

### 1. Database

Start the PostgreSQL container:

```bash
docker-compose up -d
```

### 2. Backend

```bash
cd backend
npm install
# Create .env and configure the variables below
npx prisma migrate dev
npm run start:dev
```

Recommended backend `.env`:

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

# Optional bootstrap admin account
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-me-now
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

- `POST /api/auth/signup`: Create an account with email/password.
- `POST /api/auth/login`: Log in with email/password.
- `GET /api/auth/google/start`: Start the Google OAuth flow.
- `GET /api/account/me`: Fetch the current authenticated user and usage summary.
- `POST /api/account/upgrade`: Upgrade the current user to premium.
- `POST /api/videos/process`: Submit a URL to process for the authenticated user.
- `GET /api/videos`: List the authenticated user's processed videos.
- `GET /api/videos/process/status/:jobId`: Subscribe to real-time status updates for a job.
- `GET /api/admin/overview`: Admin analytics, DAU, and user overview.
- `PATCH /api/admin/users/:id`: Admin-only user token/limit/restriction management.

## System Architecture

- **AuthModule**: Handles JWT auth, password login, Google OAuth, and default admin bootstrap.
- **AccountModule**: Enforces daily limits, plan upgrades, and user usage summaries.
- **AdminModule**: Provides admin analytics and user management endpoints.
- **YoutubeService**: Orchestrates processing, ownership, status updates, and usage recording.
- **TranscriptService**: Fetches transcripts from YouTube.
- **WhisperService**: Handles audio download (ytdl) and transcription.
- **SummaryService**: Handles Gemini summarization with local fallback.
- **PrismaService**: Database abstraction.

## Technology Stack

- **Backend**: NestJS, TypeScript, Prisma, PostgreSQL.
- **Frontend**: React, Vite, Axios, Lucide-React.
- **AI**: Gemini API with local/Whisper-based fallbacks.
- **Audio**: @distube/ytdl-core, fluent-ffmpeg.
