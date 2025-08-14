-- Completely disable RLS on users table to fix signup issues
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Also ensure the table has the correct structure
ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();
