/**
 * @module session
 * @description Shared SessionPool factory for all handlers.
 * @see G-CODE-02 — No handler may create its own SessionPool.
 */

import { SessionPool } from 'crawlee';
import { log } from './logger.js';

/** Singleton SessionPool instance. */
let pool: SessionPool | null = null;

/**
 * Get or create the shared SessionPool instance.
 * All handlers MUST use this factory — no direct SessionPool construction allowed.
 * @returns The shared SessionPool instance.
 */
export async function getSessionPool(): Promise<SessionPool> {
    if (!pool) {
        pool = await SessionPool.open({
            maxPoolSize: 100,
            sessionOptions: {
                maxUsageCount: 50,
            },
        });
        log.info('SessionPool initialized');
    }
    return pool;
}
