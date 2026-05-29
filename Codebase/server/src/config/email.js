const nodemailer = require('nodemailer');
const config = require('./config');

const ensureEmailConfigured = () => {
  if (!config.email.user || !config.email.pass) {
    throw new Error("Email service is not configured. Set EMAIL_USER and EMAIL_PASS to enable email sending.");
  }
};

const createTransporter = () => {
  ensureEmailConfigured();

  return nodemailer.createTransport({
    service: config.email.service,
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
  });
};

module.exports = {
  createTransporter,
  ensureEmailConfigured,
};
