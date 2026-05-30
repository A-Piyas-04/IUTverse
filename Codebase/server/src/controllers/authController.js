const { validateIUTEmail } = require('../utils/authUtils');
const response = require("../utils/responses");
const logger = require("../utils/logger");
const { requiredText } = require("../utils/validation");
const {
  supabase,
  supabaseAdmin,
  isSupabaseConfigured,
  isSupabaseAdminConfigured,
} = require('../config/supabase');

const ensureSupabaseAuth = () => {
  if (!isSupabaseConfigured) {
    const error = new Error('Supabase Auth is not configured');
    error.statusCode = 500;
    throw error;
  }
};

const publicUserFromSession = (sessionUser, profile = null) => ({
  id: sessionUser.id,
  email: sessionUser.email,
  name: profile?.display_name || sessionUser.user_metadata?.display_name || null,
  role: profile?.role || 'user',
  createdAt: sessionUser.created_at,
});

const getProfile = async (userId) => {
  if (!isSupabaseAdminConfigured) return null;

  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id, display_name, role')
    .eq('id', userId)
    .maybeSingle();

  return data;
};

const signup = async (req, res) => {
  try {
    ensureSupabaseAuth();

    const { email, password, name } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    if (!validateIUTEmail(email)) {
      return res.status(400).json({ message: 'Please provide a valid IUT email address' });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: name || email.split('@')[0],
        },
      },
    });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    if (isSupabaseAdminConfigured && data.user) {
      await supabaseAdmin.from('profiles').upsert({
        id: data.user.id,
        display_name: name || email.split('@')[0],
      });
    }

    res.status(201).json({
      message: data.session
        ? 'Account created successfully.'
        : 'Account created successfully. Please check your email to confirm your account.',
      token: data.session?.access_token || null,
      refreshToken: data.session?.refresh_token || null,
      user: data.user ? publicUserFromSession(data.user) : null,
    });

  } catch (error) {
    logger.error('Signup error:', error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Internal server error. Please try again.' });
  }
};

const login = async (req, res) => {
  try {
    ensureSupabaseAuth();

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (!validateIUTEmail(email)) {
      return res.status(400).json({ message: 'Please provide a valid IUT email address' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session || !data.user) {
      return res.status(401).json({ message: 'Invalid email or password. Please check your credentials.' });
    }

    const profile = await getProfile(data.user.id);

    res.status(200).json({ 
      message: 'Login successful',
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
      user: publicUserFromSession(data.user, profile),
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error. Please try again.' });
  }
};

const requestPasswordReset = async (req, res) => {
  try {
    ensureSupabaseAuth();

    const { value: email, error } = requiredText(req.body.email, "Email", { max: 254 });
    if (error) return response.badRequest(res, error);
    if (!validateIUTEmail(email)) {
      return response.badRequest(res, "Please provide a valid IUT email address");
    }

    const options = {};
    if (req.body.redirectTo) {
      options.redirectTo = String(req.body.redirectTo);
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, options);
    if (resetError) return response.badRequest(res, resetError.message);

    return response.success(
      res,
      null,
      "If that IUT email exists, a password reset email has been sent."
    );
  } catch (error) {
    logger.error("Password reset request error:", error);
    return response.serverError(res, error.message || "Failed to request password reset");
  }
};

const changePassword = async (req, res) => {
  try {
    if (!isSupabaseAdminConfigured) {
      return response.serverError(res, "Supabase Admin is not configured");
    }

    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (password.length < 8 || password.length > 128) {
      return response.badRequest(res, "Password must be between 8 and 128 characters long");
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(req.user.id, {
      password,
    });
    if (updateError) return response.badRequest(res, updateError.message);

    return response.success(res, null, "Password updated successfully");
  } catch (error) {
    logger.error("Password change error:", error);
    return response.serverError(res, "Failed to update password", error.message);
  }
};

const getAllUsers = async (req, res) => {
  try {
    if (!isSupabaseAdminConfigured) {
      return res.status(500).json({ message: 'Supabase Admin is not configured' });
    }

    const { data: users, error } = await supabaseAdmin
      .from('profiles')
      .select('id, display_name, department_id, batch, student_id, role, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    res.json(users);
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ message: 'Internal server error. Please try again.' });
  }
};

const validateToken = async (req, res) => {
  try {
    res.status(200).json({
      message: 'Token is valid',
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
      },
    });
  } catch (error) {
    logger.error('Token validation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  signup,
  login,
  requestPasswordReset,
  changePassword,
  getAllUsers,
  validateToken
};
