# IUTverse

IUTverse is a comprehensive campus-centric platform designed to streamline communication, collaboration, and resource sharing for students, faculty, and staff at the Islamic University of Technology (IUT). The platform integrates social, academic, and utility features to enhance the university experience.

## Features
- **CatCorner**:
  - Community-driven cat posts and interactions
  - Cat Adventure Game (multi-level, collectibles, power-ups, responsive UI)
- **Lost & Found**:
  - Report lost items
  - Browse and recover found items
  - Item details and contact system
- **Jobs Board**:
  - Post campus-related jobs and internships
  - Apply for jobs
  - Job application tracking
  - Comments and requirements per job
- **Confessions**:
  - Anonymous confession posting
  - Polling and voting
  - Tag-based filtering (Academic Stress, Hall Life, Wholesome, etc.)
  - Analytics and random confession feature
- **Academics**:
  - Share and access academic resources
  - Question paper sharing
  - Academic resource hub
- **CatQA**:
  - Q&A format for campus-related questions
  - Upvote/downvote answers
- **Profile Management**:
  - Customizable user profiles
  - Cover and profile pictures
  - Bio, interests, badges, academic info
- **Event Hub**:
  - Campus event listings and details
- **Chat**:
  - Real-time messaging


## Tech Stack
- **Frontend**: React, Tailwind CSS, Vite
- **Backend**: Node.js, Express, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: JWT-based
- **APIs**: OpenWeatherMap, custom REST endpoints

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