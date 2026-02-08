-- Migration: Create Courier Registration Tables
-- Created: 2026-01-29
-- Description: Tables for courier onboarding: profiles, addresses, vehicles, and document storage

-- ============================================
-- 1. UPDATE PROFILES TABLE
-- ============================================

-- Add new columns to existing profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cpf TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pix_key TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS work_city TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));

-- Create index on CPF for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_cpf ON profiles(cpf);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- ============================================
-- 2. CREATE ADDRESSES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  zip_code TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT,
  complement TEXT,
  district TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id) -- One address per user
);

-- Create index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);

-- Enable RLS
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for addresses
CREATE POLICY "Users can view their own address"
  ON addresses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own address"
  ON addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own address"
  ON addresses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own address"
  ON addresses FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 3. CREATE VEHICLES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cnh_number TEXT NOT NULL,
  cnh_validity DATE NOT NULL,
  plate TEXT NOT NULL UNIQUE,
  plate_state TEXT NOT NULL,
  plate_city TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL CHECK (year >= 1900 AND year <= 2100),
  color TEXT NOT NULL,
  renavam TEXT NOT NULL,
  is_owner BOOLEAN DEFAULT true,
  cnh_front_url TEXT,
  cnh_back_url TEXT,
  crlv_url TEXT,
  bike_photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id) -- One vehicle per user
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate);

-- Enable RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vehicles
CREATE POLICY "Users can view their own vehicle"
  ON vehicles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vehicle"
  ON vehicles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vehicle"
  ON vehicles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vehicle"
  ON vehicles FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 4. CREATE STORAGE BUCKET FOR DOCUMENTS
-- ============================================

-- Note: Storage buckets are created via Supabase Dashboard or API
-- This is a reference for the bucket configuration:
-- 
-- Bucket name: courier-documents
-- Public: false
-- File size limit: 5MB
-- Allowed MIME types: image/jpeg, image/png, image/heic, application/pdf
--
-- RLS Policies (to be created in Supabase Dashboard):
-- 1. "Users can upload their own documents"
--    Operation: INSERT
--    Policy: bucket_id = 'courier-documents' AND (storage.foldername(name))[1] = auth.uid()::text
--
-- 2. "Users can view their own documents"
--    Operation: SELECT
--    Policy: bucket_id = 'courier-documents' AND (storage.foldername(name))[1] = auth.uid()::text
--
-- 3. "Users can update their own documents"
--    Operation: UPDATE
--    Policy: bucket_id = 'courier-documents' AND (storage.foldername(name))[1] = auth.uid()::text
--
-- 4. "Users can delete their own documents"
--    Operation: DELETE
--    Policy: bucket_id = 'courier-documents' AND (storage.foldername(name))[1] = auth.uid()::text

-- ============================================
-- 5. CREATE UPDATED_AT TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for addresses
DROP TRIGGER IF EXISTS update_addresses_updated_at ON addresses;
CREATE TRIGGER update_addresses_updated_at
  BEFORE UPDATE ON addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for vehicles
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE addresses IS 'Stores courier residential addresses';
COMMENT ON TABLE vehicles IS 'Stores courier vehicle and CNH (driver license) information';
COMMENT ON COLUMN profiles.status IS 'Courier approval status: pending, approved, or rejected';
COMMENT ON COLUMN profiles.work_city IS 'City where the courier operates (Praça)';
COMMENT ON COLUMN vehicles.is_owner IS 'Whether the courier owns the vehicle or rents it';
