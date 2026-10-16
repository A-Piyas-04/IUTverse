# IUTverse client

The IUTverse web app: React 18, TypeScript and Vite, talking to the Express API in `../server` and to Supabase for sign-in, Storage uploads and Realtime chat.

## Run it

The easiest way is the whole stack with Docker; see the repository README.

To run only the client against an API you already have running:

1. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Leave `VITE_API_BASE_URL` empty to use the dev proxy to `http://localhost:3000`.
2. Run `npm install` and `npm run dev`, then open http://localhost:5174.

## Quality commands

`npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `npm run test:e2e`.

Install the Playwright browsers once with `npm exec playwright install chromium firefox webkit` before running the end-to-end suite.
