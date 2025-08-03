# IUTverse

IUTverse is a comprehensive campus-centric platform designed to streamline communication, collaboration, and resource sharing for students, faculty, and staff at the Islamic University of Technology (IUT). The platform integrates social, academic, and utility features to enhance the university experience.

## Features
- **Weather Dashboard**: Real-time weather updates for Gazipur, Bangladesh.
- **CatCorner**: Community-driven cat posts and interactions.
- **Lost & Found**: Report and recover lost items on campus.
- **Jobs Board**: Post and apply for campus-related jobs and internships.
- **Confessions**: Anonymous sharing and polling.
- **Academics**: Share and access academic resources.
- **CatQA**: Ask and answer questions in a Q&A format.
- **Profile Management**: Customizable user profiles with cover and profile pictures.
- **Notifications**: Stay updated with real-time alerts.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Vite
- **Backend**: Node.js, Express, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: JWT-based
- **APIs**: OpenWeatherMap, custom REST endpoints

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
- Use the navigation menu to access different modules (Weather, CatCorner, Lost & Found, Jobs, etc).

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