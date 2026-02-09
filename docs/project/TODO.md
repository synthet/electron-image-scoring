# TODO - Electron Image Scoring

Consolidated list of unfinished work items. See [2026-02-09-code-and-design-review.md](../reviews/2026-02-09-code-and-design-review.md) for full review context.

---

## P1 (High Priority)

- Harden `media://` path validation and remove CSP bypass
- Add request token / in-flight guard to `useImages` for pagination races

## P2 (Medium Priority)

- Add log rotation and retention for session logs
- Introduce shared IPC types and convert high-traffic endpoints

## P3 (Lower Priority)

- Refactor folder lookup to indexed structure in `useFolders`
- Cleanup remaining lint/type warnings (`no-explicit-any`)
