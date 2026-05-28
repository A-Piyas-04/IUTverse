const { validateIUTEmail } = require('../utils/authUtils');
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
    console.error('Signup error:', error);
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
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error. Please try again.' });
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
    console.error('Get users error:', error);
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
    console.error('Token validation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  signup,
  login,
  getAllUsers,
  validateToken
};
