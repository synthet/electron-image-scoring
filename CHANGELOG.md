# Changelog

All notable changes to this project will be documented in this file.

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
