# Cost Guardrails

| ID | Rule | Enforcement |
|---|---|---|
| G-COST-01 | CheerioCrawler must be used unless JS rendering is provably required. | Architect reviews crawler selection before GREEN. |
| G-COST-02 | All Playwright sessions must call `blockResources(['image', 'media', 'font'])`. | Integration Lead checks during HARDEN. |
| G-COST-03 | No single platform may consume > 30% of monthly CU budget in a test run. | Integration Lead measures during HARDEN. |
| G-COST-04 | Any handler exceeding 500 MB proxy bandwidth in a single run triggers review. | Runtime bandwidth tracker. |
