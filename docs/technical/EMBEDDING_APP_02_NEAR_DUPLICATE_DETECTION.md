# 02 - Near-Duplicate Detection (Frontend)

*Part of [Embedding Applications - Frontend Implementation Index](EMBEDDING_APPLICATIONS_INDEX.md).*

## Goal

Provide a dedicated maintenance interface to review, manage, and clean up visually identical or near-identical images across the library or within a specific folder.

## UI Integration Points

1. **Duplicate Finder View (`src/components/Views/DuplicateFinder.tsx`)**
   - Accessible via a new sidebar navigation item: "Maintenance" -> "Find Duplicates".
   - **Controls:**
     - Folder scope selection (Entire Library vs. Specific Folder).
     - Similarity Threshold slider (Default 0.98).
     - "Scan Now" button with progress indication (may take several seconds via backend).
   - **Layout:**
     - Data arrives from backend as arrays of image pairs/groups `[{id, file_path, score, resolution...}, ...]`.
     - Render as a grid of "Duplicate Sets". Each set displays 2+ images side-by-side.
     - Overlay visual cues showing differences: score delta, resolution delta, file size delta.
   
2. **Action Buttons per Set**
   - **"Keep Best Only"**: Automatically rejects (sets rating=-1 or flags as cull) all but the highest scoring image in that set.
   - **"Manual Resolve"**: Expands the group in a larger modal for pixel-peeping.

3. **IPC / MCP Flow**
   - Connects to the `find_near_duplicates` server tool via the MCP client integration.
   - Triggers `window.electron.ipcRenderer.invoke('mcp-find-duplicates', { threshold, folder })`.

## Design Considerations

- Because scanning large libraries is compute-heavy, the UI must handle long-running timeouts gracefully or show a determinate progress bar via job status polling.
