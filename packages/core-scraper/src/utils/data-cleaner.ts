/**
 * @module utils/data-cleaner
 * @description Centralized data cleaning utilities for scraped items and assessment payloads.
 * Ensures only meaningful, valid data reaches the Supabase upsert layer.
 *
 * KEY DESIGN PRINCIPLE:
 *   - `null`  = "field was not extracted / not applicable" (omit from payload)
 *   - `0`     = "field was extracted and the real value is zero" (keep in payload)
 *   - `false` = "boolean flag is definitively false" (keep in payload)
 */

import { log } from './logger.js';

/**
 * Fields that should ALWAYS be present in the assessment payload,
 * even when their value is null/0/false. These are required by
 * the Supabase table schema or downstream consumers.
 */
const REQUIRED_FIELDS = new Set([
    'lead_uuid',
    'dedupe_key',
    'assessment_date',
    'business_url',
    'source',
    'total_platforms_submitted',
    'platforms_list',
    'workflow_2_status',
]);

/**
 * Clean a scraped item's data object immediately after handler extraction.
 * - Converts empty strings (`''`) to `null` for string fields (except HTML/screenshot)
 * - Strips `undefined` values
 * - Preserves valid `0`, `false`, and `null`
 *
 * @param data - The handler's data output object.
 * @returns Cleaned data object.
 */
export function cleanScrapedItemData(data: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
        // Skip undefined values entirely
        if (value === undefined) continue;

        // Preserve nested objects (revenueIndicators, forensics, etc.) as-is
        if (value !== null && typeof value === 'object') {
            cleaned[key] = value;
            continue;
        }

        // Convert empty strings to null for non-HTML, non-screenshot fields
        if (typeof value === 'string' && value === '' && !key.includes('Html') && !key.includes('screenshot')) {
            cleaned[key] = null;
            continue;
        }

        cleaned[key] = value;
    }

    return cleaned;
}

/**
 * Clean the master assessment payload before Supabase upsert.
 * - Removes keys whose value is `null` (unless required)
 * - Removes keys whose value is `undefined`
 * - PRESERVES valid `0` (real zero counts) and `false` (real boolean flags)
 * - Removes empty arrays (except platforms_list)
 * - Removes empty objects
 *
 * @param masterItem - The aggregated master assessment row.
 * @returns Cleaned payload ready for Supabase upsert.
 */
export function cleanAssessmentPayload(masterItem: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};
    let removedCount = 0;

