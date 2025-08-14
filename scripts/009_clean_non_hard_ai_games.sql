-- Remove any existing easy/medium AI games from stats
-- Clean up non-hard AI games that shouldn't count for stats
DELETE FROM games 
WHERE game_type IN ('ai_easy', 'ai_medium');

-- Update the trigger to only count hard AI games for stats
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update stats for hard AI games and multiplayer games
    IF NEW.game_type = 'ai_hard' OR NEW.game_type = 'multiplayer' THEN
        -- Update player1 stats
        UPDATE users 
        SET 
            wins = wins + CASE WHEN NEW.result = 'win' THEN 1 ELSE 0 END,
            draws = draws + CASE WHEN NEW.result = 'draw' THEN 1 ELSE 0 END,
            losses = losses + CASE WHEN NEW.result = 'loss' THEN 1 ELSE 0 END,
            total_score = total_score + 
                CASE 
                    WHEN NEW.result = 'win' THEN 2
                    WHEN NEW.result = 'draw' THEN 1
                    WHEN NEW.result = 'loss' THEN -1
                    ELSE 0
                END
        WHERE id = NEW.player1_id;

        -- Update player2 stats for multiplayer games
        IF NEW.player2_id IS NOT NULL AND NEW.game_type = 'multiplayer' THEN
            UPDATE users 
            SET 
                wins = wins + CASE WHEN NEW.result = 'loss' THEN 1 ELSE 0 END,
                draws = draws + CASE WHEN NEW.result = 'draw' THEN 1 ELSE 0 END,
                losses = losses + CASE WHEN NEW.result = 'win' THEN 1 ELSE 0 END,
                total_score = total_score + 
                    CASE 
                        WHEN NEW.result = 'loss' THEN 2
                        WHEN NEW.result = 'draw' THEN 1
                        WHEN NEW.result = 'win' THEN -1
                        ELSE 0
                    END
            WHERE id = NEW.player2_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
