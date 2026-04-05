// src/modules/auth/auth.service.js
// ============================================================
// Authentication Service
//
// All auth business logic lives here. Controllers just call these
// methods and return the result — no auth logic in controllers.
//
// Supabase Auth handles:
// - Password hashing (bcrypt internally)
// - JWT generation and signing
// - Token refresh
// - Email verification (configurable in Supabase dashboard)
// ============================================================

import { supabase, supabaseAdmin } from '../../config/supabase.js';

/**
 * Register a new user
 * Supabase Auth creates the user + our trigger creates the profile
 */
export const registerUser = async ({ email, password, full_name }) => {
  // Create user in Supabase Auth
  // We pass full_name in metadata so the trigger can pick it up
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name },  // Stored in auth.users.raw_user_meta_data
    },
  });

  if (error) {
    // Supabase returns specific error messages we can surface
    throw new Error(error.message);
  }

  // The trigger handle_new_user() fires automatically and creates the profile
  // Return the session token immediately so user is logged in after signup
  return {
    user: {
      id: data.user.id,
      email: data.user.email,
      full_name,
    },
    session: data.session,  // Contains access_token and refresh_token
  };
};

/**
 * Login with email and password
 * Returns a session with JWT tokens
 */
export const loginUser = async ({ email, password }) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Don't expose whether email or password was wrong — security best practice
    throw new Error('Invalid email or password');
  }

  // Fetch profile separately to include role in the response
  // This saves the frontend an extra API call after login
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, full_name, is_active')
    .eq('id', data.user.id)
    .single();

  if (profile && !profile.is_active) {
    // Sign them out immediately if deactivated
    await supabase.auth.signOut();
    throw new Error('Your account has been deactivated. Please contact an administrator.');
  }

  return {
    user: {
      id: data.user.id,
      email: data.user.email,
      full_name: profile?.full_name,
      role: profile?.role,
    },
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    },
  };
};

/**
 * Logout — invalidates the current session server-side
 */
export const logoutUser = async (token) => {
  // Sign out the specific session using the user's token
  const { error } = await supabase.auth.admin.signOut(token);
  if (error) {
    // Non-critical — even if this fails, the token will expire naturally
    console.warn('Logout warning:', error.message);
  }
  return true;
};

/**
 * Get the currently authenticated user's profile
 */
export const getMyProfile = async (userId) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw new Error('Failed to fetch profile');
  return data;
};

/**
 * Update the current user's own profile (name only — not role)
 */
export const updateMyProfile = async (userId, { full_name }) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ full_name })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw new Error('Failed to update profile');
  return data;
};