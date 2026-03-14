# Electron Image Scoring (electron-gallery)

High-performance Electron desktop gallery app (v3.38.0) with image scoring, browsing, and management. Built with Electron 40, React 19, Vite 7, and TypeScript 5.

## Related Projects

| Project | Path | Role |
|---------|------|------|
| **Python Backend** | `D:\Projects\image-scoring` | AI scoring engine, FastAPI server, Firebird DB schema owner |
| **Electron Frontend** (this) | `D:\Projects\electron-image-scoring` | Desktop UI, IPC query layer, React/Vite |

**Project layout:** For automatic API port discovery, this project expects `image-scoring` and `electron-image-scoring` to be sibling directories (e.g. `D:\Projects\image-scoring` and `D:\Projects\electron-image-scoring`). The backend writes `webui.lock` with its port when running. To override, set `config.api.url` or `config.api.port` in `config.json`; config takes precedence over lock file discovery.

The backend owns all DDL/schema migrations (`modules/db.py`). This project queries the shared Firebird database but does NOT create or alter tables (except `STACK_CACHE` probe).

---

## Commands

```bash
npm run dev          # Start all services: Firebird + Vite dev server + Electron
npm run dev:web      # Vite dev server only (port 5173)
npm run dev:electron # Electron main process only (waits for port 5173)
npm run build        # Production build: tsc + vite build + electron-packager
npm run test         # Vitest unit tests (watch mode)
npm run test:run     # Single test run with coverage
npm run lint         # ESLint check
npx tsc --noEmit     # Type-check without building
```

---

## Directory Structure

```
electron-image-scoring/
├── electron/              # Electron main process & IPC layer
│   ├── main.ts            # App lifecycle, window, IPC handlers (832 lines)
│   ├── preload.ts         # Context bridge — safe IPC API for renderer
│   ├── db.ts              # Firebird query layer (1500+ lines)
│   ├── apiService.ts      # HTTP client to Python FastAPI backend
│   ├── apiUrlResolver.ts  # Resolves backend URL (config → lock file → default)
│   ├── apiTypes.ts        # TypeScript types mirroring Python Pydantic models
│   ├── types.ts           # Shared domain types (ImageRow, FolderRow, AppConfig, etc.)
│   ├── nefExtractor.ts    # NEF preview extraction via libraw-wasm
│   └── tsconfig.json      # Output: ../dist-electron, target: ESNext/CommonJS
├── src/                   # React frontend (Vite + TypeScript)
│   ├── main.tsx           # React root render with ErrorBoundary
│   ├── App.tsx            # Connection check, shows loading/error states
│   ├── AppContent.tsx     # Main orchestrator: state, navigation, modals (840 lines)
│   ├── components/        # React UI components
│   ├── hooks/             # Custom React hooks (data fetching, keyboard)
│   ├── services/          # WebSocket client, Logger
│   ├── store/             # Zustand stores (notifications)
│   └── styles/            # CSS modules + global styles
├── mcp-server/            # MCP server for AI agent debugging
│   └── src/tools/         # api.ts (API inspection), cdp.ts (Chrome DevTools Protocol)
├── public/                # Static assets
├── docs/                  # Documentation
├── scripts/               # Utility scripts
├── config.json            # Runtime configuration (DB, API, selection settings)
├── package.json           # Dependencies and scripts
├── vite.config.ts         # Vite config (React plugin, relative base path)
├── tsconfig.json          # Root TS config (references app + node configs)
├── tsconfig.app.json      # Frontend TS config (ES2022, strict)
├── tsconfig.node.json     # Build tools TS config (ES2023)
└── eslint.config.mjs      # ESLint rules (typescript-eslint, react-hooks)
```

---

## Key Files

### Electron Layer

