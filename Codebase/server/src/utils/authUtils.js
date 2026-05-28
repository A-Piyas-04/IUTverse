// Helper function to validate IUT email
const validateIUTEmail = (email) => {
  const iutEmailRegex = /^[a-zA-Z0-9._%+-]+@iut-dhaka\.edu$/;
  return iutEmailRegex.test(email);
};

module.exports = {
  validateIUTEmail,
};
