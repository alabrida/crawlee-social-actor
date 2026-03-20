import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function run() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        console.error('Missing credentials');
        return;
    }

    const supabase = createClient(url, key);
    const data = JSON.parse(fs.readFileSync('d:/Apify/storage/datasets/revenue-journey-assessments/000000004.json', 'utf8'));

    const { error } = await supabase
        .from('revenue_journey_assessments')
        .upsert(data, { onConflict: 'dedupe_key' });

    if (error) {
        console.error('UPSERT ERROR:', error);
    } else {
        console.log('UPSERT SUCCESS');
    }
}

run();
