-- Fix Row Level Security policies to allow user profile creation

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Create proper RLS policies for users table
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for games table
DROP POLICY IF EXISTS "Users can view own games" ON games;
DROP POLICY IF EXISTS "Users can insert own games" ON games;

CREATE POLICY "Users can view own games" ON games
  FOR SELECT USING (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "Users can insert own games" ON games
  FOR INSERT WITH CHECK (auth.uid() = player1_id OR auth.uid() = player2_id);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Create policies for rooms table
DROP POLICY IF EXISTS "Users can view accessible rooms" ON rooms;
DROP POLICY IF EXISTS "Users can insert own rooms" ON rooms;
DROP POLICY IF EXISTS "Users can update accessible rooms" ON rooms;

CREATE POLICY "Users can view accessible rooms" ON rooms
  FOR SELECT USING (auth.uid() = creator_id OR auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "Users can insert own rooms" ON rooms
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update accessible rooms" ON rooms
  FOR UPDATE USING (auth.uid() = creator_id OR auth.uid() = player1_id OR auth.uid() = player2_id);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
