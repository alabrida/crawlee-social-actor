/**
 * @module logger
 * @description Structured logging utility for the actor.
 * @see G-CODE-04 — No console.log allowed; use this shared logger.
 */

import { utils } from 'crawlee';

/**
 * Shared structured logger instance.
 * All modules must use `log.info()`, `log.warning()`, `log.error()`, `log.debug()`
 * instead of `console.log`.
 */
export const log = utils.log;
