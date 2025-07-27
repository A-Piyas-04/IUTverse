# IUTVerse - Campus Social Web App

IUTVerse is an exclusive social platform designed for IUT (Islamic University of Technology) students to connect and engage with their campus community.

## Features

### Authentication System
- **IUT Email Only**: Only students with valid IUT email addresses (@iut-dhaka.edu) can access the platform
- **Automatic Password Generation**: No traditional signup - passwords are generated automatically and sent via email
- **Secure Login**: Students use their IUT email and generated password to log in

### How Authentication Works

1. **Getting Started (Signup)**:
   - Students enter their IUT email address on the signup page
   - System validates that the email is a valid IUT email (@iut-dhaka.edu)
   - A password is automatically generated using:
     - First 3 letters of the email username
     - Last 3 letters of the email username  
     - 2 random numbers (0-9)
   - The password is sent to the student's email
   - Student is redirected to the login page

2. **Login**:
   - Students use their IUT email and the password received via email
   - System validates credentials and logs them in
   - User session is maintained using localStorage

3. **Password Format Example**:
   - Email: `john.doe123@iut-dhaka.edu`
   - Username: `john.doe123`
   - Generated Password: `joh123` + `[random number]` + `[random number]`
   - Example: `joh12334` or `joh12378`

## Project Structure

```
IUTVerse/
├── Codebase/
│   ├── client/           # React frontend
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── Login/        # Login page
│   │   │   │   ├── Signup/       # Signup page
│   │   │   │   ├── homepage/     # Main homepage
│   │   │   │   └── Profile/      # User profile
│   │   │   └── App.jsx           # Main app with routing
│   │   └── package.json
│   └── server/           # Express backend
│       ├── server.js     # Main server file
│       └── package.json
└── Ideate/              # Project planning documents
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Frontend Setup
```bash
cd Codebase/client
npm install
npm run dev
```

### Backend Setup
```bash
cd Codebase/server
npm install
npm run dev
```

### Environment Configuration

For production, you'll need to configure the email service in `server/server.js`:

1. Update the nodemailer configuration:
   ```javascript
   const transporter = nodemailer.createTransporter({
     service: 'gmail', // or your email service
     auth: {
       user: 'your-email@gmail.com', // Replace with your email
       pass: 'your-app-password' // Replace with your app password
     }
   });
   ```

2. Update the sender email in the email functions.

### Development Mode

In development mode, passwords are logged to the console instead of being sent via email. Check the server console for generated passwords.

## API Endpoints

### POST /api/signup
- **Purpose**: Create new user account and send password via email
- **Body**: `{ "email": "student@iut-dhaka.edu" }`
- **Response**: Success/error message

### POST /api/login  
- **Purpose**: Authenticate user with email and password
- **Body**: `{ "email": "student@iut-dhaka.edu", "password": "generated_password" }`
- **Response**: User data or error message

### GET /api/users (Development only)
- **Purpose**: List all registered users for testing
- **Response**: Array of user objects

## Routing

- `/` - Homepage (shows login/signup buttons if not authenticated)
- `/signup` - Get started page for new users
- `/login` - Login page for existing users  
- `/profile` - User profile page (requires authentication)

## Security Features

1. **Email Validation**: Only IUT email addresses are accepted
2. **Unique Passwords**: Each generated password is unique and random
3. **Input Sanitization**: All user inputs are validated
4. **CORS Protection**: Backend configured with CORS for security

## Tech Stack

- **Frontend**: React, React Router, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Email**: Nodemailer
- **Database**: In-memory storage (development) - can be replaced with MongoDB/PostgreSQL for production

## Future Enhancements

- Database integration for persistent storage
- Password reset functionality
- Email verification
- Two-factor authentication
- Profile customization
- Social features (posts, friends, messaging)
- Campus-specific features (events, announcements)

## Contributing

This is a campus-specific application for IUT students. For contributions or suggestions, please contact the development team.

## License

This project is for educational purposes and exclusive use by IUT students and administration.
