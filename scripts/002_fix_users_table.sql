-- Fix the users table to properly handle Supabase auth user IDs
ALTER TABLE users ALTER COLUMN id DROP DEFAULT;

-- Update the users table to use auth.users id directly
-- This ensures the user profile creation works with Supabase auth
