-- Migration: Add Email to Profiles and Backfill
-- Created: 2026-06-15
-- Description: Add email column to profiles table and backfill from auth.users

-- 1. Adicionar coluna email à tabela profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Backfill para atualizar os e-mails existentes com base na tabela auth.users
UPDATE profiles
SET email = auth.users.email
FROM auth.users
WHERE profiles.id = auth.users.id AND profiles.email IS NULL;
