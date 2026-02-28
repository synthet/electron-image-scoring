# Integrating `image_embedding` Features into Electron App

Based on the [backend proposals](../../../../image-scoring/docs/technical/EMBEDDING_APPLICATIONS.md) for leveraging MobileNetV2 1280-d feature vectors, this document summarizes how the `electron-image-scoring` frontend will expose these capabilities. 

For a detailed breakdown of each feature's UI integration, refer to the [Embedding Applications Index](EMBEDDING_APPLICATIONS_INDEX.md).

## Summary of Capabilities

1. **Diversity-Aware Selection:** Reranks stacks to ensure visual variety among top picks using MMR.
2. **Near-Duplicate Detection:** Dedicated maintenance view to clean up near-identical images.
3. **Tag Propagation:** Frictionless UI to accept or reject AI-inferred keywords from visually similar images.
4. **Outlier Detection:** Highlights anomalous or misfiled images in the gallery grid.
5. **2D Embedding Map:** A new WebGL map tab to visualize the entire collection's clusters.
6. **Smart Stack Representative:** Settings toggle to choose stack covers by centroid rather than purely by top score.
7. **"More Like This" Recommendations:** Context menu action to find visually similar images across the entire database.

All features rely heavily on the existing MCP integration (`image-scoring` and `mcp-firebird`) or standard local IPC handlers to communicate with the Python backend. No ML embedding processing runs in the Chromium or Node renderer processes.

---
**Next Steps:** See the [Detailed Index](EMBEDDING_APPLICATIONS_INDEX.md) to explore the technical spec for each individual frontend UI feature.
