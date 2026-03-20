/**
 * @module utils/schema-mapper
 * @description Provides a 1:1 schema template for the Supabase revenue_journey_assessments table.
 * Ensures zero-logic n8n upserts by providing every required key.
 */

/**
 * Returns a blank assessment row with all 250+ columns initialized.
 */
export function getBlankAssessmentRow(): Record<string, any> {
    return {
        // IDs & Meta
        assessment_id: null,
        lead_uuid: null,
        business_url: '',
        dedupe_key: null,
        assessment_run_number: 1,
        assessment_date: new Date().toISOString(),
        workflow_1_completed_at: null,
        workflow_2_completed_at: null,
        source: 'apify_actor',
        user_email: null,
        
        // Business Hub Basics
        business_title: null,
        business_meta_description: null,
        business_canonical_url: null,
        business_language: null,
        business_loaded_url: null,
        business_http_status: null,
        business_has_ssl: false,
        business_has_json_ld: false,
        business_screenshot_url: null,
        business_screenshot_captured_at: null,
        business_scrape_success: false,
        
        // Orchestration
        total_platforms_submitted: 0,
        platforms_list: [],
        
        // Platform Presence Flags
        has_instagram: false,
        has_twitter: false,
        has_linkedin: false,
        has_facebook: false,
        has_tiktok: false,
        has_youtube: false,
        has_gbp: false,
        has_reddit: false,
        has_pinterest: false,
        has_google_business_profile: false,

        // Instagram Metrics (null = not yet assessed)
        instagram_url: null,
        instagram_username: null,
        instagram_full_name: null,
        instagram_biography: null,
        instagram_external_url: null,
        instagram_verified: false,
        instagram_is_private: false,
        instagram_followers_count: null,
        instagram_following_count: null,
        instagram_posts_count: null,
        instagram_latest_post_date: null,
        instagram_post_frequency_days: null,
        instagram_has_reels: false,
        instagram_engagement_rate_estimate: null,
        instagram_screenshot_url: null,
        instagram_scrape_date: null,
        instagram_activity_status: 'unknown',
        instagram_days_since_post: null,

        // Twitter/X Metrics (null = not yet assessed)
        twitter_url: null,
        twitter_username: null,
        twitter_full_name: null,
        twitter_biography: null,
        twitter_verified: false,
        twitter_followers_count: null,
        twitter_following_count: null,
        twitter_tweets_count: null,
        twitter_latest_tweet_date: null,
        twitter_tweet_frequency_days: null,
        twitter_has_media_tweets: false,
        twitter_screenshot_url: null,
        twitter_scrape_date: null,
        twitter_activity_status: 'unknown',
        twitter_days_since_post: null,

        // LinkedIn Metrics (null = not yet assessed)
        linkedin_url: null,
        linkedin_full_name: null,
        linkedin_headline: null,
        linkedin_location: null,
        linkedin_connections_count: null,
        linkedin_followers_count: null,
        linkedin_company_name: null,
        linkedin_has_recent_activity: false,
        linkedin_screenshot_url: null,
        linkedin_scrape_date: null,
        linkedin_activity_status: 'unknown',
        linkedin_days_since_post: null,

        // Facebook Metrics (null = not yet assessed)
        facebook_url: null,
        facebook_page_name: null,
        facebook_category: null,
        facebook_likes_count: null,
        facebook_followers_count: null,
        facebook_checkins_count: null,
        facebook_posts_count: null,
        facebook_latest_post_date: null,
        facebook_has_reviews: false,
        facebook_rating: null,
        facebook_reviews_count: null,
        facebook_screenshot_url: null,
        facebook_scrape_date: null,
        facebook_activity_status: 'unknown',
        facebook_days_since_post: null,

        // TikTok Metrics (null = not yet assessed)
        tiktok_url: null,
        tiktok_username: null,
        tiktok_display_name: null,
        tiktok_biography: null,
        tiktok_verified: false,
        tiktok_followers_count: null,
        tiktok_following_count: null,
        tiktok_likes_count: null,
        tiktok_videos_count: null,
        tiktok_latest_video_date: null,
        tiktok_video_frequency_days: null,
        tiktok_screenshot_url: null,
        tiktok_scrape_date: null,
        tiktok_activity_status: 'unknown',
        tiktok_days_since_post: null,

        // YouTube Metrics (null = not yet assessed)
        youtube_url: null,
        youtube_channel_name: null,
        youtube_channel_handle: null,
        youtube_description: null,
        youtube_subscribers_count: null,
        youtube_videos_count: null,
        youtube_views_count: null,
        youtube_latest_video_date: null,
        youtube_video_frequency_days: null,
        youtube_has_shorts: false,
        youtube_verified: false,
        youtube_screenshot_url: null,
        youtube_scrape_date: null,
        youtube_activity_status: 'unknown',
        youtube_days_since_post: null,

        // Google Business Profile (GBP) (null = not yet assessed)
        gbp_url: null,
        gbp_business_name: null,
        gbp_category: null,
        gbp_rating: null,
        gbp_reviews_count: null,
        gbp_address: null,
        gbp_phone: null,
        gbp_website: null,
        gbp_has_photos: false,
        gbp_screenshot_url: null,
        gbp_scrape_date: null,

        // Reddit Metrics (null = not yet assessed)
        reddit_url: null,
        reddit_username: null,
        reddit_karma: null,
        reddit_post_karma: null,
        reddit_comment_karma: null,
        reddit_account_age_days: null,
        reddit_posts_count: null,
        reddit_latest_activity_date: null,
        reddit_screenshot_url: null,
        reddit_scrape_date: null,

        // Pinterest Metrics (null = not yet assessed)
        pinterest_url: null,
        pinterest_username: null,
        pinterest_full_name: null,
        pinterest_followers_count: null,
        pinterest_following_count: null,
        pinterest_pins_count: null,
        pinterest_boards_count: null,
        pinterest_monthly_views: null,
        pinterest_screenshot_url: null,
        pinterest_scrape_date: null,

        // CONNECTIVITY MATRIX
        link_in_bio_url: null,
        link_in_bio_service: null,
        unified_ecosystem_score: null,
        connectivity_matrix: {},

        // Forensics & Technical Signals

        has_google_analytics: false,
        has_newsletter_signup: false,
        has_lead_magnet: false,
        has_quiz: false,
        has_privacy_policy: false,
        has_cookie_banner: false,
        has_intent_tracking: false,
        has_instant_booking: false,
        is_ai_ready: false,
        is_self_hosted: false,
        consideration_has_case_studies: false,
        consideration_has_testimonials: false,
        consideration_roi_calculator_detected: false,
        consideration_form_detected: false,
        decision_pricing_page_detected: false,
        conversion_mobile_optimized: false,

        // Human Input Fields (Isolated - Always Null)
        h_awareness_first_party_data_strategy: null,
        h_consideration_lead_scoring_system: null,
        h_decision_pricing_transparency: null,
        h_conversion_quote_to_cash_process: null,
        h_conversion_activation_milestones: null,
        h_retention_nrr_tracking: null,
        h_retention_expansion_playbook: null,
        frankenstein_index: null,
        governance_score: null,
        decision_velocity_days: null,
        
        // Workflow & Human Scoring
        workflow_2_status: 'awaiting_human',
        human_questions_submitted: false,
        human_questions_submitted_at: null,

        // Automated Scores (Placeholders)
        stage_1_automated_score: null,
        stage_2_automated_score: null,
        stage_3_automated_score: null,
        stage_4_automated_score: null,
        stage_5_automated_score: null,
        overall_machine_score_percentage: null,
        overall_tier_automated: null,
        digital_presence_score: null,
        
        // SEO/SERP (null = not yet assessed)
        serp_ranking_position: null,
        serp_keyword_used: null,
        serp_check_date: null,
        seo_ranking_position: null,

        // AI/RAG Hooks
        rag_interpretation_complete: false,
        rag_recommendations: null,
        rag_processing_timestamp: null,
        gemini_tokens_used: null,
    };
}
