// Pins every Supabase and service setting to an unroutable local value before
// any server module is imported, so a developer's .env can never point these
// tests at a real project.
Object.assign(process.env, {
  NODE_ENV: "test",
  SUPABASE_URL: "http://127.0.0.1:9",
  SUPABASE_ANON_KEY: "test-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
  SUPABASE_PUBLIC_URL: "",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:9",
  DATABASE_URL: "",
  DIRECT_URL: "",
  REDIS_URL: "",
  EMAIL_USER: "",
  EMAIL_PASS: "",
  OPENWEATHER_API_KEY: "",
  EXPOSE_ERRORS: "",
  TRUST_PROXY: "",
  VERCEL: "",
  CORS_ORIGINS: "http://localhost:5174",
  // Generous limits so the limiters never interfere with assertions.
  RATE_LIMIT_GENERAL_MAX: "100000",
  RATE_LIMIT_AUTH_MAX: "100000",
  RATE_LIMIT_CREATE_MAX: "100000",
  RATE_LIMIT_LOOKUP_MAX: "100000",
});
