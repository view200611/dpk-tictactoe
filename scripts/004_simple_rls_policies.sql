-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Create simple RLS policies
CREATE POLICY "Users can manage own data" ON users
  FOR ALL USING (auth.uid() = id);

-- Allow service role to bypass RLS for user creation
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Ensure games table has proper policies
DROP POLICY IF EXISTS "Users can view own games" ON games;
DROP POLICY IF EXISTS "Users can insert own games" ON games;

CREATE POLICY "Users can manage own games" ON games
  FOR ALL USING (auth.uid() = player1_id OR auth.uid() = player2_id);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Ensure rooms table has proper policies  
DROP POLICY IF EXISTS "Users can view accessible rooms" ON rooms;
DROP POLICY IF EXISTS "Users can manage own rooms" ON rooms;

CREATE POLICY "Users can manage accessible rooms" ON rooms
  FOR ALL USING (auth.uid() = creator_id OR auth.uid() = player1_id OR auth.uid() = player2_id);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
