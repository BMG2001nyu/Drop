-- Migration: Add verification columns to rooms table
-- Run this in the Supabase SQL Editor

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS verification_status TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS verification_message TEXT;
