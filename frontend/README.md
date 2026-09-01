# StudyFlow-AI

An AI-powered study companion. Ask questions or upload documents to get instant explanations, key notes, quizzes, related videos, flashcards, and personalized study plans — all backed by real-time web search.

## Features

- **Smart Search** — ask any topic and get an explanation, key notes, and a 5-question quiz, grounded in live web search results
- **Document Mode** — upload a PDF, DOCX, or text file and get study materials generated directly from its content
- **Flashcards** — auto-generated front/back flashcards for quick review
- **Study Plans** — day-by-day personalized study schedules with tasks, milestones, and tips
- **Notes** — save any generated content as a note for later review
- **Related Videos** — relevant YouTube videos surfaced alongside every response
- **Progress Tracking** — XP/gamification for completed study activities

## Tech Stack

**Frontend**
- React 19 + TypeScript, built with Vite
- React Router for navigation
- Firebase (Auth + Firestore) for user accounts and data
- Sanity client for content management
- Deployed to Firebase Hosting via GitHub Actions

**Backend**
- Supabase Edge Functions (Deno) — powers the `search` endpoint
- [Groq](https://groq.com) — all AI inference:
  - `groq/compound-mini` for live web search (built-in search tool)
  - `openai/gpt-oss-120b` for content generation (quizzes, study plans, flashcards)
  - `openai/gpt-oss-20b` for lightweight tasks (keyword extraction)
- YouTube Data API for related video suggestions

## Project Structure

```
StudyFlow-AI/
├── frontend/              # React + Vite app
│   └── src/
│       ├── pages/         # Route-level pages (Notes, StudyPlan, AITutor, etc.)
│       ├── components/    # Shared components (Dashboard, StudyResponse, etc.)
│       └── firebase.ts    # Firebase client config
├── backend/                # Shared backend utilities
├── supabase/
│   └── functions/
│       ├── search/         # Main AI search/quiz/study-plan endpoint (Groq)
│       └── users/          # User-related endpoint
├── firebase.json           # Firebase Hosting config
├── firestore.rules         # Firestore security rules
└── .github/workflows/      # CI/CD — auto-deploy to Firebase Hosting on push to main
```

## Getting Started

### Prerequisites
- Node.js 20+
- A [Firebase](https://console.firebase.google.com) project (Auth + Firestore enabled)
- A [Supabase](https://supabase.com) project
- A [Groq](https://console.groq.com) API key
- A YouTube Data API key

### Frontend setup

```bash
cd frontend
npm install
```

Create a `.env` file in `frontend/` with your Firebase web app config:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Run the dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

### Backend setup (Supabase Edge Functions)

Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then link your project:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

Set secrets:

```bash
supabase secrets set GROQ_API_KEY=your-groq-key
supabase secrets set YOUTUBE_API_KEY=your-youtube-key
```

Deploy:

```bash
supabase functions deploy search
```

## Deployment

The frontend deploys automatically to Firebase Hosting on every push to `main`, via `.github/workflows/firebase-hosting-merge.yml`. This requires the following GitHub repository secrets to be set (Settings → Secrets and variables → Actions):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `FIREBASE_SERVICE_ACCOUNT_MOISHA_STUDYFLOW_AI` (generate/refresh via `firebase init hosting:github`)

Supabase Edge Functions are deployed separately via `supabase functions deploy <function-name>` and are not part of the GitHub Actions pipeline.

