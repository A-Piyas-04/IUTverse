const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { supabaseAdmin, isSupabaseAdminConfigured } = require('../config/supabase');
const response = require("../utils/responses");

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return response.unauthorized(res, 'Access token required');
  }

  if (isSupabaseAdminConfigured) {
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data?.user) {
      return response.forbidden(res, 'Invalid Supabase token');
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, display_name, role')
      .eq('id', data.user.id)
      .maybeSingle();

    req.user = {
      id: data.user.id,
      userId: data.user.id,
      email: data.user.email,
      name: profile?.display_name || data.user.user_metadata?.display_name || null,
      role: profile?.role || 'user',
      supabaseUser: data.user,
    };

    next();
    return;
  }

  if (!config.jwtSecret) {
    return response.serverError(res, 'Supabase Auth is not configured');
  }

  jwt.verify(token, config.jwtSecret, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return response.forbidden(res, 'Token has expired');
      }
      return response.forbidden(res, 'Invalid token');
    }

    req.user = {
      ...user,
      id: user.userId || user.id,
      userId: user.userId || user.id,
    };
    next();
  });
};

module.exports = { authenticateToken };
