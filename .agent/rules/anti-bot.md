# Anti-Bot Guardrails

| ID | Rule | Enforcement |
|---|---|---|
| G-BOT-01 | LinkedIn handler must hard-cap at 250 requests/day. | Rate limiter in handler; Integration Lead verifies in HARDEN. |
| G-BOT-02 | All Playwright handlers must randomize delays between navigations (min 1 s, max 5 s). | Anti-Bot Agent verifies timing in test logs. |
| G-BOT-03 | User-Agent strings must rotate from a curated list — no hardcoded single UA. | Handlers must use the shared `ua-rotation.ts` utility. |
| G-BOT-04 | Failed requests must retire the session via `session.retireOnBlockedStatusCodes()`. | Anti-Bot Agent verifies session retirement in test logs. |
