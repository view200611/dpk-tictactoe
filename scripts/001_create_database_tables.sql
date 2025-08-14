-- Create users table with proper structure for Supabase auth integration
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  wins INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create games table to track all game results
CREATE TABLE IF NOT EXISTS public.games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player1_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  player2_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  winner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  game_type TEXT NOT NULL CHECK (game_type IN ('ai_easy', 'ai_medium', 'ai_hard', 'multiplayer')),
  result TEXT NOT NULL CHECK (result IN ('win', 'loss', 'draw')),
  board_state JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rooms table for multiplayer functionality
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT UNIQUE NOT NULL,
  creator_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  player1_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  player2_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'completed')),
  current_player TEXT DEFAULT 'X' CHECK (current_player IN ('X', 'O')),
  board_state JSONB DEFAULT '["","","","","","","","",""]',
  winner TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to update user stats automatically
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update stats for player1
  IF NEW.player1_id IS NOT NULL THEN
    UPDATE public.users 
    SET 
      wins = CASE WHEN NEW.winner_id = NEW.player1_id THEN wins + 1 ELSE wins END,
      draws = CASE WHEN NEW.winner_id IS NULL THEN draws + 1 ELSE draws END,
      losses = CASE WHEN NEW.winner_id IS NOT NULL AND NEW.winner_id != NEW.player1_id THEN losses + 1 ELSE losses END,
      total_score = 
        (CASE WHEN NEW.winner_id = NEW.player1_id THEN wins + 1 ELSE wins END) * 2 +
        (CASE WHEN NEW.winner_id IS NULL THEN draws + 1 ELSE draws END) * 1 +
        (CASE WHEN NEW.winner_id IS NOT NULL AND NEW.winner_id != NEW.player1_id THEN losses + 1 ELSE losses END) * (-1),
      updated_at = NOW()
    WHERE id = NEW.player1_id;
  END IF;

  -- Update stats for player2 (only for multiplayer games)
  IF NEW.player2_id IS NOT NULL THEN
    UPDATE public.users 
    SET 
      wins = CASE WHEN NEW.winner_id = NEW.player2_id THEN wins + 1 ELSE wins END,
      draws = CASE WHEN NEW.winner_id IS NULL THEN draws + 1 ELSE draws END,
      losses = CASE WHEN NEW.winner_id IS NOT NULL AND NEW.winner_id != NEW.player2_id THEN losses + 1 ELSE losses END,
      total_score = 
        (CASE WHEN NEW.winner_id = NEW.player2_id THEN wins + 1 ELSE wins END) * 2 +
        (CASE WHEN NEW.winner_id IS NULL THEN draws + 1 ELSE draws END) * 1 +
        (CASE WHEN NEW.winner_id IS NOT NULL AND NEW.winner_id != NEW.player2_id THEN losses + 1 ELSE losses END) * (-1),
      updated_at = NOW()
    WHERE id = NEW.player2_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update user stats when games are inserted
CREATE OR REPLACE TRIGGER update_user_stats_trigger
  AFTER INSERT ON public.games
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats();

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view all profiles" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Create policies for games table
CREATE POLICY "Users can view their own games" ON public.games FOR SELECT USING (auth.uid() = player1_id OR auth.uid() = player2_id);
CREATE POLICY "Users can insert their own games" ON public.games FOR INSERT WITH CHECK (auth.uid() = player1_id);

-- Create policies for rooms table
CREATE POLICY "Users can view all rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Users can create rooms" ON public.rooms FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Users can update rooms they're part of" ON public.rooms FOR UPDATE USING (auth.uid() = creator_id OR auth.uid() = player1_id OR auth.uid() = player2_id);
