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
const REGRESSION_INPUT_PATH = path.resolve(SCRAPER_DIR, 'inputs', 'INPUT_SMALL_REGRESSION.json');

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

async function run() {
    cleanStorage();
    
    // Copy the regression input
    const inputContent = fs.readFileSync(REGRESSION_INPUT_PATH, 'utf-8');
    fs.writeFileSync(path.join(INPUT_DIR, 'INPUT.json'), inputContent);

    console.log(`\n==================================================`);
    console.log(`[REGRESSION RUN] Starting run with INPUT_SMALL_REGRESSION.json`);
    console.log(`==================================================`);

    const child = spawn('npx', ['tsx', 'src/main.ts'], {
        cwd: SCRAPER_DIR,
        shell: true,
        env: {
            ...process.env,
            ACTOR_MODE: 'INTERNAL',
            DETAIL_LEVEL: 'HIGH', // exercise the consultant tier's highest-detail path locally
            APIFY_LOCAL_STORAGE_DIR: './storage',
            HEADLESS: 'true'
        }
    });

    child.stdout.on('data', (data) => {
        process.stdout.write(data);
    });

    child.stderr.on('data', (data) => {
        process.stderr.write(data);
    });

    child.on('close', (code) => {
        console.log(`\n==================================================`);
        console.log(`[REGRESSION RUN] Finished with exit code: ${code}`);
        console.log(`==================================================`);
        process.exit(code);
    });
}

run().catch(console.error);