| File | Lines | Purpose |
|------|-------|---------|
| `electron/main.ts` | 832 | App lifecycle, BrowserWindow, 50+ IPC handlers, `media://` protocol |
| `electron/preload.ts` | 250 | Context bridge exposing safe IPC API to renderer |
| `electron/db.ts` | 1500+ | Firebird connection + query layer (single-connection promise queue) |
| `electron/apiService.ts` | 287 | HTTP client to Python FastAPI (timeouts: 10s default, 120s long) |
| `electron/apiUrlResolver.ts` | — | Config → lock file → default (7860) URL resolution |
| `electron/apiTypes.ts` | 168 | Request/response types mirroring Python Pydantic models |
| `electron/types.ts` | 130 | Domain types: ImageRow, FolderRow, StackRow, AppConfig, ExportImageContext |
| `electron/nefExtractor.ts` | — | Extracts embedded JPEG previews from Nikon NEF files |

### React Frontend

| File | Lines | Purpose |
|------|-------|---------|
| `src/AppContent.tsx` | 840 | Main app orchestrator: gallery state, navigation, modal management |
| `src/hooks/useDatabase.ts` | 540 | Pagination hooks: useImages, useStacks, usePaginatedData abstraction |
| `src/hooks/useFolders.ts` | 38 | Folder list fetching + tree building |
| `src/hooks/useKeyboardLayer.ts` | — | Stacked keyboard event handling with priority layers |
| `src/components/Gallery/GalleryGrid.tsx` | 400+ | Virtualized grid (react-virtuoso), context menus, keyboard nav |
| `src/components/Viewer/ImageViewer.tsx` | 500+ | Full-screen viewer: metadata, edit mode, scoring, export |
| `src/services/apiClient.ts` | 130 | WebSocket client with exponential backoff reconnection |
| `src/store/useNotificationStore.ts` | 40 | Zustand toast notification store |

---

## Architecture & Key Patterns

### 1. Electron IPC Envelope Pattern

All IPC handlers use `wrapIpcHandler<T>()` returning `{ok, data, error}`. The preload layer unwraps these, throwing on error:

```typescript
// electron/main.ts — handler side
ipcMain.handle('get-images', wrapIpcHandler(async (_, folderId) => {
  return await db.getImages(folderId);
}));

// electron/preload.ts — renderer side
getImages: (folderId) => ipcInvoke('get-images', folderId)
// ipcInvoke unwraps {ok, data, error} and throws if !ok
```

**Do not bypass this pattern.** Never call `ipcRenderer.invoke` directly from components.

### 2. Context Isolation

Renderer has no direct Node.js/file-system access. All capabilities are exposed via `contextBridge.exposeInMainWorld('electron', {...})` in preload.ts and typed in `src/electron.d.ts` as `window.electron`.

### 3. Database Access (Firebird)

`electron/db.ts` maintains a **single persistent connection** with a promise queue — not a pool. This is intentional for a single-user desktop app. Key rules:
- Never open a second connection; queue all queries through the single connection
- Test environment auto-detected via `VITEST=1` env var → uses test DB
- Firebird server started lazily via PowerShell script on first connection
- **Read-only queries only.** Schema/DDL belongs to the Python backend.

### 4. Pagination & Memory Management

`usePaginatedData<T>()` in `src/hooks/useDatabase.ts` is the generic abstraction:
- Max **2000 items** kept in memory (trims oldest on overflow)
- **Request deduplication** via `queryVersion` + `requestId` refs — ignores stale responses from rapid filter changes
- Smart refresh: re-fetches page 0 but keeps existing items until new data arrives
- `useImages()` and `useStacks()` are thin wrappers over this abstraction

### 5. Real-time Updates (WebSocket)

`src/services/apiClient.ts` connects to `ws://127.0.0.1:7860/ws/updates`. AppContent subscribes to events:

```
stack_created     → refresh stacks
folder_discovered → refresh folder tree
image_scored      → refresh visible images
job_completed     → rebuild stack cache, refresh all
```

