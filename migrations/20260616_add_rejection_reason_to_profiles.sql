-- Migration: Add rejection_reason column to profiles table
-- Description: Allows storing specific reasons when a courier registration is rejected.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
