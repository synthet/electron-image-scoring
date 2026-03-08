# 05 - 2D Embedding Map (Frontend)

*Part of [Embedding Applications - Frontend Implementation Index](EMBEDDING_APPLICATIONS_INDEX.md).*

## Goal

Provide a visual cluster map of the entire photo collection or a specific folder, based on UMAP dimensionality reduction of image embeddings.

## UI Integration Points

1. **Navigation**
   - New primary tab alongside `Folders | Stacks | Smart Search`: **`Visual Map`**.

2. **Visualization Engine**
   - Implement a WebGL-accelerated point cloud renderer capable of rendering 10k-100k points smoothly.
   - Library options: `deck.gl`, `regl`, or a dedicated React wrapper like `react-vis-force`.
   - Each point `(x,y)` corresponds to an image's UMAP projection.

3. **Interactions**
   - **Hover:** Fast tooltip rendering a low-resolution thumbnail, image name, and score.
   - **Click:** Selects the point. Double-click to jump to that image in the standard full-screen viewer.
   - **Lasso Tool:** Allow drawing a shape to select a cluster of points -> adds them to the active selection queue for bulk rating or tagging.
   - **Color By:** A toolbar dropdown to assign plot colors based on: `Score General`, `Folder`, `Color Label`, or `Rating`.

## IPC / Data Flow

- The backend provides the raw 2D coordinates `[{ id, x, y, score, ... }]` through a new API endpoint or MCP tool.
- The `x, y` payload should be compactly serialized (e.g., arrays or typed buffers) if the dataset is massive.

## Design Considerations

- UMAP mapping is expensive to compute the first time. The UI should show a "Generating Map..." loading state with potential progress polling if the python backend implements step-callbacks.
