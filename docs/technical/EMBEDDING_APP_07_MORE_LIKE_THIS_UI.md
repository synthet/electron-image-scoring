# 07 - More Like This UI (Frontend)

*Part of [Embedding Applications - Frontend Implementation Index](EMBEDDING_APPLICATIONS_INDEX.md).*

## Goal

Provide a cross-folder semantic search feature, letting users find images visually similar to a chosen reference image.

## UI Integration Points

1. **Context Menu (`src/components/ContextMenu/ImageContextMenu.tsx`)**
   - Add a right-click option on any image thumbnail: **"Find Similar Images..."**.

2. **Metadata Actions Panel**
   - Add a distinctive button (e.g., magnifying glass with a photo icon) below the image details: **"Search Visually Similar"**.

3. **Results View**
   - Opens a custom **Similar Images Drawer** (bottom or sliding side panel) or a standalone modal overlay.
   - Displays the top N matching thumbnails (default N=20).
   - Shows the cosine similarity score on each thumbnail badge (e.g., "96% match").

4. **Interaction inside Results**
   - Clicking a thumbnail in the similar results pane highlights that image in its native folder context, or opens it directly in Loupe view.
   - Include a "Jump to Folder" button.

## IPC / Data Flow

- The action triggers an IPC invocation to the existing `search_similar_images` functionality on the backend.
- `window.electron.ipcRenderer.invoke('mcp-similar-search', { referenceId: currentImage.id, limit: 20 })`.
- This is a fast L2 proximity query and should resolve quickly, but the UI should show a standard inline spinner during fetch.

## Design Considerations

- This is arguably the most user-facing and magical embedding feature. Make the results gallery visually stunning. Ensure high-res thumbnails load optimally in this secondary view.
