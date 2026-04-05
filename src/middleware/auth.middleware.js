// src/middleware/auth.middleware.js
// ============================================================
// Authentication Middleware
//
// Every protected route passes through this middleware.
// It verifies the Supabase JWT token from the Authorization header,
// fetches the user's profile (including their role), and attaches
// both to req.user so downstream middleware and controllers can use them.
//
// Flow:
// Request → extract token → verify with Supabase → fetch profile
// → attach to req.user → next()
// ============================================================

import { supabase, supabaseAdmin } from '../config/supabase.js';
import { sendUnauthorized, sendServerError } from '../utils/apiResponse.js';

export const authenticate = async (req, res, next) => {
  try {
    // Extract token from "Authorization: Bearer <token>" header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendUnauthorized(res, 'No authentication token provided');
    }

    const token = authHeader.split(' ')[1];

    if (!token || token.trim() === '') {
      return sendUnauthorized(res, 'Invalid token format');
    }

    // Verify the token with Supabase — this hits Supabase's auth server
    // getUser() validates the JWT signature and expiry automatically
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return sendUnauthorized(res, 'Invalid or expired token. Please log in again.');
    }

    // Fetch the user's profile to get their role and active status
    // We use supabaseAdmin to bypass RLS — the backend always needs the full profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      // This would be unusual — means auth user exists but profile doesn't
      // Could happen if the trigger failed; we handle gracefully
      return sendServerError(res, 'User profile not found. Please contact support.');
    }

    // Check if the user account is still active
    // Admins can deactivate accounts; deactivated users can't access the API
    if (!profile.is_active) {
      return sendUnauthorized(res, 'Your account has been deactivated. Please contact an administrator.');
    }

    // Attach user data to request — available to all downstream handlers
    req.user = {
      id: user.id,
      email: user.email,
      role: profile.role,
      full_name: profile.full_name,
      profile,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return sendServerError(res, 'Authentication failed due to a server error');
  }
};