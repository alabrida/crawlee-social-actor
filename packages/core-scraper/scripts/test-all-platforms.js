import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SCRAPER_DIR = path.resolve(__dirname, '..');
const STORAGE_DIR = path.resolve(SCRAPER_DIR, 'storage');
const INPUT_DIR = path.resolve(STORAGE_DIR, 'key_value_stores', 'default');

const TEST_CASES = {
    youtube: { urls: [{ platform: 'youtube', url: 'https://www.youtube.com/@DustysNewsNetwork' }], businessUrl: 'https://eatatjacks.com/' },
    reddit: { urls: [{ platform: 'reddit', url: 'https://www.reddit.com/r/webdev' }] },
    tiktok: { urls: [{ platform: 'tiktok', url: 'https://www.tiktok.com/@tiktok' }] },
    google_maps: { urls: [{ platform: 'google_maps', url: 'Google' }] },
    pinterest: { urls: [{ platform: 'pinterest', url: 'https://www.pinterest.com/pinterest' }] },
    linkedin: { urls: [{ platform: 'linkedin', url: 'https://www.linkedin.com/company/google' }] },
    facebook: { urls: [{ platform: 'facebook', url: 'https://www.facebook.com/facebook' }] },
    instagram: { urls: [{ platform: 'instagram', url: 'https://www.instagram.com/instagram' }] },
    twitter: { urls: [{ platform: 'twitter', url: 'https://twitter.com/twitter' }] },
    google_business_profile: { urls: [{ platform: 'google_business_profile', url: 'Google' }] },
    seo_serp: { urls: [{ platform: 'seo_serp', url: 'https://www.google.com/search?q=Alabrida' }] },
    general_hub: { urls: [{ platform: 'general_hub', url: 'https://example.com' }], businessUrl: 'https://example.com' },
};

function cleanStorage() {
    if (fs.existsSync(STORAGE_DIR)) {
        try {
            fs.rmSync(STORAGE_DIR, { recursive: true, force: true });
        } catch (e) {
            console.warn(`Warning: Could not fully clean storage: ${e.message}`);
        }
    }
    fs.mkdirSync(INPUT_DIR, { recursive: true });
}

function runScraper(inputData, mode = 'INTERNAL') {
    return new Promise((resolve) => {
        cleanStorage();
        fs.writeFileSync(path.join(INPUT_DIR, 'INPUT.json'), JSON.stringify(inputData, null, 2));

        console.log(`\n==================================================`);
        console.log(`[TEST RUN] Starting run for platforms: ${inputData.platforms.join(', ')}`);
        console.log(`Mode: ${mode}`);
        console.log(`==================================================`);

        const child = spawn('npx', ['tsx', 'src/main.ts'], {
            cwd: SCRAPER_DIR,
            shell: true,
            env: {
                ...process.env,
                ACTOR_MODE: mode,
                APIFY_LOCAL_STORAGE_DIR: './storage',
                HEADLESS: 'true'
            }
        });

        child.stdout.on('data', (data) => {
            const lines = data.toString().split('\n');
            for (const line of lines) {
                if (line.trim() && (line.includes('INFO') || line.includes('WARN') || line.includes('ERROR') || line.includes('SmartCrawl'))) {
                    console.log(`  stdout: ${line.trim()}`);
                }
            }
        });

        child.stderr.on('data', (data) => {
            const lines = data.toString().split('\n');
            for (const line of lines) {
                if (line.trim()) {
                    console.error(`  stderr: ${line.trim()}`);
                }
            }
        });

        child.on('close', (code) => {
            console.log(`[TEST RUN] Finished with exit code: ${code}`);
            resolve(code === 0);
        });
    });
}

async function main() {
    const results = {};
    const platforms = Object.keys(TEST_CASES);

    // 1. Run each platform one at a time
    for (const platform of platforms) {
        console.log(`\n>>> Testing platform: ${platform} <<<`);
        const testCase = TEST_CASES[platform];
        const inputData = {
            platforms: [platform],
            urls: testCase.urls,
            businessUrl: testCase.businessUrl || 'https://example.com',
            brandName: 'Test Brand',
            proxy: { useApifyProxy: false, apifyProxyGroups: [] },
            maxConcurrency: 1,
            maxRequestRetries: 0,
            linkedinDailyLimit: 10,
            googleMapsGrid: { enabled: false, cellSizeKm: 1 }
        };

        const success = await runScraper(inputData, 'INTERNAL');
        results[platform] = success ? 'SUCCESS' : 'FAILED';
    }

    // 2. Perform one last run with multiple platforms at once
    console.log(`\n>>> Testing multiple platforms at once <<<`);
    const multiInputData = {
        platforms: ['youtube', 'reddit', 'general_hub'],
        urls: [
            { platform: 'youtube', url: 'https://www.youtube.com/@DustysNewsNetwork' },
            { platform: 'reddit', url: 'https://www.reddit.com/r/webdev' },
            { platform: 'general_hub', url: 'https://example.com' }
        ],
        businessUrl: 'https://example.com',
        brandName: 'Multi Platform Test Brand',
        proxy: { useApifyProxy: false, apifyProxyGroups: [] },
        maxConcurrency: 2,
        maxRequestRetries: 0,
        linkedinDailyLimit: 10,
        googleMapsGrid: { enabled: false, cellSizeKm: 1 }
    };
    const multiSuccess = await runScraper(multiInputData, 'INTERNAL');
    results['multi_platform'] = multiSuccess ? 'SUCCESS' : 'FAILED';

    console.log(`\n==================================================`);
    console.log(`FINAL TEST RESULTS`);
    console.log(`==================================================`);
    console.table(results);
}

main().catch(console.error);
