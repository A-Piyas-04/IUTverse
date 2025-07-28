const transporter = require('../config/email');
const config = require('../config/config');

// Helper function to send email
const sendPasswordEmail = async (email, password) => {
  const mailOptions = {
    from: config.email.user || 'your-email@gmail.com', // Replace with your email
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

module.exports = {
  sendPasswordEmail
};
