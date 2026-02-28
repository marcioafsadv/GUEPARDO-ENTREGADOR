-- Add 'name' column if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS name text;

-- Add 'vehicle_type' column if it doesn't exist (useful for filtering)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vehicle_type text;

-- Add 'full_name' column just in case (some schemas use this)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name text;

-- Update RLS policies to ensure these columns can be updated
-- (The existing "Users can update their own profile" policy covers all columns, so no change needed there)
