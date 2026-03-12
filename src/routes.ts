/**
 * @module routes
 * @description Router configuration that dispatches URLs to the correct platform handler.
 * Handlers are wired in during the SHIP phase by the Integration Lead.
 */

import type { Platform, PlatformHandler } from './types.js';
import { log } from './utils/logger.js';

// Import all platform handlers
import tiktokHandler from './handlers/tiktok.js';
import youtubeHandler from './handlers/youtube.js';
import redditHandler from './handlers/reddit.js';
import googleMapsHandler from './handlers/google-maps.js';
import pinterestHandler from './handlers/pinterest.js';
import linkedinHandler from './handlers/linkedin.js';
import metaHandler from './handlers/meta.js';
import generalHandler from './handlers/general.js';

/**
 * Registry mapping platform identifiers to their handlers.
 * Handlers are added here after passing the SHIP gate.
 */
const HANDLER_REGISTRY: Record<Platform, PlatformHandler> = {
    tiktok: tiktokHandler,
    youtube: youtubeHandler,
    reddit: redditHandler,
    google_maps: googleMapsHandler,
    pinterest: pinterestHandler,
    linkedin: linkedinHandler,
    facebook: metaHandler,
    instagram: metaHandler,
    general: generalHandler,
};

/**
 * Get the handler for a given platform.
 * @param platform - The platform identifier.
 * @returns The PlatformHandler for the requested platform, or null if not found.
 */
export function getHandler(platform: Platform): PlatformHandler | null {
    const handler = HANDLER_REGISTRY[platform];
    if (!handler) {
        log.warning(`No handler registered for platform: ${platform}`);
        return null;
    }
    return handler;
}

/**
 * Get all registered platform identifiers.
 * @returns Array of platform names that have handlers.
 */
export function getRegisteredPlatforms(): Platform[] {
    return Object.keys(HANDLER_REGISTRY) as Platform[];
}
