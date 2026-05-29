require('dotenv').config({ quiet: true });

const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET,
  security: {
    corsOrigins:
      process.env.CORS_ORIGINS ||
      "http://localhost:5173,http://localhost:5174,http://localhost:3000",
    corsAllowCredentials: process.env.CORS_ALLOW_CREDENTIALS === "true",
    rateLimitWindowMinutes: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES, 10) || 15,
    rateLimitGeneralMax: parseInt(process.env.RATE_LIMIT_GENERAL_MAX, 10) || 300,
    rateLimitAuthMax: parseInt(process.env.RATE_LIMIT_AUTH_MAX, 10) || 10,
    rateLimitCreateMax: parseInt(process.env.RATE_LIMIT_CREATE_MAX, 10) || 60,
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    jwtSecret: process.env.SUPABASE_JWT_SECRET,
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
