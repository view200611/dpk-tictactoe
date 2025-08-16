-- Add online status tracking to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;

-- Create index for efficient online user queries
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen);
CREATE INDEX IF NOT EXISTS idx_users_online ON users(is_online);

-- Function to automatically update last_seen when user data changes
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_seen = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_seen on any user update
DROP TRIGGER IF EXISTS trigger_update_last_seen ON users;
CREATE TRIGGER trigger_update_last_seen
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_last_seen();
