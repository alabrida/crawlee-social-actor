/**
 * capture-golden.js — scaffold a golden ground-truth case from the last regression run.
 *
 * Reads the raw per-platform items the run wrote to storage/datasets/default/, replays them
 * through the real scoring pipeline, and prints a GoldenCase literal with `expected` pre-filled
 * from the ACTUAL assessment. A human reviews/corrects the expected block, then pastes the case
 * into src/scoring/__tests__/golden/ground-truth.ts where it becomes a permanent regression guard.
 *
 * Usage:  node scripts/capture-golden.js [slug]
 *   slug  optional kebab-case id for the case (default: derived from the business hostname)
 *
 * Replay uses tsx so it can import the TS pipeline directly.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRAPER_DIR = path.resolve(__dirname, '..');
const DATASET_DIR = path.resolve(SCRAPER_DIR, 'storage', 'datasets', 'default');

function loadItems() {
    if (!fs.existsSync(DATASET_DIR)) {
        console.error(`No dataset at ${DATASET_DIR}. Run scripts/run-regression.js first.`);
        process.exit(1);
    }
    return fs.readdirSync(DATASET_DIR)
        .filter((f) => f.endsWith('.json'))
        .map((f) => JSON.parse(fs.readFileSync(path.join(DATASET_DIR, f), 'utf-8')))
        .filter((it) => it && it.platform); // skip the final assessment row + failures w/o platform
}

const items = loadItems();
if (!items.length) {
    console.error('Dataset has no per-platform items to capture.');
    process.exit(1);
}

const hubItem = items.find((it) => it.platform === 'general' || it.platform === 'general_hub');
const businessUrl = (hubItem && hubItem.url) || items[0].url || '';
const host = (() => { try { return new URL(businessUrl).hostname.replace(/^www\./, ''); } catch { return 'unknown'; } })();
const slug = process.argv[2] || host.split('.')[0];

// Replay through the real pipeline via a tiny tsx shim so `expected` reflects what the
// current scorer produces — the human then verifies/edits before promoting the case.
const shim = `
import { scoreCase } from ${JSON.stringify(pathToFileURL(path.join(SCRAPER_DIR, 'src/scoring/__tests__/golden/replay.ts')).href)};
const c = JSON.parse(process.env.GOLDEN_CASE_JSON);
const r = scoreCase(c);
const followers = {};
for (const k of Object.keys(r)) {
    if (k.endsWith('_followers') && typeof r[k] === 'number' && r[k] > 0) followers[k.replace('_followers','')] = { value: r[k], tolerance_pct: 5 };
}
process.stdout.write(JSON.stringify({
    business_class: r.business_class,
    has_ecommerce: !!(r.assessment_detail?.hub_forensics?.ecommerce?.detected),
    platform_followers: followers,
    gbp_rating: r.gbp_rating ?? null,
    conversion_score: r.conversion_score,
    overall_score: r.overall_score,
}, null, 2));
`;

const caseInput = { slug, brand: (hubItem?.data?.seo?.title) || host, businessUrl, items };
const res = spawnSync('npx', ['tsx', '-e', shim], {
    cwd: SCRAPER_DIR,
    encoding: 'utf-8',
    env: { ...process.env, GOLDEN_CASE_JSON: JSON.stringify(caseInput) },
    shell: true,
});
if (res.status !== 0) {
    console.error('Replay failed:\n', res.stderr || res.stdout);
    process.exit(1);
}
const a = JSON.parse(res.stdout.trim());

// Floors are set one point below the observed score so the guard catches regressions,
// not normal variance. The human tightens these after eyeballing them.
const floor = (n) => Math.max(0, Math.floor(n) - 1);
const expected = {
    business_class: a.business_class,
    has_ecommerce: a.has_ecommerce,
    ...(Object.keys(a.platform_followers).length ? { platform_followers: a.platform_followers } : {}),
    ...(typeof a.gbp_rating === 'number' ? { gbp_rating: { value: a.gbp_rating, tol: 0.1 } } : {}),
    ...(a.has_ecommerce ? { min_conversion: floor(a.conversion_score) } : {}),
    min_overall: floor(a.overall_score),
};

console.log(`\n// ---- VERIFY then paste into golden/ground-truth.ts (observed: overall ${a.overall_score}, conversion ${a.conversion_score}) ----`);
console.log(`// items: ${items.length} (${[...new Set(items.map((i) => i.platform))].join(', ')})`);
console.log(JSON.stringify({
    slug,
    brand: caseInput.brand,
    businessUrl,
    items: items.map((it) => ({ platform: it.platform, url: it.url, data: it.data })),
    expected,
}, null, 2));
