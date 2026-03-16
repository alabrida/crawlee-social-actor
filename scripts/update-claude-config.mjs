import fs from 'fs';
import path from 'path';

const configPath = path.join(process.env.APPDATA, 'Claude', 'claude_desktop_config.json');
const apifyToken = process.env.APPIFY_TOKEN || process.env.APIFY_TOKEN;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!apifyToken || !supabaseUrl || !supabaseKey) {
    console.error('Missing required environment variables (APIFY_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_KEY)');
    process.exit(1);
}

try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Add Apify MCP Server
    config.mcpServers.apify = {
        command: "npx",
        args: ["-y", "@apify/actors-mcp-server"],
        env: {
            APIFY_TOKEN: apifyToken
        }
    };

    // Add Supabase MCP Server
    config.mcpServers.supabase = {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-supabase"],
        env: {
            SUPABASE_URL: supabaseUrl,
            SUPABASE_API_KEY: supabaseKey
        }
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('Successfully updated Claude Desktop config with Apify and Supabase MCP servers.');
} catch (e) {
    console.error('Failed to update config:', e.message);
    process.exit(1);
}
