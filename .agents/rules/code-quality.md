# Code Quality Guardrails

| ID | Rule | Enforcement |
|---|---|---|
| G-CODE-01 | Every handler must export `handle()`, `validate()`, and `detectBlock()`. | TypeScript interface; compile-time check. |
| G-CODE-02 | No handler may create its own `SessionPool` — must use the shared factory. | grep check during HARDEN: no `new SessionPool` outside `src/utils/session.ts`. |
| G-CODE-03 | All output must conform to the normalized envelope schema (platform, url, scrapedAt, crawlerUsed, data, errors). | Integration Lead runs JSON schema validation. |
| G-CODE-04 | Structured logging is mandatory — no `console.log`. Use the shared `log` utility. | grep check during HARDEN: zero `console.log` in `src/`. |
