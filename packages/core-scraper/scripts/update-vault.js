import { Actor } from 'apify';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
    await Actor.init();

    const VAULT_STORE_NAME = 'AUTH_SESSION_VAULT';
    console.log(`Opening Key-Value Store: ${VAULT_STORE_NAME}...`);
    const store = await Actor.openKeyValueStore(VAULT_STORE_NAME);

    const tokens = {
        linkedin: process.env.AUTH_TOKENS_LINKEDIN,
        facebook: process.env.AUTH_TOKENS_FACEBOOK,
        instagram: process.env.AUTH_TOKENS_INSTAGRAM,
        twitter: process.env.AUTH_TOKENS_X,
        youtube: process.env.AUTH_TOKENS_YOUTUBE,
    };

    // Filter out undefined/empty tokens
    const filteredTokens = {};
    for (const [key, value] of Object.entries(tokens)) {
        if (value) {
            filteredTokens[key] = value;
            console.log(`Prepared token for: ${key} (${value.substring(0, 20)}...)`);
        }
    }

    const newData = {
        updatedAt: new Date().toISOString(),
        tokens: filteredTokens
    };

    console.log('Writing tokens to store...');
    await store.setValue('tokens', newData);
    console.log('Successfully updated Session Vault!');

    await Actor.exit();
}

main().catch(console.error);
