-- Disable RLS temporarily and create automatic user profile creation
-- Disable RLS on users table to prevent policy violations
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function to automatically create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  user_username TEXT;
BEGIN
  -- Get email from the new auth user
  user_email := NEW.email;
  
  -- Extract username from email (before @) as fallback
  user_username := split_part(user_email, '@', 1);
  
  -- Try to get username from raw_user_meta_data if available
  IF NEW.raw_user_meta_data ? 'username' THEN
    user_username := NEW.raw_user_meta_data->>'username';
  END IF;
  
  -- Insert user profile
  INSERT INTO public.users (id, username, email, wins, draws, losses, total_score, created_at)
  VALUES (
    NEW.id,
    user_username,
    user_email,
    0,
    0,
    0,
    0,
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile when auth user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Re-enable RLS with proper policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create simple RLS policies
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Allow public read for leaderboard
CREATE POLICY "Public can view leaderboard data" ON public.users
  FOR SELECT USING (true);
