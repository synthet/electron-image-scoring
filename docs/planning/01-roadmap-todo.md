# TODO - Electron Image Scoring

Consolidated list of unfinished work items. Last Updated: Mar 10, 2026.

---

## ✅ Completed (Recently)

- [x] Harden `media://` path validation (traversal protection)
- [x] Implement Database Connection Pooling (`electron/db.ts`)
- [x] Scale protection for `useImages` (2000 item limit + pagination)
- [x] Standardized IPC error handling envelope `{ ok, data, error }`
- [x] Efficient NEF buffer serialization (native Buffer passing)
- [x] Implement global React Error Boundary (`src/main.tsx`)
- [x] Patched `node-firebird` crash & added `postinstall` safeguard
- [x] Initial Image Import UI with deduplication (`ImportModal.tsx`)
- [x] Centralized REST API client for Python backend (`ApiService.ts`)

## P1 (High Priority)

- [ ] **Embedding Feature Integration**:
    - [ ] Add "Find Similar" to context menu and details panel
    - [ ] Integrate "Duplicate Finder" into main navigation
- [ ] Add explicit request token / in-flight guard to `useImages` for pagination races
- [ ] Setup `Vitest` and basic test coverage for hooks/services

## P2 (Medium Priority)

- [ ] Add log rotation and retention for session logs
- [ ] Further decompose `AppContent.tsx` into modular domain hooks/components
- [ ] Consolidate styling into a unified system (CSS Modules or Tailwind)
- [ ] Implement semantic "Tag Propagation" UI from similar images

## P3 (Lower Priority)

- [ ] Refactor folder lookup to indexed structure in `useFolders`
- [ ] Cleanup remaining lint/type warnings (`no-explicit-any`)
- [ ] 2D Embedding Map (WebGL visualization)
- [ ] Outlier Detection UI
