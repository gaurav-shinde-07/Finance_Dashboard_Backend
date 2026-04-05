-- ============================================================
-- Finance Dashboard Backend — Supabase Schema
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

-- Step 1: Create a custom type for user roles
-- We use an enum so the DB enforces valid role values at the constraint level.
-- Adding a new role in future = one ALTER TYPE command.
CREATE TYPE user_role AS ENUM ('viewer', 'analyst', 'admin');

-- Step 2: Create a custom type for financial record types
CREATE TYPE record_type AS ENUM ('income', 'expense');

-- ============================================================
-- PROFILES TABLE
-- Extends Supabase's built-in auth.users table.
-- We never store passwords — Supabase Auth handles that.
-- Each user in auth.users automatically gets a profile row
-- via the trigger defined below.
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FINANCIAL RECORDS TABLE
-- Core entity of this system. Stores every income/expense entry.
-- Soft delete is implemented via deleted_at — we never hard delete
-- financial records (audit trail, regulatory best practice).
-- ============================================================
CREATE TABLE financial_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),  -- Always positive; type field determines direction
  type record_type NOT NULL,                            -- 'income' or 'expense'
  category TEXT NOT NULL,                              -- e.g., 'Salary', 'Rent', 'Marketing'
  description TEXT,                                    -- Optional notes/context
  record_date DATE NOT NULL,                           -- The actual date of the transaction
  tags TEXT[],                                         -- Optional array of tags for flexible filtering
  deleted_at TIMESTAMPTZ DEFAULT NULL,                 -- NULL = active, timestamp = soft deleted
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- Added on columns that will be frequently filtered/sorted.
-- This is critical for dashboard summary queries on large datasets.
-- ============================================================
CREATE INDEX idx_records_user_id ON financial_records(user_id);
CREATE INDEX idx_records_type ON financial_records(type);
CREATE INDEX idx_records_category ON financial_records(category);
CREATE INDEX idx_records_date ON financial_records(record_date);
CREATE INDEX idx_records_deleted_at ON financial_records(deleted_at);
-- Composite index for the most common dashboard query pattern
CREATE INDEX idx_records_user_date ON financial_records(user_id, record_date DESC);

-- ============================================================
-- TRIGGER: Auto-create profile on new user signup
-- When Supabase Auth creates a user, this trigger fires and
-- inserts a corresponding row in our profiles table.
-- This is the bridge between auth.users and our app data.
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'viewer'  -- Everyone starts as a viewer; admin promotes them
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_records_updated_at
  BEFORE UPDATE ON financial_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Supabase's killer feature. Even if our app logic has a bug,
-- the DB itself enforces that users only see their own data.
-- We use service role key in the backend to bypass RLS where needed.
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Profiles: users can update their own profile (not role — that's admin-only in app logic)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Records: users can only see their own records (not deleted)
CREATE POLICY "Users can view own records"
  ON financial_records FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Records: users can insert their own records
CREATE POLICY "Users can insert own records"
  ON financial_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Records: users can update their own records
CREATE POLICY "Users can update own records"
  ON financial_records FOR UPDATE
  USING (auth.uid() = user_id AND deleted_at IS NULL);