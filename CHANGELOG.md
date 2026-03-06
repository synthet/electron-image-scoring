# Changelog

All notable changes to this project will be documented in this file.

## [3.27.0] - 2026-03-05

### Added
- **Duplicates UI**: Initial implementation of the `Duplicates` component for managing visually similar images.
- **Settings UI**: New `Settings` component for application-wide configuration.
- **UUID Management**: Added `scripts/add_uuids.js` and `scripts/sync_backup_uuids.js` for robust image tracking using unique identifiers.
- **Type Safety**: New `electron/types.ts` and refined TypeScript definitions across the codebase to reduce `any` usage.

### Changed
- **Code Quality**: Significant linting audit and refactoring of `src/components`, `src/hooks`, and `src/services` to meet strict ESLint rules.
- **NEF extraction**: Improved `nefViewer.ts` and `libraw-wasm` integration for better raw image handling.

### Fixed
- **API and WebSocket**: Robust error handling in `apiClient.ts` and `WebSocketService.ts`.
- **Tree Navigation**: Fixed edge cases in `treeUtils.ts` for large folder structures.

## [3.25.0] - 2026-03-03

### Added
- **Error Boundary**: Added a global `ErrorBoundary` component to catch and display rendering errors gracefully in the UI.
- **Frontend Refactoring**: Extracted core gallery and sidebar logic from `App.tsx` into a new `AppContent` component for better maintainability and state isolation.
- **Developer Documentation**: Added `CODE_DESIGN_REVIEW.md` and Gradio integration documentation to `docs/technical/`.

### Changed
- **Path Handling**: Improved path sanitization and WSL-to-Windows conversion in the `media://` protocol handler to prevent traversal attacks and handle native Windows paths more robustly.

### Fixed
- **IPC Race Condition**: Resolved an application hang during startup by ensuring all IPC handlers are registered before the Electron window is created.
- **DB Connection Stability**: Improved reliability of the initial database connection check and event listener setup.

## [3.24.1] - 2026-02-27

### Fixed
- Fixed an issue where the Stacks view would fail to display correctly by correcting the `rebuildStackCache` SQL query.
- Fixed stack cache rebuild logic to properly queue overlapping rebuild requests and UI to refresh upon completion.
- Fixed keyword data retrieval and updating in the database bounds (added missing CAST and allowed field).

## [3.24.0] - 2026-02-26

### Added
- **Image export from viewer**: Export the currently displayed preview image to disk via the `File → Export` menu in the Electron shell.

### Changed
- Keywords display and editing in the image viewer now support inline chips with add/remove behavior while keeping the `keywords` field in sync with saved metadata.

## [3.23.0] - 2026-02-26

### Added
- **Folder deletion**: Remove empty folders from the database via delete button in the folder tree (database records only; files on disk are not removed).
- **MCP Firebird integration**: Added `.cursor/rules/mcp-firebird.mdc` rule and MCP config for database diagnostics.
- **mcp-server**: New MCP server package for Firebird tooling.

### Changed
- Database queries now exclude thumbnail paths from `file_paths` when resolving `win_path`.
- `getFolders` now includes `image_count` per folder for tree display.
- Added `win_path` fallback when missing (construct from `file_path` on Windows).
- Test environment detection: automatically switches to `SCORING_HISTORY_TEST.FDB` when `NODE_ENV=test` or `VITEST`.

### Fixed
- Discard invalid `win_path` values when extension mismatches `file_name` (bad data in `file_paths`).

## [3.22.0] - 2026-02-19

### Added
- **DB Connection Status**: Added a real-time database connection status indicator (Connected/Disconnected) to the folders sidebar.
- **Image Deletion**: Implemented functionality to delete image records from the database directly from within the `ImageViewer`.
- Added `firebird` path configuration to `config.json` for flexible deployment.

## [3.21.0] - 2026-02-15

### Added
- **WebSocket integration**: Implemented `WebSocketService` to handle real-time event broadcasting from the Python scoring pipeline.
- **Notification System**: Added `NotificationTray` component and `useNotificationStore` for displaying system-wide alerts (success, info, warning, error).
- **Real-time Event Handling**: Added listeners in `App.tsx` for `stack_created`, `folder_discovered`, `job_started`, and `job_completed`.
- **IPC Enhancement**: Added `system:get-api-config` handler for dynamic API port discovery via lock files.

### Changed
- Improved path conversion for WSL-to-Windows paths in `electron/main.ts`.
- Refactored `App.tsx` to handle dynamic stack cache rebuilding on external events.

## [3.20.0] - 2026-02-15

### Added
- **New Skills**: Added `serena-integration` (for Serena MCP usage) and `scoring-pipeline` (core architecture docs) to `.agent/skills/`.
- **New Workflow**: Added `consult_serena` workflow for structured agent interactions.

### Removed
- Removed deprecated `agent-mailbox` skill and related workflows (`check_agent_mailbox`, `send_agent_mailbox`) to simplify agent tooling.

### Changed
- Refactored `src/App.tsx` and `electron/main.ts` to support improved agent integration and clean up unused code.

## [3.19.0] - 2026-02-14

### Changed
- Unified Agent Protocol: Standardized agent IDs to `electron-gallery.agent` and `image-scoring.agent` for consistent inter-project communication.
- Updated `electron-image-scoring` skills and workflows to use the new protocol.
- Simplified `send_agent_mailbox` workflow to be non-interactive.

## [3.18.0] - 2026-02-14

### Added
- **Stacks mode** for the gallery: toggle between individual images and grouped stacks via a sidebar switch.
- Stack cards with visual stacked-layer effect, image count badge, and representative thumbnail.
- Click a stack to drill into its images; "Back to Stacks" button and Escape key to navigate out.
- `stack_cache` table in Firebird for pre-computed MIN/MAX score aggregates per stack, with automatic rebuild on first use.
- 4 new IPC endpoints: `getStacks`, `getImagesByStack`, `getStackCount`, `rebuildStackCache`.
- `useStacks` React hook for paginated stack loading with filter/sort support.
- Non-stacked images displayed as single-item entries alongside stacks.

### Changed
- Refactored `GalleryGrid` to support dual display modes (images vs. stacks) with shared score display and label color helpers.
- Image viewer now operates on the correct image list (stack images when inside a stack, all images otherwise).

### Added (Developer Tooling)
- `.agent/skills/` directory with Antigravity skill definitions for electron-dev, firebird-db, gallery-ui, git-changelog, image-scoring-mcp, agent-mailbox, and moltbook.

## [3.17.0] - 2026-02-12

### Added
- New scoring model support: SPAQ, AVA, and LIQE integration in the database and viewer.
- Percentage-based score display in the gallery view for better interpretability.
- Dynamic metadata display in gallery items, automatically switching based on selected sort criteria (Date, ID, or specific quality scores).
- Support for sorting and filtering by the new scoring models (SPAQ, AVA, LIQE).

### Changed
- Refactored database queries to include new scoring columns in results.
- Updated Gallery UI to support dynamic metadata overlays.

### Fixed
- Improved git documentation and configuration for better agent integration.


### Added
- In-viewer editing of image metadata: title, description, rating, and color label directly from the image viewer.
- Delete image from database via the image viewer (database record only; file on disk is not removed).
- Edit mode toggle with Save/Cancel controls and inline form fields for title, description, rating dropdown (0–5), and label color picker.

## [3.15.0] - 2026-02-09

### Added
- Configurable database connection parameters (host, port, user, password) in `config.json` for flexible deployment.
