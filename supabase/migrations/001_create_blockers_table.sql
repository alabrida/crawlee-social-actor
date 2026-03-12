-- Supabase migration: Create blockers table for the Blocker Registry
-- See agent-team.md Section 3.1 for schema definition

CREATE TABLE IF NOT EXISTS blockers (
    id TEXT PRIMARY KEY,                          -- Unique ID, e.g. BLOCK-001
    platform TEXT NOT NULL,                       -- Target platform name
    type TEXT NOT NULL,                           -- Blocker category (crypto_signature, rate_limit, captcha, etc.)
    description TEXT NOT NULL,                    -- Full description with reproduction steps
    status TEXT NOT NULL DEFAULT 'open'           -- open | mitigated | verified | wont_fix
        CHECK (status IN ('open', 'mitigated', 'verified', 'wont_fix')),
    mitigation TEXT,                              -- How the blocker was overcome
    verified_by TEXT,                             -- Agent name that verified the fix
    verified_at TIMESTAMPTZ,                      -- When verification occurred
    evidence TEXT,                                -- Screenshot path or response snippet
    sprint INTEGER,                               -- Sprint number when discovered
    created_at TIMESTAMPTZ DEFAULT NOW()          -- Auto-set on insert
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_blockers_platform ON blockers(platform);
CREATE INDEX IF NOT EXISTS idx_blockers_status ON blockers(status);
CREATE INDEX IF NOT EXISTS idx_blockers_sprint ON blockers(sprint);

-- Enable RLS (standard Supabase practice)
ALTER TABLE blockers ENABLE ROW LEVEL SECURITY;

-- Allow full access for authenticated users (agents operate via service key)
CREATE POLICY "Allow full access for authenticated users"
    ON blockers
    FOR ALL
    USING (true)
    WITH CHECK (true);
