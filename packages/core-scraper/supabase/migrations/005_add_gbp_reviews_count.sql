-- Supabase migration: Add gbp_reviews_count to revenue_journey_assessments.
-- The GBP review count drives the reviews_ratings scoring mechanism (consideration stage)
-- and the dashboard's social-proof KPI, but only gbp_rating had a column — so the count was
-- dropped on upsert even after extraction + scoring were fixed.

ALTER TABLE public.revenue_journey_assessments
    ADD COLUMN IF NOT EXISTS gbp_reviews_count INTEGER;
