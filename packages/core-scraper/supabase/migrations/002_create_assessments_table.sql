-- Supabase migration: Re-create revenue_journey_assessments with clean hybrid V2 schema
-- Replaces the obsolete 250-column monolith table.

-- Drop existing table if it exists (warning: drops existing data)
DROP TABLE IF EXISTS public.revenue_journey_assessments;

CREATE TABLE public.revenue_journey_assessments (
    assessment_id UUID PRIMARY KEY,
    business_url TEXT NOT NULL,
    brand_name TEXT NOT NULL,
    business_class TEXT NOT NULL,
    business_class_confidence NUMERIC(3, 2) NOT NULL,
    assessment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_channel TEXT NOT NULL DEFAULT 'actor_run',
    
    -- Stage headline scores (0.0 to 10.0 scale)
    awareness_score NUMERIC(3, 1) NOT NULL,
    consideration_score NUMERIC(3, 1) NOT NULL,
    decision_score NUMERIC(3, 1) NOT NULL,
    conversion_score NUMERIC(3, 1) NOT NULL,
    retention_score NUMERIC(3, 1) NOT NULL,
    overall_score NUMERIC(3, 1) NOT NULL,
    
    -- Quick Reference Metrics
    platforms_found TEXT[] NOT NULL DEFAULT '{}',
    total_platforms INTEGER NOT NULL DEFAULT 0,
    weakest_stage TEXT NOT NULL,
    strongest_stage TEXT NOT NULL,
    
    -- Nested Details and Screenshots
    screenshots JSONB NOT NULL DEFAULT '{}'::jsonb,
    assessment_detail JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Index for common queries by business URL and date
CREATE INDEX idx_rj_assessments_business_url ON public.revenue_journey_assessments(business_url);
CREATE INDEX idx_rj_assessments_date ON public.revenue_journey_assessments(assessment_date);
CREATE INDEX idx_rj_assessments_overall ON public.revenue_journey_assessments(overall_score);

-- Enable RLS
ALTER TABLE public.revenue_journey_assessments ENABLE ROW LEVEL SECURITY;

-- Allow full access for authenticated users (agents/actors operating via service role key)
CREATE POLICY "Allow full access for authenticated users"
    ON public.revenue_journey_assessments
    FOR ALL
    USING (true)
    WITH CHECK (true);
