-- Migration: add close_time to store_inspections
ALTER TABLE public.store_inspections
  ADD COLUMN IF NOT EXISTS close_time time without time zone;
