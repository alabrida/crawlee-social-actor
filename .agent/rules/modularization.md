# Modularization Guardrails

| ID | Rule | Enforcement |
|---|---|---|
| G-MOD-01 | No `.ts` file may exceed **250 lines** (including comments and blank lines). | VDO runs `wc -l` at GREEN → HARDEN gate; reject if exceeded. |
| G-MOD-02 | File names: **kebab-case**; functions: **camelCase**; types/interfaces: **PascalCase**; constants: **UPPER_SNAKE_CASE**. | VDO audits against `naming-conventions.md`. |
| G-MOD-03 | Every module's public API must be listed in `import-map.json`. After any refactor, update and verify all consumers. | VDO cross-references after every refactor. |
| G-MOD-04 | When a file must be split, helper/sub-modules go in a **co-located subfolder** with `index.ts` re-exports. | VDO proposes split; Architect approves. |
| G-MOD-05 | No circular dependencies. Import direction: `main → routes → handlers → utils → schemas`. | VDO verifies acyclic dependency graph. |
| G-MOD-06 | Every function must have a JSDoc comment with `@param` and `@returns` tags. | VDO checks at GREEN → HARDEN gate. |
