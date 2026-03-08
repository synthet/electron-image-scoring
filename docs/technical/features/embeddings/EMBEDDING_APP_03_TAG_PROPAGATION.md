# 03 - Tag Propagation (Frontend)

*Part of [Embedding Applications - Frontend Implementation Index](EMBEDDING_APPLICATIONS_INDEX.md).*

## Goal

Provide a frictionless UX for accepting or rejecting AI-propagated tags based on nearest neighbors in embedding space.

## UI Integration Points

1. **Tagging Metadata Panel (`src/components/Sidebar/MetadataPanel.tsx`)**
   - The current keyword view shows confirmed/added tags.
   - Introduce an "Inferred Tags" or "Suggested Tags" subsection below the main tags.
   
2. **Quick Action "Suggest Tags"**
   - A button (e.g., magic wand icon) to trigger the `propagate_tags` backend function for the current active image.
   
3. **Visual Distinction**
   - Suggested tags must look different from manual keywords.
   - **Styles:** Dashed border, translucent background, italic font (`opacity-70 border-dashed`).
   - Clicking a suggested tag turns it into a confirmed tag (solidifies styling and triggers a DB update to save the keyword).
   - Clicking an `(x)` on a suggested tag dismisses it for that session.

4. **IPC Flow**
   - `window.electron.ipcRenderer.invoke('mcp-suggest-tags', { imageId })` returns an array of inferred strings.
   
## Design Considerations

- It may be useful to allow bulk action: "Suggest Tags for all images in folder" -> then prompt the user to review the inferred tags in a grid view mode where tag badges are layered over the thumbnails.
