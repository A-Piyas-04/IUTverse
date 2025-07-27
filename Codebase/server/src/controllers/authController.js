const { validateIUTEmail, generatePassword } = require('../utils/authUtils');
const { sendPasswordEmail } = require('../services/emailService');

// In-memory user storage (in production, use a database)
const users = new Map();

const signup = async (req, res) => {
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
};

const login = (req, res) => {
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
};

const getAllUsers = (req, res) => {
  const userList = Array.from(users.values()).map(user => ({
    email: user.email,
    createdAt: user.createdAt
  }));
  res.json(userList);
};

module.exports = {
  signup,
  login,
  getAllUsers
};
