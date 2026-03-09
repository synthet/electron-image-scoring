# TODO - Electron Image Scoring

Consolidated list of unfinished work items. See [Code Design Review (Mar 2026)](../reports/01-code-design-review-2026-03.md) for full review context.

---

## ✅ Completed (Recently)

- [x] Harden `media://` path validation (traversal protection added)
- [x] Implement Database Connection Pooling (`electron/db.ts`)
- [x] Scale protection for `useImages` (2000 item limit + generic pagination)
- [x] Standardized IPC error handling envelope `{ ok, data, error }`
- [x] Efficient NEF buffer serialization (native Buffer passing)

## P1 (High Priority)

- [ ] Add explicit request token / in-flight guard to `useImages` for pagination races
- [ ] Implement global React Error Boundary for recovery
- [ ] Setup `Vitest` and basic test coverage for hooks

## P2 (Medium Priority)

- [ ] Add log rotation and retention for session logs
- [ ] Decompose `App.tsx` into modular components and hooks
- [ ] Consolidate styling into a unified system (CSS Modules or Tailwind)

## P3 (Lower Priority)

- [ ] Refactor folder lookup to indexed structure in `useFolders`
- [ ] Cleanup remaining lint/type warnings (`no-explicit-any`)
- [ ] Upgrade `node-firebird` or migrate to a modern driver
