import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load local .env variables dynamically (for local runs)
try {
    const dotenv = await import('dotenv');
    dotenv.default.config({ path: path.resolve(__dirname, '../.env') });
} catch (e) {
    // dotenv not installed (CI environment); relying on environment variables
}

// Trim any trailing/leading spaces or newlines from environment variables to prevent malformed URLs
const supabaseUrl = process.env.SUPABASE_URL ? process.env.SUPABASE_URL.trim() : null;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.trim() : null;

async function pingSupabase() {
    if (!supabaseUrl || !supabaseKey) {
        console.error('[Keep-Active] Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
        process.exit(1);
    }

    console.log(`[Keep-Active] Pinging Supabase project at: ${supabaseUrl}`);
    try {
        const queryUrl = `${supabaseUrl}/rest/v1/revenue_journey_assessments?limit=1`;
        const response = await fetch(queryUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });

        if (response.ok) {
            console.log(`[Keep-Active] Success: Supabase project is active. Status: ${response.status}`);
            process.exit(0);
        } else {
            const errText = await response.text();
            console.error(`[Keep-Active] Failed: Status ${response.status} - ${response.statusText}. Response: ${errText}`);
            process.exit(1);
        }
    } catch (err) {
        console.error('[Keep-Active] Connection error pinging Supabase:', err.message);
        process.exit(1);
    }
}

pingSupabase();
