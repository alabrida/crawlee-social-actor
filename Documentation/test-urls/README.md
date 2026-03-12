# Test URLs

This directory contains per-platform test URL sets used by the Anti-Bot Agent during RED probing and HARDEN edge-case sweeps.

## Structure

One file per platform:

| File | Phase Usage |
|---|---|
| `tiktok.txt` | RED (3 URLs), HARDEN (10–20 URLs) |
| `youtube.txt` | RED (3 URLs), HARDEN (10–20 URLs) |
| `reddit.txt` | RED (3 URLs), HARDEN (10–20 URLs) |
| `google-maps.txt` | RED (3 URLs), HARDEN (10–20 URLs) |
| `pinterest.txt` | RED (3 URLs), HARDEN (10–20 URLs) |
| `linkedin.txt` | RED (3 URLs), HARDEN (10–20 URLs) |
| `facebook.txt` | RED (3 URLs), HARDEN (10–20 URLs) |
| `instagram.txt` | RED (3 URLs), HARDEN (10–20 URLs) |
| `general.txt` | RED (3 URLs), HARDEN (10–20 URLs) |

## Format

One URL per line. Lines starting with `#` are comments.

```
# TikTok profile URLs for testing
https://www.tiktok.com/@example_user
```

## Rules

- URLs must be **public** profiles or pages (no private/restricted content)
- Anti-Bot Agent populates these during the RED phase
- Integration Lead uses these during HARDEN for cost measurement
