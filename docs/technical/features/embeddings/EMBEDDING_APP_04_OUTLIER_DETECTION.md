# 04 - Outlier Detection (Frontend)

*Part of [Embedding Applications - Frontend Implementation Index](EMBEDDING_APPLICATIONS_INDEX.md).*

## Goal

Provide visual cues in the main gallery view for images mathematically determined to be "outliers" compared to their folder peers.

## UI Integration Points

1. **Toolbar Toggle**
   - Add a high-level toggle in the `GalleryToolbar`: `[x] Highlight Outliers`.
   - When active, the frontend issues a request to the backend `find_outliers` MCP tool for the current folder path.

2. **Gallery Grid Rendering (`src/components/Gallery/VirtualGrid.tsx` or similar)**
   - When the `find_outliers` data returns, cross-reference the `image_id`s in the active view against the outlier set.
   - For matching thumbnails:
     - Apply an attention-grabbing border (e.g., solid red or yellow warning color).
     - Display a small warning icon in the corner overlay.
   
3. **Filtering/Grouping**
   - Optionally, add an "Outliers Only" filter to the left-pane "Filter By" section, letting users view *only* the anomalous images for quick batch deletion or moving.

## IPC / Data Flow

- Outlier detection shouldn't block initial gallery loading. 
- Fast path: Load gallery as usual.
- Async path: Emit `window.electron.ipcRenderer.invoke('mcp-find-outliers', { folder })`.
- When results arrive, batch-update the React state `outlierIds: Set<string>`, triggering a re-render of affected thumbnail cards.

## Design Considerations

- Outlier sets can be cached per-folder temporarily on the frontend to avoid re-running the python computation every time the user toggles the view.
