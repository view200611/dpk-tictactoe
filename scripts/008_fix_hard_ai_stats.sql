-- Fix hard AI stats tracking by ensuring all AI games are properly recorded
-- and update user stats triggers to include all game types

-- Update the trigger function to properly handle all AI game types
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update stats for player1 (always the human player in AI games)
  UPDATE users 
  SET 
    wins = (
      SELECT COUNT(*) FROM games 
      WHERE (player1_id = NEW.player1_id OR player2_id = NEW.player1_id) 
      AND status = 'completed' 
      AND (
        (player1_id = NEW.player1_id AND result = 'win') OR
        (player2_id = NEW.player1_id AND result = 'loss')
      )
    ),
    draws = (
      SELECT COUNT(*) FROM games 
      WHERE (player1_id = NEW.player1_id OR player2_id = NEW.player1_id) 
      AND status = 'completed' 
      AND result = 'draw'
    ),
    losses = (
      SELECT COUNT(*) FROM games 
      WHERE (player1_id = NEW.player1_id OR player2_id = NEW.player1_id) 
      AND status = 'completed' 
      AND (
        (player1_id = NEW.player1_id AND result = 'loss') OR
        (player2_id = NEW.player1_id AND result = 'win')
      )
    )
  WHERE id = NEW.player1_id;

  -- Calculate total score: wins * 2 + draws * 1 + losses * (-1)
  UPDATE users 
  SET total_score = (wins * 2) + (draws * 1) + (losses * -1)
  WHERE id = NEW.player1_id;

  -- Update stats for player2 if it exists and is not AI
  IF NEW.player2_id IS NOT NULL AND NEW.game_type = 'multiplayer' THEN
    UPDATE users 
    SET 
      wins = (
        SELECT COUNT(*) FROM games 
        WHERE (player1_id = NEW.player2_id OR player2_id = NEW.player2_id) 
        AND status = 'completed' 
        AND (
          (player1_id = NEW.player2_id AND result = 'win') OR
          (player2_id = NEW.player2_id AND result = 'loss')
        )
      ),
      draws = (
        SELECT COUNT(*) FROM games 
        WHERE (player1_id = NEW.player2_id OR player2_id = NEW.player2_id) 
        AND status = 'completed' 
        AND result = 'draw'
      ),
      losses = (
        SELECT COUNT(*) FROM games 
        WHERE (player1_id = NEW.player2_id OR player2_id = NEW.player2_id) 
        AND status = 'completed' 
        AND (
          (player1_id = NEW.player2_id AND result = 'loss') OR
          (player2_id = NEW.player2_id AND result = 'win')
        )
      )
    WHERE id = NEW.player2_id;

    -- Calculate total score for player2
    UPDATE users 
    SET total_score = (wins * 2) + (draws * 1) + (losses * -1)
    WHERE id = NEW.player2_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS update_user_stats_trigger ON games;
CREATE TRIGGER update_user_stats_trigger
  AFTER INSERT OR UPDATE ON games
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION update_user_stats();
