/**
 * @module utils/issue-log
 * @description Utility for recording and communicating platform-level issues to the user.
 */

import { Actor } from 'apify';
import { log } from './logger.js';

/**
 * Severity levels for issue reporting.
 */
export type IssueSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

/**
 * Structure of an Issue Log record.
 */
export interface IssueRecord {
    /** ISO 8601 timestamp of the issue. */
    timestamp: string;
    /** Platform identifier. */
    platform: string;
    /** Target URL where the issue occurred. */
    url: string;
    /** Impact level of the issue. */
    severity: IssueSeverity;
    /** Human-readable description. */
    message: string;
    /** Evidence of the issue (optional). */
    screenshotUrl?: string;
}

/**
 * Record a platform issue to the 'issue-log' dataset.
 * @param record - Partial issue record.
 */
export async function reportIssue(record: Omit<IssueRecord, 'timestamp'>): Promise<void> {
    const fullRecord: IssueRecord = {
        timestamp: new Date().toISOString(),
        ...record,
    };

    const dataset = await Actor.openDataset('issue-log');
    await dataset.pushData(fullRecord);

    const logMethod = record.severity === 'CRITICAL' ? 'error' : record.severity === 'WARNING' ? 'warning' : 'info';
    log[logMethod](`[Issue Log] ${record.platform}: ${record.message}`, { url: record.url });
}
