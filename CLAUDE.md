# Electron Image Scoring (electron-gallery)

High-performance Electron desktop gallery app with image scoring, browsing, and management.

## Related Projects

| Project | Path | Role |
|---------|------|------|
| **Python Backend** | `D:\Projects\image-scoring` | AI scoring engine, FastAPI server, Firebird DB schema owner |
| **Electron Frontend** (this) | `D:\Projects\electron-image-scoring` | Desktop UI, IPC query layer, React/Vite |

The backend owns all DDL/schema migrations (`modules/db.py`). This project queries the shared Firebird database but does NOT create or alter tables (except `STACK_CACHE` probe).

## Key Files

- `electron/db.ts` — Firebird query layer (single-connection promise queue)
- `electron/main.ts` — Electron main process, IPC handlers
- `electron/apiService.ts` — HTTP client to Python FastAPI backend
- `src/` — React frontend (Vite + TypeScript)
- `mcp-server/` — MCP server for AI agent debugging

## Backend Integration Points

- **Shared DB:** `SCORING_HISTORY.FDB` (Firebird), schema managed by `D:\Projects\image-scoring\modules\db.py`
- **REST API:** Electron calls Python backend via `http://localhost:8000` for scoring/tagging jobs
- **Config:** `D:\Projects\image-scoring\config.json` controls backend behavior

## Commands

- `npm run dev` — Start dev mode (Firebird + Vite + Electron)
- `npm run build` — Production build + package
- `npx tsc --noEmit` — Type-check