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

### Prerequisites
- Node.js (v16+)
- npm or yarn
- PostgreSQL

### Installation
1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-org/IUTverse.git
   cd IUTverse/Codebase
   ```
2. **Install dependencies:**
   - For client:
     ```bash
     cd client
     npm install
     ```
   - For server:
     ```bash
     cd ../server
     npm install
     ```
3. **Configure environment variables:**
   - Copy `.env.example` to `.env` in both `client` and `server` folders and fill in required values (API keys, DB credentials, etc).
4. **Set up the database:**
   ```bash
   cd server
   npx prisma migrate dev
   ```
5. **Run the development servers:**
   - Client:
     ```bash
     cd client
     npm run dev
     ```
   - Server:
     ```bash
     cd server
     npm run dev
     ```

## Usage
- Access the client at `http://localhost:5173/` (or as specified in terminal output).
- Register or log in to explore features.
- Use the navigation menu to access different modules (Weather, CatCorner, Lost & Found, Jobs, Confessions, Academics, CatQA, Profile, Notifications, Event Hub, Chat, Admin).

## Contact
For questions, suggestions, or support, please open an issue or contact the maintainers at [ahnafpias@iut-dhaka.edu].
