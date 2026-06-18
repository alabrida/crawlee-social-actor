/**
 * @module scoring/engine
 * @description Core calculation engine for scoring the Revenue Journey stages.
 */

import { randomUUID } from 'crypto';
import { BusinessClass, AssessmentResult, StageScore, ScoredMechanism } from './types.js';
import { MECHANISMS, STAGE_WEIGHTS } from './rubric.js';
import { classifyBusiness } from './classifier.js';
import { collapsePlatforms } from './profile-aggregator.js';

/**
 * Pure function to calculate a complete assessment score.
 * @param platforms - Extracted platform data.
 * @param hubForensics - Extracted website forensics.
 * @param serpData - SERP rank data.
 * @param brandName - Name of the business.
 * @param businessUrl - URL of the business homepage.
 * @param classOverride - Optional manual business class override.
 */
export function calculateAssessment(
    platforms: Record<string, any[] | any>,
    hubForensics: any,
    serpData: any,
    brandName: string,
    businessUrl: string,
    classOverride: BusinessClass | null = null
): AssessmentResult {
    // Normalize platforms: map single object value to array of profiles
    const normalizedPlatforms: Record<string, any[]> = {};
    for (const [key, val] of Object.entries(platforms || {})) {
        if (Array.isArray(val)) {
            normalizedPlatforms[key] = val;
        } else if (val) {
            normalizedPlatforms[key] = [val];
        } else {
            normalizedPlatforms[key] = [];
        }
    }

    // Collapse profiles into a single virtual profile for rubric evaluation
    const collapsedPlatforms = collapsePlatforms(normalizedPlatforms);

    // 1. Determine business class
    const classification = classifyBusiness(collapsedPlatforms, hubForensics, classOverride);
    const bizClass = classification.detected_class;

    // Initialize stage scores
    const stages: Record<string, { actualWeightSum: number; maxWeightSum: number; mechanisms: ScoredMechanism[] }> = {
        awareness: { actualWeightSum: 0, maxWeightSum: 0, mechanisms: [] },
        consideration: { actualWeightSum: 0, maxWeightSum: 0, mechanisms: [] },
        decision: { actualWeightSum: 0, maxWeightSum: 0, mechanisms: [] },
        conversion: { actualWeightSum: 0, maxWeightSum: 0, mechanisms: [] },
        retention: { actualWeightSum: 0, maxWeightSum: 0, mechanisms: [] }
    };

    // 2. Evaluate all mechanisms
    for (const mech of MECHANISMS) {
        const { score, evidence } = mech.evaluate(collapsedPlatforms, hubForensics, serpData);
        const weight = mech.weights[bizClass] || 0;

        const isLowScore = score < 2;
        const recommendation = isLowScore && weight > 0 ? mech.lowScoreInsight : null;

        const scoredMech: ScoredMechanism = {
            name: mech.name,
            label: mech.label,
            score,
            max: 3,
            evidence,
            recommendation
        };

        const stageData = stages[mech.stage];
        if (stageData) {
            stageData.actualWeightSum += score * weight;
            stageData.maxWeightSum += 3 * weight;
            stageData.mechanisms.push(scoredMech);
        }
    }

    // 3. Compute stage scores (0.0 to 10.0 scale)
    const stageScores: Record<string, StageScore> = {};
    for (const [stageName, stageData] of Object.entries(stages)) {
        const scoreVal = stageData.maxWeightSum > 0
            ? (stageData.actualWeightSum / stageData.maxWeightSum) * 10
            : 0;

        stageScores[stageName] = {
            score: Math.round(scoreVal * 10) / 10,
            max_possible: 10,
            mechanisms: stageData.mechanisms
        };
    }

    // 4. Compute overall score using stage weights
    const weights = STAGE_WEIGHTS[bizClass];
    let overallScore = 0;
    for (const [stageName, weight] of Object.entries(weights)) {
        overallScore += (stageScores[stageName]?.score || 0) * weight;
    }
    overallScore = Math.round(overallScore * 10) / 10;

    // 5. Determine strongest and weakest stages
    let weakestStage = 'awareness';
    let weakestScore = 11;
    let strongestStage = 'awareness';
    let strongestScore = -1;

    for (const [stageName, data] of Object.entries(stageScores)) {
        if (data.score < weakestScore) {
            weakestScore = data.score;
            weakestStage = stageName;
        }
        if (data.score > strongestScore) {
            strongestScore = data.score;
            strongestStage = stageName;
        }
    }

    const platformsFound = Object.keys(normalizedPlatforms).filter(key => normalizedPlatforms[key] && normalizedPlatforms[key].length > 0);
    const screenshots: Record<string, string> = {};
    if (hubForensics?.screenshotUrl) {
        screenshots.hub = hubForensics.screenshotUrl;
    }
    Object.entries(normalizedPlatforms).forEach(([key, list]: [string, any[]]) => {
        const p = list.find(item => item?.screenshotUrl);
        if (p?.screenshotUrl) {
            screenshots[key] = p.screenshotUrl;
        }
    });

    const result: AssessmentResult = {
        assessment_id: randomUUID(),
        business_url: businessUrl,
        brand_name: brandName,
        business_class: bizClass,
        business_class_confidence: classification.confidence,
        assessment_date: new Date().toISOString(),
        source_channel: 'actor_run',
        awareness_score: stageScores.awareness.score,
        consideration_score: stageScores.consideration.score,
        decision_score: stageScores.decision.score,
        conversion_score: stageScores.conversion.score,
        retention_score: stageScores.retention.score,
        overall_score: overallScore,
        platforms_found: platformsFound,
        total_platforms: platformsFound.length,
        weakest_stage: weakestStage,
        strongest_stage: strongestStage,
        screenshots,
        assessment_detail: {
            stages: {
                awareness: stageScores.awareness,
                consideration: stageScores.consideration,
                decision: stageScores.decision,
                conversion: stageScores.conversion,
                retention: stageScores.retention
            },
            platforms: normalizedPlatforms,
            hub_forensics: hubForensics,
            classification: {
                detected_class: bizClass,
                confidence: classification.confidence,
                signals: classification.signals,
                override: classOverride
            }
        }
    };

    return result;
}
