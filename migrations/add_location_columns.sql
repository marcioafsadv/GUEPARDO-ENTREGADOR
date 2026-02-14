-- Execute este script no SQL Editor do seu projeto Supabase

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_lat float8; -- Latitude atual
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_lng float8; -- Longitude atual
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false; -- Status online/offline
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_location_update timestamptz; -- Última atualização de local

-- Opcional: Criar um índice para consultas geoespaciais mais rápidas se planejar usar PostGIS futuramente
-- CREATE INDEX idx_profiles_location ON profiles (current_lat, current_lng);
