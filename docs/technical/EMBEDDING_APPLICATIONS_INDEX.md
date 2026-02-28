# Embedding Applications - Frontend Implementation Index

This index breaks out each proposed `image_embedding` frontend use case into a separate implementation document, mirroring the backend architecture proposals. See the [source proposal summary](EMBEDDING_APPLICATIONS.md) for the UI overview.

## Documents

- [01 - Diversity-Aware Selection](EMBEDDING_APP_01_DIVERSITY_SELECTION.md)
- [02 - Near-Duplicate Detection](EMBEDDING_APP_02_NEAR_DUPLICATE_DETECTION.md)
- [03 - Tag Propagation](EMBEDDING_APP_03_TAG_PROPAGATION.md)
- [04 - Outlier Detection](EMBEDDING_APP_04_OUTLIER_DETECTION.md)
- [05 - 2D Embedding Map](EMBEDDING_APP_05_2D_EMBEDDING_MAP.md)
- [06 - Smart Stack Representative](EMBEDDING_APP_06_SMART_STACK_REPRESENTATIVE.md)
- [07 - More Like This UI](EMBEDDING_APP_07_MORE_LIKE_THIS_UI.md)

## Scope and assumptions

- Existing Electron setup with React/Vite continues to operate via IPC and `mcp-firebird`/`image-scoring` MCP servers.
- The UI features strictly depend on backend services providing configuration options and similarity query results.
- No heavy embedding processing runs in the Chromium/Node renderers; all compute is in Python.
