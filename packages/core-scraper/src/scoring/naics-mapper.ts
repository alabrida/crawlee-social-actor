/**
 * @module scoring/naics-mapper
 * @description Maps Google Business Profile categories or Business Classes to 6-digit 2022 NAICS codes and friendly titles.
 */

import { BusinessClass } from './types.js';

export interface NaicsDetails {
    code: string;
    title: string;
}

// Map of common local business categories to NAICS 2022
const CATEGORY_MAP: Record<string, NaicsDetails> = {
    'dentist': { code: '621210', title: 'Offices of Dentists' },
    'restaurant': { code: '722511', title: 'Full-Service Restaurants' },
    'bar': { code: '722410', title: 'Drinking Places (Alcoholic Beverages)' },
    'pub': { code: '722410', title: 'Drinking Places (Alcoholic Beverages)' },
    'lawyer': { code: '541110', title: 'Offices of Lawyers' },
    'attorney': { code: '541110', title: 'Offices of Lawyers' },
    'plumber': { code: '238220', title: 'Plumbing, Heating, and Air-Conditioning Contractors' },
    'plumbing': { code: '238220', title: 'Plumbing, Heating, and Air-Conditioning Contractors' },
    'electrician': { code: '238210', title: 'Electrical Contractors and Other Wiring Installation Contractors' },
    'roofer': { code: '238160', title: 'Roofing Contractors' },
    'roofing': { code: '238160', title: 'Roofing Contractors' },
    'hvac': { code: '238220', title: 'Plumbing, Heating, and Air-Conditioning Contractors' },
    'salon': { code: '812112', title: 'Beauty Salons' },
    'beauty salon': { code: '812112', title: 'Beauty Salons' },
    'hair salon': { code: '812112', title: 'Beauty Salons' },
    'real estate': { code: '531210', title: 'Offices of Real Estate Agents and Brokers' },
    'realtor': { code: '531210', title: 'Offices of Real Estate Agents and Brokers' },
    'accountant': { code: '541211', title: 'Offices of Certified Public Accountants' },
    'accounting': { code: '541211', title: 'Offices of Certified Public Accountants' },
    'cpa': { code: '541211', title: 'Offices of Certified Public Accountants' },
    'car wash': { code: '811192', title: 'Car Washes' },
    'auto repair': { code: '811111', title: 'General Automotive Repair' },
    'mechanic': { code: '811111', title: 'General Automotive Repair' },
    'gym': { code: '713940', title: 'Fitness and Recreational Sports Centers' },
    'fitness': { code: '713940', title: 'Fitness and Recreational Sports Centers' },
    'hotel': { code: '721110', title: 'Hotels (except Casino Hotels) and Motels' },
    'motel': { code: '721110', title: 'Hotels (except Casino Hotels) and Motels' },
    'bakery': { code: '311811', title: 'Retail Bakeries' },
    'coffee': { code: '722515', title: 'Snack and Nonalcoholic Beverage Bars' },
    'cafe': { code: '722515', title: 'Snack and Nonalcoholic Beverage Bars' },
    'florist': { code: '459310', title: 'Florists' },
    'jewelry': { code: '458310', title: 'Jewelry Stores' },
    'boutique': { code: '458110', title: 'Clothing Stores' },
    'clothing': { code: '458110', title: 'Clothing Stores' },
    'furniture': { code: '449110', title: 'Furniture Stores' },
    'landscap': { code: '561730', title: 'Landscaping Services' },
    'cleaner': { code: '812320', title: 'Drycleaning and Laundry Services' },
    'cleaning': { code: '561720', title: 'Janitorial Services' },
    'pest control': { code: '561710', title: 'Exterminating and Pest Control Services' },
    'photographer': { code: '541921', title: 'Photography Studios, Portrait' },
    'photography': { code: '541921', title: 'Photography Studios, Portrait' },
    'marketing': { code: '541810', title: 'Advertising Agencies' },
    'advertising': { code: '541810', title: 'Advertising Agencies' },
    'daycare': { code: '624410', title: 'Child Care Services' },
    'child care': { code: '624410', title: 'Child Care Services' },
    'veterinar': { code: '541940', title: 'Veterinary Services' },
    'pharmacy': { code: '456110', title: 'Pharmacies and Drug Retail Stores' },
    'brewery': { code: '312120', title: 'Breweries' },
    'spa': { code: '812199', title: 'Other Personal Care Services' },
    'massage': { code: '812199', title: 'Other Personal Care Services' },
    'caterer': { code: '722320', title: 'Caterers' },
    'catering': { code: '722320', title: 'Caterers' },
    'mover': { code: '484210', title: 'Used Household and Office Goods Moving' },
    'moving': { code: '484210', title: 'Used Household and Office Goods Moving' },
    'laundry': { code: '812320', title: 'Drycleaning and Laundry Services' },
    'funeral': { code: '812210', title: 'Funeral Homes and Funeral Services' },
    'travel agency': { code: '561510', title: 'Travel Agencies' },
    'event planner': { code: '561920', title: 'Convention and Trade Show Organizers' },
    'consulting': { code: '541611', title: 'Administrative and General Management Consulting Services' },
    'insurance': { code: '524210', title: 'Insurance Agencies and Brokerages' },
    'it support': { code: '541512', title: 'Computer Systems Design Services' },
    'computer repair': { code: '811212', title: 'Computer and Office Machine Repair and Maintenance' },
    'locksmith': { code: '561622', title: 'Locksmiths' },
    'clinic': { code: '621111', title: 'Offices of Physicians' },
    'doctor': { code: '621111', title: 'Offices of Physicians' },
    'physician': { code: '621111', title: 'Offices of Physicians' },
    'chiropractor': { code: '621310', title: 'Offices of Chiropractors' },
    'optometrist': { code: '621320', title: 'Offices of Optometrists' },
    'physical therapist': { code: '621340', title: 'Offices of Physical, Occupational and Speech Therapists' },
    'retail': { code: '459999', title: 'All Other Miscellaneous Retailers' },
    'store': { code: '459999', title: 'All Other Miscellaneous Retailers' },
    'supermarket': { code: '445110', title: 'Supermarkets and Other Grocery Retailers' },
    'grocery': { code: '445110', title: 'Supermarkets and Other Grocery Retailers' },
    'liquor': { code: '445320', title: 'Beer, Wine, and Liquor Retailers' },
    'pet groom': { code: '812910', title: 'Pet Care Services' },
    'hardware': { code: '444130', title: 'Hardware Stores' },
    'storage': { code: '531130', title: 'Lessors of Miniwarehouses and Self-Storage Units' }
};

// Heuristic fallback map for non-local business classes
const FALLBACK_CLASS_MAP: Record<BusinessClass, NaicsDetails> = {
    local: { code: '459999', title: 'All Other Miscellaneous Retailers' },
    professional_services: { code: '541611', title: 'Administrative and General Management Consulting Services' },
    ecommerce: { code: '454110', title: 'Electronic Shopping and Mail-Order Houses' },
    saas: { code: '513210', title: 'Software Publishers' },
    content_creator: { code: '711510', title: 'Independent Artists, Writers, and Performers' },
    influencer: { code: '711510', title: 'Independent Artists, Writers, and Performers' }
};

/**
 * Resolves NAICS details by checking common categories first, then falling back to BusinessClass.
 * @param category - Category from Google Maps/GBP
 * @param bizClass - Fallback business class
 */
export function resolveNaics(category?: string, bizClass: BusinessClass = 'professional_services'): NaicsDetails {
    if (category) {
        const cleanCat = category.toLowerCase().trim();
        // Check exact or substring matches in the category map
        for (const [key, details] of Object.entries(CATEGORY_MAP)) {
            if (cleanCat.includes(key)) {
                return details;
            }
        }
    }
    return FALLBACK_CLASS_MAP[bizClass];
}
