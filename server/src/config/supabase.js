const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ quiet: true });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
const isSupabaseAdminConfigured = Boolean(
  supabaseUrl && supabaseServiceRoleKey
);

// A fresh anon client per auth call. supabase-js keeps the signed-in session
// on the client instance, so a shared client would let concurrent requests
// (for example signOut for one user) act on another user's session.
const createAuthClient = () =>
  isSupabaseConfigured
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      })
    : null;

const supabaseAdmin = isSupabaseAdminConfigured
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

module.exports = {
  createAuthClient,
  supabaseAdmin,
  isSupabaseConfigured,
  isSupabaseAdminConfigured,
};
