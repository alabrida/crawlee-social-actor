# Specification: Discovery Form Payload & UI Mapping

> **Purpose:** Technical reference for building the Discovery UI (Google Stitch) and the n8n ingestion workflow. This payload bridges the gap between human input and automated scraping.

---

## 1. Payload Architecture
The form submission must send a single JSON object to the n8n webhook. This data is split into three functional zones:
1.  **Actor Inputs:** Used to trigger the Apify scraper.
2.  **Human Signals:** Narrative answers for the `h_` columns in Supabase.
3.  **Glue Metadata:** Unique identifiers to ensure data consistency.

---

## 2. Zone 1: Business Identity (Actor Inputs)
*These fields drive the automated research engine.*

| UI Label | Payload Key | Type | Description |
| :--- | :--- | :--- | :--- |
| **Business Website** | `businessUrl` | URL | The primary "Hub" domain (e.g., https://acme.com) |
| **Brand Name** | `brandName` | Text | Official business name for SEO checks. |
| **Primary Keyword** | `targetKeywords` | Array | The #1 keyword they want to rank for. |
| **Instagram @** | `ig_handle` | Text | (Optional) Profile override. |
| **LinkedIn URL** | `li_url` | URL | (Optional) Company page override. |
| **Facebook URL** | `fb_url` | URL | (Optional) Profile override. |
| **Twitter (X) @** | `twitter_handle` | Text | (Optional) Profile override. |
| **TikTok @** | `tiktok_handle` | Text | (Optional) Profile override. |
| **YouTube URL** | `yt_url` | URL | (Optional) Channel URL override. |
| **Pinterest URL** | `pinterest_url` | URL | (Optional) Profile override. |
| **Reddit URL** | `reddit_url` | URL | (Optional) Subreddit or Profile URL override. |
| **Google Maps URL** | `gmaps_url` | URL | (Optional) GMB profile URL override. |

---

## 3. Zone 2: Discovery Questions (Human Signals)
*Answers to these questions are mapped directly to Supabase narrative columns.*

### Awareness Stage
*   **Question:** *"What tools do you currently use to identify or enrich visitor data (e.g., Apollo, Clearbit)?"*
    *   **Key:** `h_awareness_signal_enrichment_tools`
*   **Question:** *"Which online communities or groups is your target persona most active in?"*
    *   **Key:** `h_awareness_target_persona_communities`
*   **Question:** *"What is the #1 problem your current content strategy solves for your audience?"*
    *   **Key:** `h_awareness_content_strategy`

### Consideration & Decision
*   **Question:** *"Do you offer any calculators, quizzes, or interactive tools to engage prospects?"*
    *   **Key:** `h_consideration_interactive_tools`
*   **Question:** *"How do you currently rank or score leads based on their activity?"*
    *   **Key:** `h_consideration_lead_scoring_system`
*   **Question:** *"Is your pricing fully transparent on your site, or does it require a custom quote?"*
    *   **Key:** `h_decision_pricing_transparency`

### Conversion & Retention
*   **Question:** *"How long does it currently take for a sales rep to contact a new lead (minutes/hours)?"*
    *   **Key:** `h_conversion_speed_to_lead`
*   **Question:** *"What is the 'Aha! Moment' a new customer must reach to be considered successful?"*
    *   **Key:** `h_conversion_activation_milestones`
*   **Question:** *"What is your current process for identifying upsell or cross-sell opportunities?"*
    *   **Key:** `h_retention_expansion_playbook`

---

## 4. Zone 3: Hidden Metadata (The Glue)
*These fields should be passed as hidden inputs in the Stitch form.*

| Key | Source | Description |
| :--- | :--- | :--- |
| `lead_uuid` | URL Parameter | Links the form submission to the pre-created lead record. |
| `source` | Static String | Set to `stitch_discovery_form`. |
| `user_email` | Form Input | The prospect's email address. |

---

## 5. Sample JSON Structure (On Submit)
```json
{
  "lead_uuid": "UUID-FROM-URL",
  "businessUrl": "https://example.com",
  "brandName": "Example Corp",
  "targetKeywords": ["Marketing Automation"],
  "user_email": "client@example.com",
  "ig_handle": "@example",
  "li_url": "https://linkedin.com/company/example",
  "fb_url": "https://facebook.com/example",
  "twitter_handle": "@example",
  "tiktok_handle": "@example",
  "yt_url": "https://youtube.com/@example",
  "pinterest_url": "https://pinterest.com/example",
  "reddit_url": "https://reddit.com/r/example",
  "gmaps_url": "https://maps.google.com/?cid=...",
  "h_awareness_signal_enrichment_tools": "...",
  "h_awareness_target_persona_communities": "...",
  "h_awareness_content_strategy": "...",
  "h_consideration_interactive_tools": "...",
  "h_consideration_lead_scoring_system": "...",
  "h_decision_pricing_transparency": "...",
  "h_conversion_speed_to_lead": "...",
  "h_conversion_activation_milestones": "...",
  "h_retention_expansion_playbook": "..."
}
```
