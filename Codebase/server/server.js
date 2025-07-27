const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Add logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// In-memory user storage (in production, use a database)
const users = new Map();

// Email configuration (you'll need to configure this with actual email service)
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email service
  auth: {
    user: 'your-email@gmail.com', // Replace with your email
    pass: 'your-app-password' // Replace with your app password
  }
});

// Helper function to validate IUT email
const validateIUTEmail = (email) => {
  const iutEmailRegex = /^[a-zA-Z0-9._%+-]+@iut-dhaka\.edu$/;
  return iutEmailRegex.test(email);
};

// Helper function to generate password
const generatePassword = (email) => {
  const username = email.split('@')[0];
  if (username.length < 6) {
    throw new Error('Username too short');
  }
  
  const firstThree = username.substring(0, 3);
  const lastThree = username.substring(username.length - 3);
  const randomNum1 = Math.floor(Math.random() * 10);
  const randomNum2 = Math.floor(Math.random() * 10);
  
  return `${firstThree}${lastThree}${randomNum1}${randomNum2}`;
};

// Helper function to send email
const sendPasswordEmail = async (email, password) => {
  const mailOptions = {
    from: 'your-email@gmail.com', // Replace with your email
    to: email,
    subject: 'Welcome to IUTVerse - Your Login Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #225522;">Welcome to IUTVerse!</h2>
        <p>Hello fellow IUTian,</p>
        <p>Your account has been created successfully. Here are your login credentials:</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Password:</strong> <span style="font-family: monospace; font-size: 18px; color: #225522;">${password}</span></p>
        </div>
        <p>Please use these credentials to login to IUTVerse. For security reasons, consider changing your password after your first login.</p>
        <p>Welcome to the IUT community platform!</p>
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message from IUTVerse. Please do not reply to this email.</p>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};

// Routes
app.get('/', (req, res) => {
  res.send('IUTverse Server is running!');
});

// Signup endpoint
app.post('/api/signup', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    if (!validateIUTEmail(email)) {
      return res.status(400).json({ message: 'Please provide a valid IUT email address' });
    }

    if (users.has(email)) {
      return res.status(409).json({ message: 'User already exists. Please login instead.' });
    }

    const password = generatePassword(email);
    
    // Store user in memory (in production, store in database)
    users.set(email, {
      email,
      password,
      createdAt: new Date()
    });

    // For development, we'll just log the password instead of sending email
    console.log(`Password for ${email}: ${password}`);
    
    // In production, uncomment the following line to send actual email:
    // await sendPasswordEmail(email, password);
    
    res.status(201).json({ 
      message: 'Account created successfully! Password sent to your email.',
      // For development only - remove this in production
      devPassword: password 
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Internal server error. Please try again.' });
  }
});

// Login endpoint
app.post('/api/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (!validateIUTEmail(email)) {
      return res.status(400).json({ message: 'Please provide a valid IUT email address' });
    }

    const user = users.get(email);
    if (!user) {
      return res.status(401).json({ message: 'User not found. Please sign up first.' });
    }

    if (user.password !== password) {
      return res.status(401).json({ message: 'Invalid password. Please check your email for the correct password.' });
    }

    res.status(200).json({ 
      message: 'Login successful',
      user: {
        email: user.email,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error. Please try again.' });
  }
});

// Get all users endpoint (for development/testing)
app.get('/api/users', (req, res) => {
  const userList = Array.from(users.values()).map(user => ({
    email: user.email,
    createdAt: user.createdAt
  }));
  res.json(userList);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log('IUTVerse backend ready!');
});
