# Phase 2 — Comprehensive Gap Map

This document cross-references every column in the Supabase `revenue_journey_assessments` table against our current Actor capability.

## 1. Global Presence & Calculations
These fields require the Actor to aggregate data across all 9+ platforms after extraction.

| Supabase Column | Status | Strategy |
| :--- | :--- | :--- |
| `total_platforms_submitted` | Missing | Array length of `input.platforms`. |
| `platforms_list` | Missing | Array of unique platform keys found. |
| `awareness_multi_platform_presence_count` | Missing | Count of successfully scraped social platforms. |
| `awareness_multi_platform_score` | Missing | Derived numeric score (e.g., platforms / total * 100). |
| `platforms_connected` | Missing | Intersection of bio links found on platforms. |
| `connectivity_gaps` | Missing | Platforms where bio links were not found. |

## 2. Business "Hub" Forensics (The General Extractor)
Enriching the `General` website handler to detect deep technical signals.

| Supabase Column | Status | Strategy |
| :--- | :--- | :--- |
| `business_has_ssl` | Missing | Boolean check on `https` protocol. |
| `business_has_json_ld` | Missing | Selector check for `application/ld+json`. |
| `has_google_analytics` | Missing | Regex check for `UA-` or `G-` tags in HTML. |
| `has_newsletter_signup` | Missing | Keyword check for "newsletter", "subscribe" + form detection. |
| `has_lead_magnet` | Missing | Keyword check for "guide", "whitepaper", "checklist". |
| `has_privacy_policy` | Missing | Anchor tag check for "Privacy Policy" or `/privacy`. |
| `has_cookie_banner` | Missing | Keyword check for "cookies", "GDPR", "consent". |
| `is_ai_ready` | Missing | Logic based on JSON-LD + technical signals. |
| `has_intent_tracking` | Missing | Script detection for common pixels (Facebook, HubSpot, LinkedIn). |

## 3. Mandatory Platform: Twitter/X (NEW)
A full implementation is required to fill these 16 columns.

| Supabase Column | Status | Required Data |
| :--- | :--- | :--- |
| `twitter_followers_count` | Missing | Numeric count from profile. |
| `twitter_verified` | Missing | Boolean check for blue/gold checkmark. |
| `twitter_activity_status` | Missing | Categorical (active/stale) based on `twitter_latest_tweet_date`. |
| `has_video_twitter` | Missing | Check for media tab or recent video tweets. |
| *And 12 more...* | Missing | Full profile extraction. |

## 4. Advanced SEO / SERP
The table expects data from Google Search results, not just profile pages.

| Supabase Column | Status | Strategy |
| :--- | :--- | :--- |
| `serp_ranking_position` | Missing | **New Agent Required:** Performs a Google Search for `business_url` name and finds position. |
| `serp_keyword_used` | Missing | Records the keyword used for the SERP check. |
| `seo_ranking_position` | Missing | (Duplicate/Refinement of above). |

## 5. Structured Metric Parsing (Across all Platforms)
Turning "Revenue Indicators" (text) into high-resolution database fields.

| Supabase Column | Status | Strategy |
| :--- | :--- | :--- |
| `[platform]_followers_count` | Partial (text) | Numeric parser: "1.2M" -> 1,200,000. |
| `[platform]_scrape_date` | Missing | ISO timestamp of the specific platform's run. |
| `[platform]_latest_post_date` | Missing | Timestamps of the most recent item on the profile. |
| `[platform]_frequency_days` | Missing | Calculation: (Today - Latest Post) / count. |

## 6. AI/RAG Hooks
The table has placeholders for AI-generated recommendations.

| Supabase Column | Status | Strategy |
| :--- | :--- | :--- |
| `rag_recommendations` | Missing | **Post-Process:** Feed structured JSON to Gemini within the Actor. |
| `gemini_tokens_used` | Missing | Track usage of the internal LLM call. |

## 7. Isolated Human-Input Fields (Phase 3 Prep)
These fields are **explicitly excluded** from automated extraction or AI "judgement calls" to prevent data tainting. They will be included in the Actor output as `null` placeholders to maintain schema parity.

### 7.1 Narrative Response Fields (`h_` prefix)
*   **Awareness:** `h_awareness_signal_enrichment_tools`, `h_awareness_first_party_data_strategy`, `h_awareness_target_persona_communities`, `h_awareness_content_strategy`
*   **Consideration:** `h_consideration_interactive_tools`, `h_consideration_lead_nurturing_workflow`, `h_consideration_lead_scoring_system`, `h_consideration_consent_collection`
*   **Decision:** `h_decision_retargeting_campaigns`, `h_decision_pricing_transparency`, `h_decision_reputation_management`, `h_decision_guided_selling_process`
*   **Conversion:** `h_conversion_speed_to_lead`, `h_conversion_quote_to_cash_process`, `h_conversion_mobile_checkout`, `h_conversion_account_assignment`, `h_conversion_activation_milestones`
*   **Retention:** `h_retention_usage_telemetry`, `h_retention_nrr_tracking`, `h_retention_referral_program`, `h_retention_health_feedback`, `h_retention_expansion_playbook`, `h_retention_champion_tracking`

### 7.2 Human Scoring & Flags
*   **Scores:** `stage_1_human_score` through `stage_5_human_score`
*   **Metadata:** `human_questions_submitted`, `human_questions_submitted_at`

