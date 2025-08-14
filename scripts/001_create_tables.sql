-- Create users table with username, email, and stats
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  wins INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0
);

-- Create games table to track all games
CREATE TABLE IF NOT EXISTS games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player1_id UUID REFERENCES users(id) ON DELETE CASCADE,
  player2_id UUID REFERENCES users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL CHECK (game_type IN ('ai_easy', 'ai_medium', 'ai_hard', 'multiplayer')),
  board TEXT NOT NULL DEFAULT '["","","","","","","","",""]',
  current_player TEXT NOT NULL DEFAULT 'X',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  winner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  result TEXT CHECK (result IN ('win', 'draw', 'loss')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create rooms table for multiplayer games
CREATE TABLE IF NOT EXISTS rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT UNIQUE NOT NULL,
  host_id UUID REFERENCES users(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES users(id) ON DELETE SET NULL,
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_total_score ON users(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_games_player1 ON games(player1_id);
CREATE INDEX IF NOT EXISTS idx_games_player2 ON games(player2_id);
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_rooms_host ON rooms(host_id);

-- Create function to update user stats
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update stats for player1
  IF NEW.player1_id IS NOT NULL THEN
    UPDATE users 
    SET 
      wins = (SELECT COUNT(*) FROM games WHERE (player1_id = NEW.player1_id OR player2_id = NEW.player1_id) AND winner_id = NEW.player1_id),
      draws = (SELECT COUNT(*) FROM games WHERE (player1_id = NEW.player1_id OR player2_id = NEW.player1_id) AND result = 'draw'),
      losses = (SELECT COUNT(*) FROM games WHERE (player1_id = NEW.player1_id OR player2_id = NEW.player1_id) AND winner_id IS NOT NULL AND winner_id != NEW.player1_id),
      total_score = (
        (SELECT COUNT(*) FROM games WHERE (player1_id = NEW.player1_id OR player2_id = NEW.player1_id) AND winner_id = NEW.player1_id) * 2 +
        (SELECT COUNT(*) FROM games WHERE (player1_id = NEW.player1_id OR player2_id = NEW.player1_id) AND result = 'draw') * 1 +
        (SELECT COUNT(*) FROM games WHERE (player1_id = NEW.player1_id OR player2_id = NEW.player1_id) AND winner_id IS NOT NULL AND winner_id != NEW.player1_id) * (-1)
      )
    WHERE id = NEW.player1_id;
  END IF;

  -- Update stats for player2
  IF NEW.player2_id IS NOT NULL THEN
    UPDATE users 
    SET 
      wins = (SELECT COUNT(*) FROM games WHERE (player1_id = NEW.player2_id OR player2_id = NEW.player2_id) AND winner_id = NEW.player2_id),
      draws = (SELECT COUNT(*) FROM games WHERE (player1_id = NEW.player2_id OR player2_id = NEW.player2_id) AND result = 'draw'),
      losses = (SELECT COUNT(*) FROM games WHERE (player1_id = NEW.player2_id OR player2_id = NEW.player2_id) AND winner_id IS NOT NULL AND winner_id != NEW.player2_id),
      total_score = (
        (SELECT COUNT(*) FROM games WHERE (player1_id = NEW.player2_id OR player2_id = NEW.player2_id) AND winner_id = NEW.player2_id) * 2 +
        (SELECT COUNT(*) FROM games WHERE (player1_id = NEW.player2_id OR player2_id = NEW.player2_id) AND result = 'draw') * 1 +
        (SELECT COUNT(*) FROM games WHERE (player1_id = NEW.player2_id OR player2_id = NEW.player2_id) AND winner_id IS NOT NULL AND winner_id != NEW.player2_id) * (-1)
      )
    WHERE id = NEW.player2_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update user stats when a game is completed
CREATE OR REPLACE TRIGGER update_stats_trigger
  AFTER UPDATE OF status ON games
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
  EXECUTE FUNCTION update_user_stats();
