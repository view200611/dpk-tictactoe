-- Add room expiration and cleanup functionality
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours');

-- Create function to clean up expired rooms
CREATE OR REPLACE FUNCTION cleanup_expired_rooms()
RETURNS void AS $$
BEGIN
  DELETE FROM rooms WHERE expires_at < NOW() AND status != 'completed';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set expiration when room is created
CREATE OR REPLACE FUNCTION set_room_expiration()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expires_at = NOW() + INTERVAL '24 hours';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_room_expiration_trigger
  BEFORE INSERT ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION set_room_expiration();
