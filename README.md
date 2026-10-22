# IUTverse

IUTverse is a comprehensive campus-centric platform designed to streamline communication, collaboration, and resource sharing for students at the Islamic University of Technology (IUT). The platform integrates social, academic, and utility features to enhance the university experience.

## Features
- **IUT Mail-Based Authentication** – Access restricted to verified IUT email users for a trusted environment.
- **User Profiles** – Customizable profiles showcasing academic background, skills, and interests.
- **Post Sharing** – A space for students to share updates, announcements, or discussions.
- **Real-Time Messaging** – Direct chat system for quick communication among users.
- **Job Board** – Discover, apply for, or post jobs and internships relevant to IUT students.
- **Lost & Found** – Report or search for lost campus items easily.
- **Academic Resource Sharing** – Upload and access notes, books, and study materials.
- **Anonymous Confessions** – A safe space for sharing thoughts without identity.
- **Daily Campus Info** – Live weather, prayer times, and IUT facts in one place.
- **Cat Corner** – A unique section featuring IUT’s beloved cats with posts, facts, and care tips.


## Tech Stack
- **Framework:** Next.js 16 (App Router) with React 19 and TypeScript. One app serves the pages and the API.
- **Frontend:** React, CSS Modules, TanStack Query, React Hook Form + Zod, lucide-react
- **Backend:** Next.js Route Handlers (`src/app/api`), Supabase (Auth, PostgreSQL, Storage, Realtime)
- **Security:** nonce-based CSP, CORS allowlist, Redis-backed rate limiting, magic-byte upload validation, row-level security
- **Testing:** Vitest + Testing Library, Playwright, pgTAP, Stryker
- **Tools:** ESLint, Docker Compose, Vercel
- **APIs:** OpenWeatherMap

## Project layout

```text
src/
  app/            routing only: pages in (auth) and (app), the API in api/
  features/       one folder per feature: its pages, components and tests
                  (auth, feed, profile, messages, jobs, confessions, events,
                  lost-and-found, cat-corner, academic, moderation, about, theme)
  components/     shared UI: ui/ kit, shell/ layout and navigation, shared/
  lib/            API client, Supabase client, types and helpers
  content/        static site content
  styles/         global and shared page styles
  server/         server-only code: HTTP layer, controllers, services
  proxy.ts        CORS for /api, Content-Security-Policy for pages
supabase/         migrations, seed data, pgTAP tests
scripts/          migration and provisioning jobs (trusted machines only)
tests/            server tests         e2e/   Playwright tests
docs/             backend, database, deployment and security notes
```

## Getting Started

### Run everything with Docker (recommended)

The only requirement is [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine with Compose). No `.env` files or other setup are needed.

```bash
git clone https://github.com/A-Piyas-04/IUTverse.git
cd IUTverse
docker-compose build
docker-compose up
```

The first start takes a minute or two while it sets up the database. When it is ready, open **http://localhost:8080** and sign up with any `@iut-dhaka.edu` address. There's no email confirmation step locally.

| What | Address |
|---|---|
| Web app and API | http://localhost:8080 (API under `/api`) |
| Supabase gateway (auth, database API, storage, realtime) | http://localhost:8000 |

What runs: the Next.js app, Redis, and a complete local Supabase stack (Postgres, Auth, PostgREST, Storage, Realtime, Kong). On first start a one-off `migrate` container applies every migration in `supabase/migrations` and loads the starter content from `seed_iutverse.sql`.

Useful commands:

- `docker-compose down` stops everything and keeps your data.
- `docker-compose down -v` also deletes the database and uploaded files, for a clean start.
- `docker-compose logs -f web` follows the app's logs.
- If a port is taken, set `WEB_PORT` or `SUPABASE_PORT` before `docker-compose build` and `docker-compose up`. The page build contains the Supabase address, so rebuild after changing them.
- Set `SEED_DEMO_DATA=false` to start with an empty database.

The keys in `docker-compose.yml` are Supabase's public demo keys for local development. They only work against this local stack. Never use them, or this compose file, for a hosted deployment; see `docs/vercel-deployment.md`.

### Run without Docker

1. Set up Supabase (see `supabase/README.md`), either a local stack (`npx supabase start`) or a project of your own.
2. Copy `.env.example` to `.env.local` and fill in the `SUPABASE_*` and `NEXT_PUBLIC_SUPABASE_*` values. **Use a local or throwaway project**: the API holds the service-role key and writes to whatever it points at.
3. `npm install`, then `npm run dev`, and open http://localhost:3000.

### Quality commands

| Command | What it does |
|---|---|
| `npm run typecheck` | Generates route types and runs `tsc` |
| `npm run lint` | ESLint, no warnings allowed |
| `npm test` | Server and client Vitest projects (`test:server`, `test:client` for one) |
| `npm run build` | Production build |
| `npm run test:e2e` | Playwright (install browsers once with `npx playwright install`) |
| `npm run test:db` | pgTAP tests against a local Supabase stack |
| `npm run test:mutation` | Stryker mutation testing of the security-critical modules |
| `npm run security:scan-env` | Secret scan of tracked files |

Enable the commit hook once per clone with `git config core.hooksPath .githooks`.

## Contribution Guidelines
1. Fork the repository and create your feature branch (`git checkout -b feature/YourFeature`).
2. Commit your changes (`git commit -am 'Add new feature'`).
3. Push to the branch (`git push origin feature/YourFeature`).
4. Open a Pull Request describing your changes.
5. Ensure your code follows the project's style and passes all tests.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact
For questions, suggestions, or support, please open an issue or contact the maintainers at [ahnafpias@iut-dhaka.edu].
