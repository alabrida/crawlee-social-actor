# Environment Isolation Guardrails

| ID | Rule | Enforcement |
|---|---|---|
| G-ENV-01 | No global npm packages. All dependencies local to `node_modules`. `.npmrc` set to `save-exact=true`. | Architect verifies `package.json` — no `npm install -g` in any workflow step. |
| G-ENV-02 | **All live platform requests must route through proxies** — Apify Cloud or third-party. Direct local IP requests to target platforms are forbidden. | Architect verifies proxy config in handler tests; Anti-Bot Agent checks test logs for unproxied requests. |
| G-ENV-03 | Proxy configuration must use the shared `proxy.ts` utility — no hardcoded proxy URLs in handlers. | VDO verifies during MODULARIZE phase; grep check for hardcoded proxy strings. |
