# Workflow — Twitter/X Onboarding

> **Objective:** Securely implement the Twitter/X profile extractor using session injection.

---

## 1. Phase: 🔴 RED — Auth Boundary Identification
**Role:** Anti-Bot Agent
1. Probe profile URLs without cookies.
2. Confirm `BLOCK-014` (Login Wall).
3. Document any CAPTCHA or "Something went wrong" triggers.

## 2. Phase: 🟢 GREEN — Baseline Extraction
**Role:** PW-Twitter Agent
1. Implement `src/handlers/twitter.ts`.
2. Map `auth_token` and `ct0` cookies for injection.
3. Extract raw signals: Follower string, Verified status, Latest tweet date.

## 3. Phase: 🟣 ENRICH — Data Structuring
**Role:** Math-Steward Agent
1. Transform follower string (e.g., "1.2M") to integer.
2. Calculate `days_since_latest_tweet`.
3. Set `twitter_activity_status` based on recency.

## 4. Phase: 🔵 HARDEN — Resilience Test
**Role:** Integration Lead
1. Run against 10 diverse profiles.
2. Measure CU consumption.
3. Verify session retirement on cookie invalidation.
