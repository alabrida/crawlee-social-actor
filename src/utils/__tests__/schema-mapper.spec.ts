import { describe, it, expect } from 'vitest';
import { getBlankAssessmentRow } from '../schema-mapper.js';

describe('Schema Mapper', () => {
    it('should generate a blank assessment row with required IDs', () => {
        const row = getBlankAssessmentRow();

        // Assert base structure
        expect(row).toBeDefined();

        // Ensure important IDs and core configuration properties correctly default to null
        expect(row.assessment_id).toBeNull();
        expect(row.lead_uuid).toBeNull();
        expect(row.dedupe_key).toBeNull();
        expect(row.user_email).toBeNull();
        expect(row.workflow_1_completed_at).toBeNull();
        expect(row.workflow_2_completed_at).toBeNull();

        // Ensure initial statuses/settings have their proper default values
        expect(row.assessment_run_number).toBe(1);
        expect(row.source).toBe('apify_actor');
        expect(row.workflow_2_status).toBe('awaiting_human');

        // Verify default empty arrays and objects
        expect(row.platforms_list).toEqual([]);
        expect(row.connectivity_matrix).toEqual({});

        // Verify multiple platforms boolean defaults initialize to false
        expect(row.has_instagram).toBe(false);
        expect(row.has_facebook).toBe(false);
        expect(row.has_twitter).toBe(false);
        expect(row.has_linkedin).toBe(false);
        expect(row.has_tiktok).toBe(false);
        expect(row.has_youtube).toBe(false);
        expect(row.has_reddit).toBe(false);
        expect(row.has_pinterest).toBe(false);
        expect(row.has_gbp).toBe(false);
        expect(row.has_google_business_profile).toBe(false);

        // Technical signals
        expect(row.business_has_ssl).toBe(false);
        expect(row.business_has_json_ld).toBe(false);
        expect(row.business_scrape_success).toBe(false);

        // Numeric counts should default to null (not 0) — indicates "not yet assessed"
        expect(row.instagram_followers_count).toBeNull();
        expect(row.twitter_followers_count).toBeNull();
        expect(row.tiktok_followers_count).toBeNull();
        expect(row.youtube_subscribers_count).toBeNull();
        expect(row.reddit_karma).toBeNull();
        expect(row.pinterest_followers_count).toBeNull();
        expect(row.gbp_rating).toBeNull();
        expect(row.gbp_reviews_count).toBeNull();
    });

    it('should match the snapshot of the entire assessment row', () => {
        const row = getBlankAssessmentRow();

        // assessment_date is dynamic, so we explicitly mock it or replace it
        // so the snapshot doesn't change every time it runs.
        const rowForSnapshot = {
            ...row,
            assessment_date: '2025-01-01T00:00:00.000Z'
        };

        expect(rowForSnapshot).toMatchInlineSnapshot(`
          {
            "assessment_date": "2025-01-01T00:00:00.000Z",
            "assessment_id": null,
            "assessment_run_number": 1,
            "booking_redirect_url": null,
            "business_canonical_url": null,
            "business_has_json_ld": false,
            "business_has_ssl": false,
            "business_http_status": null,
            "business_language": null,
            "business_loaded_url": null,
            "business_meta_description": null,
            "business_scrape_success": false,
            "business_screenshot_captured_at": null,
            "business_screenshot_url": null,
            "business_title": null,
            "business_url": "",
            "connectivity_matrix": {},
            "consideration_form_detected": false,
            "consideration_has_testimonials": false,
            "consideration_roi_calculator_detected": false,
            "conversion_mobile_optimized": false,
            "count_case_studies": null,
            "count_pages": null,
            "decision_pricing_page_detected": false,
            "decision_velocity_days": null,
            "dedupe_key": null,
            "digital_presence_score": null,
            "expansion_triggers_detected": false,
            "facebook_activity_status": "unknown",
            "facebook_category": null,
            "facebook_checkins_count": null,
            "facebook_days_since_post": null,
            "facebook_followers_count": null,
            "facebook_has_reviews": false,
            "facebook_latest_post_date": null,
            "facebook_likes_count": null,
            "facebook_page_name": null,
            "facebook_posts_count": null,
            "facebook_scrape_date": null,
            "facebook_screenshot_url": null,
            "facebook_url": null,
            "frankenstein_index": null,
            "gbp_address": null,
            "gbp_business_name": null,
            "gbp_category": null,
            "gbp_has_photos": false,
            "gbp_phone": null,
            "gbp_rating": null,
            "gbp_reviews_count": null,
            "gbp_scrape_date": null,
            "gbp_screenshot_url": null,
            "gbp_url": null,
            "gbp_website": null,
            "gemini_tokens_used": null,
            "governance_score": null,
            "h_awareness_first_party_data_strategy": null,
            "h_consideration_lead_scoring_system": null,
            "h_conversion_activation_milestones": null,
            "h_conversion_quote_to_cash_process": null,
            "h_decision_pricing_transparency": null,
            "h_retention_expansion_playbook": null,
            "h_retention_nrr_tracking": null,
            "has_billing_system": false,
            "has_blog": false,
            "has_calendly": false,
            "has_client_login": false,
            "has_community_link": false,
            "has_contact_form": false,
            "has_cookie_banner": false,
            "has_docusign_link": false,
            "has_downloadable_guide": false,
            "has_facebook": false,
            "has_facebook_in_bio": false,
            "has_gbp": false,
            "has_google_analytics": false,
            "has_google_business_profile": false,
            "has_instagram": false,
            "has_instagram_in_bio": false,
            "has_instant_booking": false,
            "has_intent_tracking": false,
            "has_lead_magnet": false,
            "has_linkedin": false,
            "has_linkedin_in_bio": false,
            "has_logos": false,
            "has_newsletter_signup": false,
            "has_pinterest": false,
            "has_podcasts": false,
            "has_pricing_page": false,
            "has_privacy_policy": false,
            "has_quiz": false,
            "has_reddit": false,
            "has_stripe_integration": false,
            "has_support_portal": false,
            "has_tiktok": false,
            "has_tiktok_in_bio": false,
            "has_twitter": false,
            "has_twitter_in_bio": false,
            "has_video_testimonials": false,
            "has_webinar": false,
            "has_welcome_sequence": false,
            "has_youtube": false,
            "has_youtube_in_bio": false,
            "human_questions_submitted": false,
            "human_questions_submitted_at": null,
            "instagram_activity_status": "unknown",
            "instagram_biography": null,
            "instagram_days_since_post": null,
            "instagram_engagement_rate_estimate": null,
            "instagram_external_url": null,
            "instagram_followers_count": null,
            "instagram_following_count": null,
            "instagram_full_name": null,
            "instagram_has_reels": false,
            "instagram_is_private": false,
            "instagram_latest_post_date": null,
            "instagram_post_frequency_days": null,
            "instagram_posts_count": null,
            "instagram_scrape_date": null,
            "instagram_screenshot_url": null,
            "instagram_url": null,
            "instagram_username": null,
            "instagram_verified": false,
            "is_ai_ready": false,
            "is_portal_accessible": false,
            "is_self_hosted": false,
            "lead_uuid": null,
            "link_in_bio_service": null,
            "link_in_bio_url": null,
            "linkedin_activity_status": "unknown",
            "linkedin_company_name": null,
            "linkedin_connections_count": null,
            "linkedin_days_since_post": null,
            "linkedin_followers_count": null,
            "linkedin_full_name": null,
            "linkedin_has_recent_activity": false,
            "linkedin_headline": null,
            "linkedin_location": null,
            "linkedin_scrape_date": null,
            "linkedin_screenshot_url": null,
            "linkedin_url": null,
            "overall_machine_score_percentage": null,
            "overall_tier_automated": null,
            "payload_size_kb": null,
            "payment_gateway_detected": false,
            "pinterest_boards_count": null,
            "pinterest_followers_count": null,
            "pinterest_following_count": null,
            "pinterest_full_name": null,
            "pinterest_monthly_views": null,
            "pinterest_pins_count": null,
            "pinterest_scrape_date": null,
            "pinterest_screenshot_url": null,
            "pinterest_url": null,
            "pinterest_username": null,
            "platforms_list": [],
            "qualification_field_presence": false,
            "rag_interpretation_complete": false,
            "rag_processing_timestamp": null,
            "rag_recommendations": null,
            "reddit_account_age_days": null,
            "reddit_comment_karma": null,
            "reddit_karma": null,
            "reddit_latest_activity_date": null,
            "reddit_post_karma": null,
            "reddit_posts_count": null,
            "reddit_scrape_date": null,
            "reddit_screenshot_url": null,
            "reddit_url": null,
            "reddit_username": null,
            "referral_program_detected": false,
            "seo_ranking_position": null,
            "serp_check_date": null,
            "serp_keyword_used": null,
            "serp_ranking_position": null,
            "source": "apify_actor",
            "stage_1_automated_score": null,
            "stage_2_automated_score": null,
            "stage_3_automated_score": null,
            "stage_4_automated_score": null,
            "stage_5_automated_score": null,
            "tiktok_activity_status": "unknown",
            "tiktok_biography": null,
            "tiktok_days_since_post": null,
            "tiktok_display_name": null,
            "tiktok_followers_count": null,
            "tiktok_following_count": null,
            "tiktok_latest_video_date": null,
            "tiktok_likes_count": null,
            "tiktok_scrape_date": null,
            "tiktok_screenshot_url": null,
            "tiktok_url": null,
            "tiktok_username": null,
            "tiktok_verified": false,
            "tiktok_video_frequency_days": null,
            "tiktok_videos_count": null,
            "total_platforms_submitted": 0,
            "twitter_activity_status": "unknown",
            "twitter_biography": null,
            "twitter_days_since_post": null,
            "twitter_followers_count": null,
            "twitter_following_count": null,
            "twitter_full_name": null,
            "twitter_has_media_tweets": false,
            "twitter_latest_tweet_date": null,
            "twitter_scrape_date": null,
            "twitter_screenshot_url": null,
            "twitter_tweet_frequency_days": null,
            "twitter_tweets_count": null,
            "twitter_url": null,
            "twitter_username": null,
            "twitter_verified": false,
            "unified_ecosystem_score": null,
            "user_email": null,
            "workflow_1_completed_at": null,
            "workflow_2_completed_at": null,
            "workflow_2_status": "awaiting_human",
            "youtube_activity_status": "unknown",
            "youtube_channel_handle": null,
            "youtube_channel_name": null,
            "youtube_days_since_post": null,
            "youtube_description": null,
            "youtube_has_shorts": false,
            "youtube_latest_video_date": null,
            "youtube_scrape_date": null,
            "youtube_screenshot_url": null,
            "youtube_subscribers_count": null,
            "youtube_url": null,
            "youtube_verified": false,
            "youtube_video_frequency_days": null,
            "youtube_videos_count": null,
            "youtube_views_count": null,
          }
        `);
    });

    it('should include new UCE V3.9 rubric fields', () => {
        const row = getBlankAssessmentRow();

        // Technical Vitals
        expect(row).toHaveProperty('payload_size_kb', null);
        expect(row).toHaveProperty('business_http_status', null);

        // Orchestration
        expect(row.platforms_list).toEqual([]);
        expect(row.total_platforms_submitted).toBe(0);

        // Connectivity Matrix
        expect(row).toHaveProperty('has_instagram_in_bio', false);
        expect(row.connectivity_matrix).toEqual({});
        expect(row.unified_ecosystem_score).toBeNull();

        // Phase 2 Consideration
        expect(row).toHaveProperty('consideration_roi_calculator_detected', false);
        expect(row).toHaveProperty('has_contact_form', false);

        // Retention & Expansion
        expect(row).toHaveProperty('referral_program_detected', false);
        expect(row).toHaveProperty('expansion_triggers_detected', false);

        // Human Assessment (H_) Fields
        expect(row).toHaveProperty('frankenstein_index', null);
        expect(row).toHaveProperty('governance_score', null);
        expect(row).toHaveProperty('decision_velocity_days', null);

        // GBP Specifics
        expect(row).toHaveProperty('has_gbp', false);
        expect(row).toHaveProperty('gbp_url', null);
    });
});
