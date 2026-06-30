# IUTverse client V2

Parallel TypeScript rebuild of the IUTverse frontend. The legacy client remains in `../client` until preview acceptance and cutover.

## Setup

1. Copy the current client Supabase values into `.env.local` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. Run `npm install` and `npm run dev`.
3. Run the backend at port 3000 and apply the V2 Supabase migration first.

## Quality commands

`npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `npm run test:e2e`.

Install the pinned Playwright engines once with `npm exec playwright install chromium firefox webkit` before the cross-browser suite.

No sample redesign records are included; every timeline is API-backed. Static slogans and campus utility content are retained from the original frontend.
