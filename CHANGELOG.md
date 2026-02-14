# Changelog

All notable changes to this project will be documented in this file.

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
