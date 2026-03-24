
-- Migration to add bank details to withdrawal_requests table
-- Date: 2026-03-24

ALTER TABLE public.withdrawal_requests 
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_agency TEXT,
ADD COLUMN IF NOT EXISTS bank_account TEXT,
ADD COLUMN IF NOT EXISTS bank_type TEXT;

-- Documentation:
-- These columns store a snapshot of the bank details used for the payout
-- regardless of whether they were pre-registered or entered manually.
