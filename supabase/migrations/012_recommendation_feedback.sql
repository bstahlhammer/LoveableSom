-- Run in Supabase SQL editor:
-- https://supabase.com/dashboard/project/bromlnbihmfknqcdbieq/sql/new
--
-- Adds recommendation_feedback column to profiles (spec 033).
-- Nullable TEXT; existing RLS (users read/write own row) covers it automatically.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS recommendation_feedback TEXT;
