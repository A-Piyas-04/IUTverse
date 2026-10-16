const { createTransporter } = require('../config/email');
const config = require('../config/config');

// Helper function to send email
const sendPasswordEmail = async (email) => {
  const mailOptions = {
    from: config.email.user,
    to: email,
    subject: 'Welcome to IUTVerse',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #225522;">Welcome to IUTVerse!</h2>
        <p>Hello fellow IUTian,</p>
        <p>Your account has been created successfully.</p>
        <p>Please use Supabase Auth password reset if you need to set or change your password.</p>
        <p>Welcome to the IUT community platform!</p>
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message from IUTVerse. Please do not reply to this email.</p>
      </div>
    `
  };

  const transporter = createTransporter();
  return transporter.sendMail(mailOptions);
};

module.exports = {
  sendPasswordEmail
};
