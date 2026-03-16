# Workflow — Deep Link & Strategy Audit

> **Objective:** Follow bio links and link-trees to identify user link strategies and backlink quality.

---

## 1. Trigger
This workflow is triggered when a platform handler (e.g., TikTok, Instagram) extracts a `linkInBio`.

## 2. Phase: 🔍 FOLLOW — Redirection Chain
**Role:** Link-Strategist Agent
1. Use a lightweight request to follow the URL.
2. Record all 301/302 hops.
3. Identify final destination domain.

## 3. Phase: 📊 AUDIT — Strategy Detection
**Role:** Link-Strategist Agent
1. Detect UTM parameters in final URL.
2. Detect Link-tree services (Linktree, Beacons, Koji).
3. If Link-tree: Crawl the link-tree page to find other social profiles.

## 4. Phase: ⭐ RATE — Quality Check
**Role:** Link-Strategist Agent
1. Check destination for SSL.
2. Verify Meta title/description presence.
3. Report "Link Strategy Score" based on tracking and optimization.
