const nodemailer = require('nodemailer');
const config = require('./config');

// Email configuration (you'll need to configure this with actual email service)
const transporter = nodemailer.createTransport({
  service: config.email.service,
  auth: {
    user: config.email.user || 'your-email@gmail.com', // Replace with your email
    pass: config.email.pass || 'your-app-password' // Replace with your app password
  }
});

module.exports = transporter;
