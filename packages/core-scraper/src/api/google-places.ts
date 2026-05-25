/**
 * @module api/google-places
 * @description Google Places API (New) client.
 */

import { log } from '../utils/logger.js';

export interface PlacesData {
    id: string;
    displayName: string;
    rating: number | null;
    userRatingCount: number | null;
    formattedAddress: string | null;
    nationalPhoneNumber: string | null;
    websiteUri: string | null;
    types: string[];
    priceLevel: string | null;
    editorialSummary: string | null;
    regularOpeningHours: {
        openNow: boolean;
        weekdayDescriptions: string[];
    } | null;
    photoCount: number;
    reviews: Array<{
        name: string;
        relativePublishTimeDescription: string;
        rating: number;
        text: {
            text: string;
            languageCode: string;
        };
        authorAttribution: {
            displayName: string;
            photoUri?: string;
        };
    }>;
}

const FIELD_MASK = 'places.id,places.displayName,places.rating,places.userRatingCount,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.types,places.priceLevel,places.editorialSummary,places.regularOpeningHours,places.photos,places.reviews';

/**
 * Searches for a place by business name and returns its details.
 * @param query - Search query (e.g. "Joe's Pizza New York").
 * @param apiKey - Optional GCP API Key. Defaults to GOOGLE_CLOUD_API_KEY.
 */
export async function searchPlace(
    query: string,
    apiKey: string | undefined = process.env.GOOGLE_CLOUD_API_KEY
): Promise<PlacesData | null> {
    if (!apiKey) {
        log.warning('[Google Places API] Missing API Key. Skipping API call.');
        return null;
    }

    try {
        const url = 'https://places.googleapis.com/v1/places:searchText';
        log.info(`[Google Places API] Searching for business: ${query}`);

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': FIELD_MASK
            },
            body: JSON.stringify({
                textQuery: query
            })
        });

        if (!res.ok) {
            log.error(`[Google Places API] Text search failed: ${res.statusText}`);
            return null;
        }

        const data: any = await res.json();
        if (data.places && data.places.length > 0) {
            return formatPlace(data.places[0]);
        }

        log.warning(`[Google Places API] No places found for query: ${query}`);
        return null;
    } catch (e: unknown) {
        log.error(`[Google Places API] Error during place search: ${e instanceof Error ? e.message : String(e)}`);
        return null;
    }
}

/**
 * Retrieves details for a specific place by Place ID.
 * @param placeId - Google Place ID.
 * @param apiKey - Optional GCP API Key.
 */
export async function fetchPlaceDetails(
    placeId: string,
    apiKey: string | undefined = process.env.GOOGLE_CLOUD_API_KEY
): Promise<PlacesData | null> {
    if (!apiKey) {
        log.warning('[Google Places API] Missing API Key. Skipping API call.');
        return null;
    }

    try {
        const url = `https://places.googleapis.com/v1/places/${placeId}`;
        log.info(`[Google Places API] Fetching details for place ID: ${placeId}`);

        const res = await fetch(url, {
            headers: {
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': FIELD_MASK
            }
        });

        if (!res.ok) {
            log.error(`[Google Places API] Details request failed: ${res.statusText}`);
            return null;
        }

        const data: any = await res.json();
        return formatPlace(data);
    } catch (e: unknown) {
        log.error(`[Google Places API] Error fetching place details: ${e instanceof Error ? e.message : String(e)}`);
        return null;
    }
}

function formatPlace(place: any): PlacesData {
    return {
        id: place.id || '',
        displayName: place.displayName?.text || '',
        rating: typeof place.rating === 'number' ? place.rating : null,
        userRatingCount: typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
        formattedAddress: place.formattedAddress || null,
        nationalPhoneNumber: place.nationalPhoneNumber || null,
        websiteUri: place.websiteUri || null,
        types: place.types || [],
        priceLevel: place.priceLevel || null,
        editorialSummary: place.editorialSummary?.text || null,
        regularOpeningHours: place.regularOpeningHours ? {
            openNow: place.regularOpeningHours.openNow || false,
            weekdayDescriptions: place.regularOpeningHours.weekdayDescriptions || []
        } : null,
        photoCount: place.photos ? place.photos.length : 0,
        reviews: place.reviews || []
    };
}
