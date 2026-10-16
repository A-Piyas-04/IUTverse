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
- **Languages:** JavaScript, SQL (PostgreSQL)
- **Frontend:** React, Vite, Tailwind CSS, Axios, React Router, date-fns
- **Backend:** Node.js, Express.js, Prisma ORM, PostgreSQL
- **Auth & Security:** JWT, bcrypt, cors, dotenv
- **File & Email:** multer, nodemailer
- **Tools:** ESLint, PostCSS, Autoprefixer, Firebase/Vercel/Railway
- **Offline & APIs:** Service Workers, LocalStorage, IndexedDB, OpenWeatherMap API

## Detailed Dependencies
### Client
- **Core**: react, react-dom, react-router-dom, axios, date-fns
- **Dev**: vite, @vitejs/plugin-react, tailwindcss, postcss, autoprefixer, eslint, @types/react, @types/react-dom, eslint-plugin-react, eslint-plugin-react-hooks, eslint-plugin-react-refresh, @tailwindcss/postcss

### Server
- **Core**: express, cors, dotenv, jsonwebtoken, bcrypt, multer, nodemailer, @prisma/client, pg, pg-promise
- **Dev**: prisma

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
| Web app | http://localhost:8080 |
| API | http://localhost:3100/api |
| Supabase gateway (auth, database API, storage, realtime) | http://localhost:8000 |

What runs: the React client (nginx), the Express API, Redis, and a complete local Supabase stack (Postgres, Auth, PostgREST, Storage, Realtime, Kong). On first start a one-off `migrate` container applies every migration in `Codebase/server/supabase/migrations` and loads the starter content from `seed_iutverse.sql`.

Useful commands:

- `docker-compose down` stops everything and keeps your data.
- `docker-compose down -v` also deletes the database and uploaded files, for a clean start.
- `docker-compose logs -f api` follows one service's logs.
- If a port is taken, set `CLIENT_PORT`, `API_PORT` or `SUPABASE_PORT` before `docker-compose build` and `docker-compose up`. The client is built with these addresses, so rebuild after changing them.
- Set `SEED_DEMO_DATA=false` to start with an empty database.

The keys in `docker-compose.yml` are Supabase's public demo keys for local development. They only work against this local stack. Never use them, or this compose file, for a hosted deployment; see `Codebase/documentation/vercel-deployment.md`.

### Run without Docker

See `Codebase/server/supabase/README.md` for the Supabase setup, then run `npm install` and `npm run dev` in `Codebase/server` and `Codebase/client-v2`.

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
