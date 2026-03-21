import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: 'd:/Apify/packages/core-scraper/.env' });

async function run() {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const data = JSON.parse(fs.readFileSync('d:/Apify/apps/agency-actor/storage/datasets/revenue-journey-assessments/000000001.json', 'utf8'));

    const { error } = await supabase.from('revenue_journey_assessments').upsert(data, { onConflict: 'dedupe_key' });
    console.log('Result:', error);
}

run().catch(console.error);
