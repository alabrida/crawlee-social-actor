-- Supabase migration: Add explicit platform metrics columns to revenue_journey_assessments
-- For easier querying and displaying key fields on the B2B dashboard.

ALTER TABLE public.revenue_journey_assessments
    ADD COLUMN IF NOT EXISTS gbp_rating NUMERIC(2,1),
    ADD COLUMN IF NOT EXISTS gbp_category TEXT,
    ADD COLUMN IF NOT EXISTS gbp_address TEXT,
    ADD COLUMN IF NOT EXISTS gbp_phone TEXT,
    ADD COLUMN IF NOT EXISTS gbp_claimed BOOLEAN,
    
    ADD COLUMN IF NOT EXISTS tiktok_verified BOOLEAN,
    ADD COLUMN IF NOT EXISTS tiktok_followers INTEGER,
    ADD COLUMN IF NOT EXISTS tiktok_likes INTEGER,
    ADD COLUMN IF NOT EXISTS tiktok_videos INTEGER,
    ADD COLUMN IF NOT EXISTS tiktok_bio TEXT,
    ADD COLUMN IF NOT EXISTS tiktok_link TEXT,
    
    ADD COLUMN IF NOT EXISTS twitter_verified BOOLEAN,
    ADD COLUMN IF NOT EXISTS twitter_followers INTEGER,
    ADD COLUMN IF NOT EXISTS twitter_tweets INTEGER,
    ADD COLUMN IF NOT EXISTS twitter_bio TEXT,
    
    ADD COLUMN IF NOT EXISTS pinterest_followers INTEGER,
    ADD COLUMN IF NOT EXISTS pinterest_pins INTEGER,
    ADD COLUMN IF NOT EXISTS pinterest_boards INTEGER,
    
    ADD COLUMN IF NOT EXISTS youtube_subscribers INTEGER,
    ADD COLUMN IF NOT EXISTS youtube_channel_name TEXT,
    ADD COLUMN IF NOT EXISTS youtube_description TEXT,
    
    ADD COLUMN IF NOT EXISTS linkedin_followers INTEGER,
    ADD COLUMN IF NOT EXISTS linkedin_company_name TEXT,
    ADD COLUMN IF NOT EXISTS linkedin_website TEXT,
    
    ADD COLUMN IF NOT EXISTS facebook_followers INTEGER,
    ADD COLUMN IF NOT EXISTS facebook_likes INTEGER,
    
    ADD COLUMN IF NOT EXISTS instagram_followers INTEGER,
    ADD COLUMN IF NOT EXISTS instagram_posts INTEGER;
