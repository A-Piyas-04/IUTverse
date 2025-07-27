// Helper function to validate IUT email
const validateIUTEmail = (email) => {
  const iutEmailRegex = /^[a-zA-Z0-9._%+-]+@iut-dhaka\.edu$/;
  return iutEmailRegex.test(email);
};

// Helper function to generate password
const generatePassword = (email) => {
  const username = email.split('@')[0];
  
  // If username is less than 6 characters, pad with numbers or use a different logic
  if (username.length < 6) {
    const randomNum1 = Math.floor(Math.random() * 100);
    const randomNum2 = Math.floor(Math.random() * 100);
    return `${username}${randomNum1}${randomNum2}`;
  }
  
  const firstThree = username.substring(0, 3);
  const lastThree = username.substring(username.length - 3);
  const randomNum1 = Math.floor(Math.random() * 10);
  const randomNum2 = Math.floor(Math.random() * 10);
  
  return `${firstThree}${lastThree}${randomNum1}${randomNum2}`;
};

module.exports = {
  validateIUTEmail,
  generatePassword
};
