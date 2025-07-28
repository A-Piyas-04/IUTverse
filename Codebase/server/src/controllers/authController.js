const jwt = require('jsonwebtoken');
const { validateIUTEmail, generatePassword } = require('../utils/authUtils');
const { sendPasswordEmail } = require('../services/emailService');
const config = require('../config/config');
const userService = require('../services/userService');

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      email: user.email,
      userId: user.id // Use proper user ID from database
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

    // Check if user already exists using database
    const userExists = await userService.userExists(email);
    if (userExists) {
      return res.status(409).json({ message: 'User already exists. Please login instead.' });
    }

    const password = generatePassword(email);
    
    // Create user in database
    await userService.createUser(email, password);

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
    if (error.message === 'User already exists') {
      return res.status(409).json({ message: 'User already exists. Please login instead.' });
    }
    res.status(500).json({ message: 'Internal server error. Please try again.' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (!validateIUTEmail(email)) {
      return res.status(400).json({ message: 'Please provide a valid IUT email address' });
    }

    // Verify user credentials using database
    const user = await userService.verifyPassword(email, password);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password. Please check your credentials.' });
    }

    // Generate JWT token
    const token = generateToken(user);

    res.status(200).json({ 
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error. Please try again.' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Internal server error. Please try again.' });
  }
};

const validateToken = async (req, res) => {
  try {
    // If we reach here, the token is valid (middleware already verified it)
    const user = await userService.getUserByEmail(req.user.email);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ 
      message: 'Token is valid',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  signup,
  login,
  getAllUsers,
  validateToken
};
