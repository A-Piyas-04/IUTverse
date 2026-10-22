// Helper function to validate IUT email
export const validateIUTEmail = (email: string) => {
  const iutEmailRegex = /^[a-zA-Z0-9._%+-]+@iut-dhaka\.edu$/;
  return iutEmailRegex.test(email);
};
