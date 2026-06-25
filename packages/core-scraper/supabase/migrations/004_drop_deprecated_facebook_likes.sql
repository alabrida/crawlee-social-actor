-- Supabase migration: drop the deprecated facebook_likes metric.
-- Facebook merged public Page "likes" into "followers" years ago, so the column has
-- no live data source. facebook_followers carries the real engagement metric.
-- Idempotent: safe whether or not 003 added the column to this database.

ALTER TABLE public.revenue_journey_assessments
    DROP COLUMN IF EXISTS facebook_likes;