const VALID_SUPABASE_COLUMNS = new Set([
        "assessment_id", "lead_uuid", "business_url", "dedupe_key", "assessment_run_number",
        "assessment_date", "workflow_1_completed_at", "workflow_2_completed_at", "source",
        "user_email", "business_title", "business_meta_description", "business_canonical_url",
        "business_language", "business_loaded_url", "business_http_status", "business_has_ssl",
        "business_has_json_ld", "business_screenshot_url", "business_screenshot_captured_at",
        "business_scrape_success", "total_platforms_submitted", "platforms_list", "has_instagram",
        "has_twitter", "has_linkedin", "has_facebook", "has_tiktok", "has_youtube", "has_gbp",
        "has_reddit", "has_pinterest", "instagram_url", "instagram_username", "instagram_full_name",
        "instagram_biography", "instagram_external_url", "instagram_verified", "instagram_is_private",
        "instagram_followers_count", "instagram_following_count", "instagram_posts_count",
        "instagram_latest_post_date", "instagram_post_frequency_days", "instagram_has_reels",
        "instagram_engagement_rate_estimate", "instagram_screenshot_url", "instagram_scrape_date",
        "twitter_url", "twitter_username", "twitter_full_name", "twitter_biography", "twitter_verified",
        "twitter_followers_count", "twitter_following_count", "twitter_tweets_count",
        "twitter_latest_tweet_date", "twitter_tweet_frequency_days", "twitter_has_media_tweets",
        "twitter_screenshot_url", "twitter_scrape_date", "linkedin_url", "linkedin_full_name",
        "linkedin_headline", "linkedin_location", "linkedin_connections_count", "linkedin_followers_count",
        "linkedin_company_name", "linkedin_has_recent_activity", "linkedin_screenshot_url",
        "linkedin_scrape_date", "facebook_url", "facebook_page_name", "facebook_category",
        "facebook_likes_count", "facebook_followers_count", "facebook_checkins_count",
        "facebook_posts_count", "facebook_latest_post_date", "facebook_has_reviews",
        "facebook_screenshot_url", "facebook_scrape_date", "tiktok_url", "tiktok_username",
        "tiktok_display_name", "tiktok_biography", "tiktok_verified", "tiktok_followers_count",
        "tiktok_following_count", "tiktok_likes_count", "tiktok_videos_count",
        "tiktok_latest_video_date", "tiktok_video_frequency_days", "tiktok_screenshot_url",
        "tiktok_scrape_date", "youtube_url", "youtube_channel_name", "youtube_channel_handle",
        "youtube_description", "youtube_subscribers_count", "youtube_videos_count", "youtube_views_count",
        "youtube_latest_video_date", "youtube_video_frequency_days", "youtube_has_shorts",
        "youtube_screenshot_url", "youtube_scrape_date", "gbp_url", "gbp_business_name", "gbp_category",
        "gbp_rating", "gbp_reviews_count", "gbp_address", "gbp_phone", "gbp_website", "gbp_has_photos",
        "gbp_screenshot_url", "gbp_scrape_date", "reddit_url", "reddit_username", "reddit_karma",
        "reddit_post_karma", "reddit_comment_karma", "reddit_account_age_days", "reddit_posts_count",
        "reddit_latest_activity_date", "reddit_screenshot_url", "reddit_scrape_date", "pinterest_url",
        "pinterest_username", "pinterest_full_name", "pinterest_followers_count", "pinterest_following_count",
        "pinterest_pins_count", "pinterest_boards_count", "pinterest_monthly_views", "pinterest_screenshot_url",
        "pinterest_scrape_date", "awareness_multi_platform_presence_count", "awareness_multi_platform_score",
        "awareness_has_link_in_bio", "awareness_business_domain_exists", "awareness_ssl_certificate_present",
        "awareness_short_form_video_detected", "awareness_video_platforms_list", "awareness_stage_machine_score",
        "consideration_website_complexity_score", "consideration_has_case_studies", "consideration_has_testimonials",
        "consideration_form_detected", "consideration_stage_machine_score", "decision_gbp_rating_score",
        "decision_gbp_reviews_count", "decision_facebook_reviews_score", "decision_ssl_present",
        "decision_stage_machine_score", "conversion_mobile_optimized", "conversion_stage_machine_score",
        "retention_stage_machine_score", "overall_machine_score_average", "overall_machine_score_percentage",
        "overall_tier_automated", "h_awareness_signal_enrichment_tools", "h_awareness_first_party_data_strategy",
        "h_awareness_target_persona_communities", "h_awareness_content_strategy", "h_consideration_interactive_tools",
        "h_consideration_lead_nurturing_workflow", "h_consideration_lead_scoring_system",
        "h_consideration_consent_collection", "h_decision_retargeting_campaigns", "h_decision_pricing_transparency",
        "h_decision_reputation_management", "h_decision_guided_selling_process", "h_conversion_speed_to_lead",
        "h_conversion_quote_to_cash_process", "h_conversion_mobile_checkout", "h_conversion_account_assignment",
        "h_conversion_activation_milestones", "h_retention_usage_telemetry", "h_retention_nrr_tracking",
        "h_retention_referral_program", "h_retention_health_feedback", "h_retention_expansion_playbook",
        "h_retention_champion_tracking", "workflow_2_status", "human_questions_submitted",
        "human_questions_submitted_at", "final_score_calculated", "final_score_calculated_at",
        "results_email_sent", "results_email_sent_at", "upsell_link_clicked", "upsell_form_completed",
        "raw_leads_ids_processed", "created_at", "updated_at", "stage_1_awareness_score",
        "stage_2_consideration_score", "stage_3_decision_score", "stage_4_conversion_score",
        "stage_5_retention_score", "overall_score", "digital_presence_score", "digital_presence_tier",
        "stage_1_automated_score", "stage_2_automated_score", "stage_3_automated_score",
        "stage_4_automated_score", "stage_5_automated_score", "stage_1_human_score", "stage_2_human_score",
        "stage_3_human_score", "stage_4_human_score", "stage_5_human_score", "stage_1_final_score",
        "stage_2_final_score", "stage_3_final_score", "stage_4_final_score", "stage_5_final_score",
        "overall_tier", "indicator_1_7_connectivity_score", "indicator_1_7_consistency_score",
        "unified_ecosystem_score", "connectivity_matrix", "platforms_connected", "connectivity_gaps",
        "profile_image_consistency_score", "bio_consistency_score", "name_consistency_score",
        "activity_recency_score", "serp_ranking_position", "serp_keyword_used", "serp_check_date",
        "content_freshness_days", "content_freshness_status", "latest_blog_post_date", "link_in_bio_url",
        "link_in_bio_service", "link_in_bio_links_count", "link_in_bio_platforms_linked",
        "link_in_bio_has_newsletter", "link_in_bio_has_products", "digital_presence_tier_v2",
        "overall_tier_v2", "twitter_activity_status", "twitter_days_since_post", "instagram_activity_status",
        "instagram_days_since_post", "linkedin_activity_status", "linkedin_days_since_post",
        "facebook_activity_status", "facebook_days_since_post", "tiktok_activity_status",
        "tiktok_days_since_post", "youtube_activity_status", "youtube_days_since_post", "has_video_instagram",
        "has_video_tiktok", "has_video_youtube", "has_video_twitter", "video_platforms_count",
        "youtube_verified", "has_google_business_profile", "rag_interpretation_complete",
        "rag_recommendations", "rag_processing_timestamp", "gemini_tokens_used", "link_in_bio_domain",
        "seo_ranking_position", "has_google_analytics", "has_newsletter_signup", "has_email_in_bio",
        "has_lead_magnet", "profile_image_similarity_score", "bio_similarity_score",
        "consideration_roi_calculator_detected", "has_privacy_policy", "has_cookie_banner",
        "decision_pricing_page_detected", "is_ai_ready", "has_intent_tracking", "has_instant_booking",
        "is_self_hosted", "facebook_rating", "facebook_reviews_count",
        "general_hub_crawl_report", "linkedin_crawl_report", "twitter_crawl_report",
        "instagram_crawl_report", "facebook_crawl_report", "tiktok_crawl_report",
        "pinterest_crawl_report", "youtube_crawl_report", "reddit_crawl_report",
        "google_maps_crawl_report", "google_business_profile_crawl_report"
    ]);

    for (const [key, value] of Object.entries(masterItem)) {
        // Enforce Strict Allowlist
        if (!VALID_SUPABASE_COLUMNS.has(key)) {
            removedCount++;
            continue;
        }

        // Always keep required fields
        if (REQUIRED_FIELDS.has(key)) {
            cleaned[key] = value;
            continue;
        }

        // Remove undefined
        if (value === undefined) {
            removedCount++;
            continue;
        }

        // Remove null (field was not extracted)
        if (value === null) {
            removedCount++;
            continue;
        }

        // Remove empty arrays (no data)
        if (Array.isArray(value) && value.length === 0) {
            removedCount++;
            continue;
        }

        // Remove empty objects
        if (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === 0) {
            removedCount++;
            continue;
        }

        // KEEP everything else: valid 0, false, non-empty strings, populated arrays/objects
        cleaned[key] = value;
    }

    log.info(`[DataCleaner] Removed ${removedCount} empty/null fields from assessment payload.`, {
        before: Object.keys(masterItem).length,
        after: Object.keys(cleaned).length,
    });

    return cleaned;
}
