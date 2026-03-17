import { describe, it, expect } from 'vitest';
import { getBlankAssessmentRow } from '../schema-mapper.js';

describe('Schema Mapper', () => {
    it('should generate a blank assessment row with required IDs', () => {
        const row = getBlankAssessmentRow();

        // Assert base structure
        expect(row).toBeDefined();
        expect(row).toHaveProperty('assessment_id', null);
        expect(row).toHaveProperty('lead_uuid', null);
        expect(row).toHaveProperty('dedupe_key', null);
    });

    it('should include new UCE V3.9 rubric fields', () => {
        const row = getBlankAssessmentRow();

        // Technical Vitals
        expect(row).toHaveProperty('payload_size_kb', null);
        expect(row).toHaveProperty('business_http_status', null);

        // Orchestration
        expect(row.platforms_list).toEqual([]);
        expect(row.total_platforms_submitted).toBe(0);

        // Connectivity Matrix
        expect(row).toHaveProperty('has_instagram_in_bio', false);
        expect(row.connectivity_matrix).toEqual({});
        expect(row.unified_ecosystem_score).toBe(0);

        // Phase 2 Consideration
        expect(row).toHaveProperty('consideration_roi_calculator_detected', false);
        expect(row).toHaveProperty('has_contact_form', false);

        // Retention & Expansion
        expect(row).toHaveProperty('referral_program_detected', false);
        expect(row).toHaveProperty('expansion_triggers_detected', false);

        // Human Assessment (H_) Fields
        expect(row).toHaveProperty('frankenstein_index', null);
        expect(row).toHaveProperty('governance_score', null);
        expect(row).toHaveProperty('decision_velocity_days', null);

        // GBP Specifics
        expect(row).toHaveProperty('has_gbp', false);
        expect(row).toHaveProperty('gbp_url', null);
    });
});
