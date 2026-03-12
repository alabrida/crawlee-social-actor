# Naming Convention Registry

> **Authority:** VDO Agent · **Rule:** G-MOD-02

This document is the single source of truth for naming conventions across the codebase.

---

## File Names

| Pattern | Example | Applies To |
|---|---|---|
| **kebab-case** | `google-maps.ts` | All `.ts` files, directories |
| **kebab-case** | `ua-rotation.ts` | Utility modules |
| **kebab-case** | `input_schema.json` | Exception: Apify requires underscores for schema files |

## Function Names

| Pattern | Example | Applies To |
|---|---|---|
| **camelCase** | `getSessionPool()` | All exported and internal functions |
| **camelCase** | `detectBlock()` | Handler interface methods |
| **camelCase** | `trackBandwidth()` | Utility functions |

## Type & Interface Names

| Pattern | Example | Applies To |
|---|---|---|
| **PascalCase** | `PlatformHandler` | Interfaces |
| **PascalCase** | `ScrapedItem` | Type aliases |
| **PascalCase** | `ActorInput` | Input/output types |
| **PascalCase** | `Platform` | Union types |

## Constants

| Pattern | Example | Applies To |
|---|---|---|
| **UPPER_SNAKE_CASE** | `BLOCKED_RESOURCE_TYPES` | Module-level constants |
| **UPPER_SNAKE_CASE** | `BANDWIDTH_WARNING_THRESHOLD` | Configuration thresholds |
| **UPPER_SNAKE_CASE** | `USER_AGENTS` | Static data arrays |
| **UPPER_SNAKE_CASE** | `HANDLER_REGISTRY` | Registry objects |

## Module Exports

- Every module's public API must be listed in `import-map.json` (G-MOD-03)
- Default exports are used for handler objects only
- Named exports for all utility functions
- Re-exports via `index.ts` when files are split into subfolders (G-MOD-04)

## JSDoc

- Every exported function must have JSDoc with `@param` and `@returns` tags (G-MOD-06)
- Module-level `@module` and `@description` doc comments on every file
- `@see` tags to reference relevant PRD sections and guardrail IDs
