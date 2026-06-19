/**
 * @module scoring/types
 * @description Type definitions for the Revenue Journey scoring engine.
 */

export type BusinessClass =
    | 'local'
    | 'professional_services'
    | 'ecommerce'
    | 'saas'
    | 'content_creator'
    | 'influencer';

export interface MechanismConfig {
    name: string;
    label: string;
    stage: 'awareness' | 'consideration' | 'decision' | 'conversion' | 'retention';
    weights: Record<BusinessClass, number>;
    lowScoreInsight: string;
    evaluate(platforms: Record<string, any>, hub: any, serp: any): { score: number; evidence: string | null };
}

export interface ScoredMechanism {
    name: string;
    label: string;
    score: number; // 0-3
    max: number; // 3
    evidence: string | null;
    recommendation: string | null;
}

export interface StageScore {
    score: number; // 0-10
    max_possible: number; // 10
    mechanisms: ScoredMechanism[];
}

export interface AssessmentResult {
    assessment_id: string;
    business_url: string;
    brand_name: string;
    business_class: BusinessClass;
    business_class_confidence: number;
    assessment_date: string;
    source_channel: string;
    awareness_score: number;
    consideration_score: number;
    decision_score: number;
    conversion_score: number;
    retention_score: number;
    overall_score: number;
    platforms_found: string[];
    total_platforms: number;
    weakest_stage: string;
    strongest_stage: string;
    screenshots: Record<string, string>;
    assessment_detail: {
        stages: {
            awareness: StageScore;
            consideration: StageScore;
            decision: StageScore;
            conversion: StageScore;
            retention: StageScore;
        };
        platforms: Record<string, any[]>;
        hub_forensics: any;
        classification: {
            detected_class: BusinessClass;
            confidence: number;
            signals: string[];
            override: string | null;
            local_archetype: string;
            naics_code: string;
            naics_title: string;
            maturity_tier: 'Foundational' | 'Established' | 'Market Leader';
            primary_bottleneck: string;
        };
        current_keywords?: string[];
        serp_results?: any[];
        recommended_keywords?: string[];
    };
}
