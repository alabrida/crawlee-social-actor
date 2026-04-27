# WORKBOOK.md: Apify (Production Readiness & Security)

## 1. User Personas & Stories
- **User Personas**: 
  - **Data Architect**: Designs the extraction schemas.
  - **Lead Generation Specialist**: Consumes enriched signals.
- **User Story 1**: As a Data Architect, I want to deploy custom actors, so that I can capture data from non-standard platforms.
- **User Story 2**: As a Lead Gen Specialist, I want to receive real-time notifications of new signals, so that I can trigger the 90-Day Cadence.

## 2. Identity & Access
- [ ] **IAM Roles**: API tokens restricted to specific project/actor scopes.
- [ ] **Service Accounts**: Managed via Apify environment variables.

## 3. Infrastructure & Resources
- [x] **Hierarchy**: Apify cloud actors coordinated via local microservice.
- [ ] **Asset Inventory**: Datasets and key-value stores tracked in `walkthrough.md`.

## 4. Network & Data Security
- [ ] **VPC Service Controls**: Secure webhook endpoints for data ingestion.
- [ ] **Encryption**: Sensitive credentials encrypted at rest in Apify's secure storage.

## 5. Reliability & Ops (Performance & SLIs/SLOs)
- [ ] **SLIs/SLOs**: 
  - **Run Success Rate**: > 95% for scheduled tasks.
  - **Data Freshness**: < 24h for monitored social nodes.
- [ ] **Redundancy**: Multiple proxy pools used to prevent IP-based blocking.
