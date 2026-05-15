
-- Migration: Add 'carro' to vehicle_type check constraint
-- Created: 2026-05-15

ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_vehicle_type_check;
ALTER TABLE vehicles ADD CONSTRAINT vehicles_vehicle_type_check CHECK (vehicle_type IN ('moto', 'bike', 'carro'));

COMMENT ON CONSTRAINT vehicles_vehicle_type_check ON vehicles IS 'Restringe os tipos de veículos permitidos: moto, bike ou carro';
