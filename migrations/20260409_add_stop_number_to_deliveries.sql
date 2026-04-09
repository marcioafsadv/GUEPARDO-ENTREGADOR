-- Add stop_number column to deliveries table to allow proper sequencing of stops in a route
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS stop_number INTEGER DEFAULT 1;

-- Update items JSONB extraction comment for reference
-- The code also uses items->>'stopNumber' as a fallback
COMMENT ON COLUMN deliveries.stop_number IS 'Sequence number of the stop in a delivery route (batch).';
