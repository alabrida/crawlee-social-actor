# Synchronization & Session Guardrails

## Synchronization

| ID | Rule | Enforcement |
|---|---|---|
| G-SYNC-01 | No agent begins the next phase until prior exit criteria are met. | Architect validates handoff checklist. |
| G-SYNC-02 | Blocker Registry (Supabase `blockers` table) is the single source of truth. Local `blockers-snapshot.json` exported at every session-end. | Updated after every status change; snapshot exported at session-end checkpoint. |
| G-SYNC-03 | Each iteration cycle must be logged in `iteration_log.md`. | Architect maintains the log. |

## Session Continuity

| ID | Rule | Enforcement |
|---|---|---|
| G-SESSION-01 | `project-state.json` must be updated at every phase transition and every session end. | Architect validates before approving any gate. |
| G-SESSION-02 | No session may end without the Session-End Checkpoint being completed. | Human verifies checklist before closing. |
| G-SESSION-03 | Every new session must begin with the 8-step Session-Resume Workflow. | First action in any new session; agent confirms state before proceeding. |
| G-SESSION-04 | Session briefings must follow the standardized format (see `session-briefings/README.md`). | VDO audits briefing structure at session end. |
| G-SESSION-05 | Agent must proactively recommend a session boundary when context is ~60% consumed. | Agent self-monitors; alerts human with suggested pause point. |

## Session-End Checkpoint

Before any session ends, the agent must complete:

- [ ] `project-state.json` updated with current phase, platform status, and next action
- [ ] `blockers-snapshot.json` exported from Supabase `blockers` table
- [ ] `iteration_log.md` has entries for all phase transitions this session
- [ ] `value-ledger.md` updated if value was delivered
- [ ] `import-map.json` reflects current module structure
- [ ] All code changes committed to feature branch
- [ ] Session briefing written to `session-briefings/session-YYYY-MM-DD.md`

## Session-Resume Workflow (New Session)

1. Read `project-state.json` → sprint, phase, platform, role
2. Query Supabase `blockers` table → open blockers
3. Read `value-ledger.md` → delivered value
4. Read latest `session-briefings/session-*.md` → last session context
5. Read `iteration_log.md` (last 10 entries) → orientation
6. Read relevant handler file(s) → code context
7. Announce: "Resuming Sprint X, Phase Y, Platform Z. Next action: ..."
8. Wait for human confirmation
