require('dotenv').config({ quiet: true });

const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  security: {
    corsOrigins:
      process.env.CORS_ORIGINS ||
      "http://localhost:5173,http://localhost:5174,http://localhost:3000",
    corsAllowCredentials: process.env.CORS_ALLOW_CREDENTIALS === "true",
    rateLimitWindowMinutes: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES, 10) || 15,
    rateLimitGeneralMax: parseInt(process.env.RATE_LIMIT_GENERAL_MAX, 10) || 300,
    rateLimitAuthMax: parseInt(process.env.RATE_LIMIT_AUTH_MAX, 10) || 10,
    rateLimitCreateMax: parseInt(process.env.RATE_LIMIT_CREATE_MAX, 10) || 60,
    rateLimitLookupMax: parseInt(process.env.RATE_LIMIT_LOOKUP_MAX, 10) || 20,
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  auth: {
    // Must also be on the Supabase Auth redirect allowlist (exact URL).
    passwordResetRedirectUrl: process.env.PASSWORD_RESET_REDIRECT_URL || null,
  },
  email: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    service: process.env.EMAIL_SERVICE || 'gmail'
  },
  database: {
    url: process.env.DATABASE_URL
  }
};

module.exports = config;
