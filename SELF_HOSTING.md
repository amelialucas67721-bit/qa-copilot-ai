# Self-Hosting Guide — Replacing AI Proxy with Direct Gemini API

This app was built on Anything AI which uses a proxy for AI calls. When self-hosting, replace the proxy calls with direct Google Gemini API calls using your own key.

---

## Step 1 — Get a Gemini API Key

1. Go to https://aistudio.google.com/app/apikey
2. Click "Create API key"
3. Copy the key
4. Add to your `.env.local`:
   ```
   GEMINI_API_KEY=AIza...
   ```

The new `src/app/api/utils/ai.ts` helper automatically detects which mode you are in:
- If `GEMINI_API_KEY` is set → uses direct Gemini API (self-hosted)
- Otherwise → uses the Anything AI proxy (hosted)

---

## Step 2 — Update AI Routes

Find all files that call the proxy directly (not using the `callAI` helper):

```bash
grep -r "integrations/google-gemini" src/app/api/ --include="*.ts" -l
```

For each file, replace the manual fetch block:

### Before (proxy pattern)
```typescript
const GEMINI_URL = process.env.NEXT_PUBLIC_CREATE_BASE_URL + '/integrations/google-gemini-2-5-flash';

const aiRes = await fetch(GEMINI_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + process.env.ANYTHING_PROJECT_TOKEN,
  },
  body: JSON.stringify({ messages: [...] }),
});
const aiData = await aiRes.json();
const text = aiData.choices[0].message.content;
```

### After (self-hosted pattern using the helper)
```typescript
import { callAI } from '@/app/api/utils/ai';

const text = await callAI(yourPrompt, { timeoutMs: 45000 });
```

Or if you need full control:
```typescript
const res = await fetch(
  'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GEMINI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gemini-2.5-flash',
      messages: [{ role: 'user', content: yourPrompt }],
    }),
  }
);
const bodyText = await res.text();         // always read as text first!
const data = JSON.parse(bodyText);
const text = data.choices?.[0]?.message?.content || '';
```

---

## Step 3 — File Uploads (Uploadcare)

The upload system uses Uploadcare. For self-hosting:

1. Sign up free at https://uploadcare.com
2. Create a project, get your keys
3. Set in `.env.local`:
   ```
   NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY=your_public_key
   UPLOADCARE_SECRET_KEY=your_secret_key
   ```

### Alternative: Use Your Own Storage (S3, Cloudflare R2)

Replace `src/utils/useUpload.ts` and `src/app/api/upload/` with your own S3/R2 upload logic.

---

## Step 4 — Remove Anything AI Dependencies

The following env vars are only needed on Anything AI's platform and can be removed in self-hosted `.env.local`:

```
NEXT_PUBLIC_CREATE_BASE_URL     # remove — handled by callAI() helper
NEXT_PUBLIC_CREATE_ENV          # remove
ANYTHING_PROJECT_TOKEN          # remove
NEXT_PUBLIC_PROJECT_GROUP_ID    # remove
EXPO_PUBLIC_PROXY_BASE_URL      # mobile only — remove
```

---

## Step 5 — next.config.js cleanup

In `next.config.js`, remove the env passthrough for Anything AI vars:

```js
// Remove these lines from next.config.js env block:
// NEXT_PUBLIC_CREATE_BASE_URL: process.env.NEXT_PUBLIC_CREATE_BASE_URL,
// NEXT_PUBLIC_CREATE_HOST: process.env.NEXT_PUBLIC_CREATE_HOST,
// NEXT_PUBLIC_PROJECT_GROUP_ID: process.env.NEXT_PUBLIC_PROJECT_GROUP_ID,
```

---

## Supported Deployment Platforms

| Platform | Notes |
|---|---|
| **Vercel** | Best option. Set env vars in dashboard. Root dir: `apps/web` |
| **Railway** | Works great. Set env vars, run `yarn build && yarn start` |
| **Render** | Set `apps/web` as root, Node 20, build cmd: `yarn build` |
| **Fly.io** | Use Dockerfile below |
| **VPS / Docker** | Use Dockerfile below |

---

## Dockerfile

```dockerfile
FROM node:20-alpine AS base

# Install corepack for Yarn 4
RUN corepack enable

WORKDIR /app
COPY . .

# Install dependencies
RUN yarn install

# Build
WORKDIR /app/apps/web
RUN yarn build

EXPOSE 3000
CMD ["yarn", "start"]
```

Build and run:
```bash
docker build -t qa-copilot .
docker run -p 3000:3000 --env-file apps/web/.env.local qa-copilot
```

---

## Full Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | ✅ | 32+ char random secret (run: `openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | ✅ | Your app's public URL |
| `AUTH_SECRET` | ✅ | Same as `BETTER_AUTH_SECRET` |
| `AUTH_URL` | ✅ | Same as `BETTER_AUTH_URL` |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY` | ✅ | Uploadcare public key |
| `UPLOADCARE_SECRET_KEY` | ✅ | Uploadcare secret key |
| `GOOGLE_CLIENT_ID` | ⚪ | Google OAuth (Sign in with Google) |
| `GOOGLE_CLIENT_SECRET` | ⚪ | Google OAuth |
| `ADMIN_SETUP_TOKEN` | ⚪ | Admin promotion token (default: `qa-copilot-admin-2025`) |
| `NEXT_PUBLIC_APP_URL` | ⚪ | Public URL (for links, emails) |
