const jwt = require('jsonwebtoken');
const { validateIUTEmail, generatePassword } = require('../utils/authUtils');
const { sendPasswordEmail } = require('../services/emailService');
const config = require('../config/config');
const userStorage = require('../utils/userStorage');

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      email: user.email,
      userId: user.email // Using email as userId for now
    },
    config.jwtSecret,
    { expiresIn: '24h' }
  );
};

const signup = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    if (!validateIUTEmail(email)) {
      return res.status(400).json({ message: 'Please provide a valid IUT email address' });
    }

    if (userStorage.has(email)) {
      return res.status(409).json({ message: 'User already exists. Please login instead.' });
    }

    const password = generatePassword(email);
    
    // Store user with persistent storage
    userStorage.set(email, {
      email,
      password,
      createdAt: new Date()
    });

    // For development, we'll log the password to console
    console.log(`Password for ${email}: ${password}`);
    
    // Send password via email
    try {
      await sendPasswordEmail(email, password);
      console.log(`Password email sent successfully to ${email}`);
    } catch (emailError) {
      console.error('Failed to send password email:', emailError);
      // Don't fail the signup if email fails, but log the error
    }
    
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

    const user = userStorage.get(email);
    if (!user) {
      return res.status(401).json({ message: 'User not found. Please sign up first.' });
    }

    if (user.password !== password) {
      return res.status(401).json({ message: 'Invalid password. Please check your email for the correct password.' });
    }

    // Generate JWT token
    const token = generateToken(user);

    res.status(200).json({ 
      message: 'Login successful',
      token,
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
  const userList = Array.from(userStorage.values()).map(user => ({
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
