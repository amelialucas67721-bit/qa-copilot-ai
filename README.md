# QA Copilot AI — Complete Setup Guide

AI-powered Quality Assurance platform. Generate test cases from requirements, run security scans, manage defects and automate testing workflows.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS v4 |
| Backend | Next.js API Routes (serverless) |
| Database | PostgreSQL 17 |
| Auth | better-auth (email + Google OAuth) |
| AI | Google Gemini 2.5 Flash |
| Uploads | Uploadcare |

---

## Prerequisites

- **Node.js 20+**
- **Yarn 4.12.0** (`corepack enable && corepack prepare yarn@4.12.0 --activate`)
- **PostgreSQL 15+** — [Neon](https://neon.tech) (free tier) or any Postgres provider
- **Google Gemini API key** — [Get one free](https://aistudio.google.com/app/apikey)
- **Uploadcare account** — [Free tier](https://uploadcare.com) for file uploads

---

## Quick Start

### 1. Install dependencies

```bash
corepack enable
corepack prepare yarn@4.12.0 --activate
yarn install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
# Fill in all values in .env.local
```

### 3. Set up the database

```bash
# Run the full schema against your PostgreSQL database
psql "$DATABASE_URL" -f ../../schema.sql

# Or paste schema.sql contents into any Postgres GUI (TablePlus, pgAdmin, DBeaver)
```

### 4. Start development server

```bash
yarn dev
# Opens at http://localhost:4000
```

### 5. Create your admin account

1. Sign up at `http://localhost:4000/account/signup`
2. Visit `http://localhost:4000/admin-setup`
3. Enter your `ADMIN_SETUP_TOKEN` from `.env.local`
4. Sign out and sign back in
5. Admin panel is now at `/admin`

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

### Database
```
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

### Auth (better-auth)
```
BETTER_AUTH_SECRET=<random 32+ character string>
BETTER_AUTH_URL=http://localhost:4000
AUTH_SECRET=<same as BETTER_AUTH_SECRET>
AUTH_URL=http://localhost:4000
```

Generate a secret: `openssl rand -base64 32`

### AI — Google Gemini
```
GEMINI_API_KEY=AIza...
```

All AI routes use Gemini 2.5 Flash. Get a key at: https://aistudio.google.com/app/apikey

### File Uploads — Uploadcare
```
NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY=your_public_key
UPLOADCARE_SECRET_KEY=your_secret_key
```

### Google OAuth (optional)
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### Admin
```
ADMIN_SETUP_TOKEN=qa-copilot-admin-2025
```

---

## Replacing the AI Proxy

The app was originally built with an AI proxy at `NEXT_PUBLIC_CREATE_BASE_URL/integrations/...`. For self-hosting, replace all AI calls with direct Gemini API calls.

**Find all AI routes:**
```bash
grep -r "integrations/google-gemini" src/app/api/
```

**Replace each fetch call with:**
```typescript
const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

const res = await fetch(geminiUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
  },
  body: JSON.stringify({
    model: 'gemini-2.5-flash',
    messages: [{ role: 'user', content: prompt }],
  }),
});
const data = await res.json();
const text = data.choices?.[0]?.message?.content || '';
```

**Files to update:**
- `src/app/api/requirements/[id]/analyze/route.ts`
- `src/app/api/requirements/[id]/generate-tests/route.ts`
- `src/app/api/security-scans/[id]/run/route.ts`
- `src/app/api/test-runs/[id]/analyze-page/route.ts`
- `src/app/api/test-runs/[id]/run-automation/route.ts`

---

## File Uploads (Uploadcare)

The app uses Uploadcare for file/video uploads. For self-hosting:

1. Sign up at [uploadcare.com](https://uploadcare.com) (free)
2. Create a new project
3. Copy your **Public Key** → `NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY`
4. Copy your **Secret Key** → `UPLOADCARE_SECRET_KEY`

Alternatively, replace `src/utils/useUpload.ts` with your own upload logic (S3, Cloudflare R2, etc.).

---

## Database

### Run migrations

```bash
psql "$DATABASE_URL" -f ../../schema.sql
```

### Default pricing plans

The schema seeds 4 default plans: Free, Starter, Professional, Enterprise.

### Reset database

```bash
psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql "$DATABASE_URL" -f ../../schema.sql
```

---

## Build & Deploy

### Local production build

```bash
yarn build
yarn start
```

### Deploy to Vercel

```bash
npm i -g vercel
vercel deploy --prod
```

Set all environment variables in Vercel dashboard → Settings → Environment Variables.

**Important Vercel settings:**
- Framework: Next.js
- Root Directory: `apps/web`
- Node.js version: 20.x
- Build command: `yarn build`
- Output directory: `.next`

### Deploy to Railway / Render / Fly.io

Any provider supporting Node.js 20 and PostgreSQL works. Set the env vars and run:
```bash
yarn build && yarn start
```

---

## Project Structure

```
apps/web/src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── layout.tsx                  # Root layout + providers
│   ├── providers.tsx               # React Query provider
│   ├── global.css                  # Global styles
│   │
│   ├── account/                    # Auth pages
│   │   ├── signin/page.tsx
│   │   ├── signup/page.tsx
│   │   └── logout/page.tsx
│   │
│   ├── admin/                      # Admin panel
│   │   ├── layout.tsx              # Admin auth guard
│   │   ├── page.tsx                # Admin overview
│   │   ├── customers/
│   │   │   ├── page.tsx            # Customer list
│   │   │   └── [id]/page.tsx       # Customer detail + subscription mgmt
│   │   └── plans/
│   │       └── page.tsx            # Pricing plan CRUD
│   │
│   ├── admin-setup/page.tsx        # One-time admin promotion
│   │
│   ├── dashboard/                  # Customer dashboard
│   │   ├── layout.tsx              # Auth guard + sidebar
│   │   ├── page.tsx                # Dashboard overview
│   │   ├── projects/               # Project management
│   │   ├── test-cases/             # Test case management
│   │   ├── test-runs/              # Test execution
│   │   ├── defects/                # Bug tracking
│   │   ├── security/               # Security testing
│   │   └── reports/                # QA reports
│   │
│   └── api/                        # Backend API routes
│       ├── auth/[...all]/          # better-auth handler
│       ├── projects/               # CRUD for projects
│       ├── requirements/           # Requirements + AI analysis
│       ├── test-cases/             # Test case CRUD
│       ├── test-runs/              # Test run execution
│       ├── defects/                # Defect management
│       ├── security-scans/         # Security scanning + AI
│       ├── admin/                  # Admin API routes
│       └── utils/
│           ├── sql.ts              # PostgreSQL client (@neondatabase/serverless)
│           └── upload.ts           # File upload utility
│
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── DashboardNav.tsx            # Customer sidebar nav
│   ├── AdminNav.tsx                # Admin sidebar nav
│   └── SocialSignInButtons.tsx
│
├── lib/
│   ├── auth.ts                     # better-auth server configuration
│   ├── auth-client.ts              # better-auth client configuration
│   └── utils.ts                    # cn() utility
│
└── utils/
    ├── useUpload.ts                # File upload hook
    └── useHandleStreamResponse.ts
```

---

## Key Dependencies

```json
{
  "next": "^16.2.6",
  "react": "^19.0.4",
  "better-auth": "latest",
  "@neondatabase/serverless": "latest",
  "@tanstack/react-query": "latest",
  "tailwindcss": "^4.0.0",
  "lucide-react": "latest",
  "recharts": "latest",
  "sonner": "latest"
}
```

---

## Common Issues

### "relation does not exist" errors
Run the schema.sql file against your database — tables haven't been created yet.

### "Unauthorized" on all requests
Check that `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` match exactly between server and client.

### AI routes returning empty responses
Make sure `GEMINI_API_KEY` is set and you've replaced the proxy URL with the direct Gemini API URL (see [Replacing the AI Proxy](#replacing-the-ai-proxy)).

### Google OAuth not working
Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, and add your domain to the Google OAuth allowed redirect URIs in Google Cloud Console.

---

## Support

This is a fully self-contained Next.js application. All source code is included and fully editable.
