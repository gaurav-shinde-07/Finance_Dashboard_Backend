// src/config/supabase.js
// ============================================================
// Supabase Client Configuration
//
// We initialize TWO clients:
// 1. `supabase` (anon key) — used for auth operations (login, signup)
//    This respects Row Level Security policies.
//
// 2. `supabaseAdmin` (service role key) — used for admin operations
//    like reading all users, updating roles, fetching any record.
//    This BYPASSES RLS — use with extreme care, only server-side.
//
// Never expose the service role key to the client. It lives only
// in our backend environment variables.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate that required environment variables are present at startup
// Fail fast — better to crash on startup than fail mysteriously at runtime
if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  console.error('❌ Missing required Supabase environment variables.');
  console.error('   Check SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY in your .env file');
  process.exit(1);
}

// Standard client — auth operations, respects RLS
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,  // Server-side: no session persistence needed
  },
});

// Admin client — bypasses RLS, used for admin-level data operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});