Reconnection uses exponential backoff: 1s → 30s with 20% jitter, max 50 attempts.

### 6. Media Serving

`main.ts` registers a custom `media://` protocol for serving image files securely:
- Converts WSL paths: `/mnt/d/` → `D:/`
- Prevents path traversal (`..` not allowed, path must contain `:`)
- All image `src` attributes in the renderer use `media://local/...` URLs

### 7. URL Resolution Priority

`electron/apiUrlResolver.ts` resolves the Python backend URL:
1. `config.json` → `api.url` (highest priority)
2. `config.json` → `api.port`
3. `../image-scoring/webui.lock` file
4. Default: `http://127.0.0.1:7860`

### 8. State Management

- **Zustand:** Only for global toast notifications (`useNotificationStore`)
- **React hooks:** All data fetching and local UI state
- **No Redux/Context API** for app state — keep it in hooks

---

## Backend Integration Points

| Integration | Address | Purpose |
|-------------|---------|---------|
| **Firebird DB** | `127.0.0.1:3050` | Shared `SCORING_HISTORY.FDB` (read-only from this app) |
| **FastAPI REST** | `http://127.0.0.1:7860` | Scoring, tagging, clustering, duplicate detection, similarity search |
| **WebSocket** | `ws://127.0.0.1:7860/ws/updates` | Real-time job events, image updates |

**API Timeouts:**
- Standard: `DEFAULT_TIMEOUT = 10s`
- Batch jobs: `LONG_TIMEOUT = 120s`

---

## Configuration (`config.json`)

```json
{
  "database": {
    "host": "127.0.0.1",
    "port": 3050,
    "user": "sysdba",
    "password": "masterkey",
    "path": "d:\\Projects\\image-scoring\\SCORING_HISTORY.FDB"
  },
  "api": {
    "url": "http://127.0.0.1:7860"
  },
  "dev": {
    "url": "http://localhost:5173"
  },
  "firebird": {
    "path": "d:\\Projects\\image-scoring\\Firebird"
  },
  "selection": {
    "diversity_enabled": true,
    "diversity_lambda": 0.7
  }
}
```

`config.json` takes precedence over `webui.lock` for API URL discovery.

---

## Testing

```bash
npm run test       # Vitest watch mode
npm run test:run   # Single run with coverage
```

Test files live alongside source under `src/`:
- `src/components/Tree/treeUtils.test.ts`
- `src/hooks/useKeyboardLayer.test.tsx`
- `src/services/Logger.test.ts`
- `src/services/WebSocketService.test.ts`

Tests run under jsdom with `VITEST=1` env var set, which causes `electron/db.ts` to use the test database path.

---

## Build & Packaging

- **Target:** Windows x64 (NSIS installer)
- **Output:** `dist/` (Vite renderer), `dist-electron/` (compiled main process), `release-builds/` (packaged app)
- **Build sequence:** `tsc` (electron/) → `vite build` (src/) → `electron-packager`

---

## AI Assistant Guidelines

1. **Never modify DB schema.** All table creation/alteration belongs to `D:\Projects\image-scoring\modules\db.py`.
2. **Use the IPC envelope pattern** (`wrapIpcHandler`) for any new IPC handlers.
3. **Expose new IPC methods through preload.ts** and add types to `src/electron.d.ts`.
4. **New data fetching hooks** should extend `usePaginatedData<T>()` rather than reimplementing pagination.
5. **Media URLs** in the renderer must use the `media://local/` protocol, not file paths.
6. **State management:** Use Zustand only for truly global state (notifications). Prefer local hooks.
7. **The single Firebird connection** in `db.ts` is intentional — do not add connection pooling.
8. **Test environment detection** uses the `VITEST` env var — preserve this in any db.ts changes.
9. **WSL path conversion** (`/mnt/d/` → `D:/`) must be preserved in media protocol handler.
10. **Type-check before committing:** `npx tsc --noEmit` in both root and `electron/` directories.
