---
name: gallery-ui
description: React component patterns, state management, virtualization, and styling conventions for the gallery UI.
---

# Gallery UI Component Patterns

## Component Architecture

```
App.tsx                          ← Root: state, filters, image selection
├── MainLayout                   ← 3-panel layout (header, sidebar, content)
│   ├── header                   ← Current folder name + item count
│   ├── sidebar
│   │   ├── FilterPanel          ← Rating slider, color label filter
│   │   ├── Keyword/Sort selects ← Inline selects for keyword, sortBy, order
│   │   └── FolderTree           ← Folder browser tree
│   └── content
│       ├── GalleryGrid          ← Virtualized image/stack grid
│       └── ImageViewer          ← Full-screen viewer overlay
```

## State Management

### Local State in `App.tsx`
- `selectedFolderId` — current folder
- `filters` (type `FilterState`) — `{ minRating, sortBy, order, keyword, colorLabel }`
- `openingImage` — image shown in viewer (null = viewer closed)
- `currentImageIndex` — position in the image list for prev/next

### Hooks (in `src/hooks/`)

| Hook | File | Purpose |
|------|------|---------|
| `useDatabase()` | `useDatabase.ts` | Connection status (`isConnected`, `error`) |
| `useImages(pageSize, folderId, filters)` | `useDatabase.ts` | Paginated image loading with infinite scroll |
| `useStacks(pageSize, folderId, filters)` | `useDatabase.ts` | Paginated stack loading |
| `useKeywords()` | `useDatabase.ts` | Available keyword list |
| `useFolders()` | `useFolders.ts` | Folder tree from DB |
| `useSessionRecorder()` | `useSessionRecorder.ts` | Debug session recording |

### Pagination Pattern (`useImages` / `useStacks`)
Both hooks follow the same pattern:
1. Reset `offset=0`, clear data when `folderId` or `filters` change
2. Fetch total count for header display
3. `loadMore()` fetches next page, deduplicates by ID, appends
4. `hasMore` flag stops infinite scroll at end

## GalleryGrid (`src/components/Gallery/GalleryGrid.tsx`)

Uses `react-virtuoso`'s `VirtuosoGrid` for performance:

```tsx
<VirtuosoGrid
    style={{ height: '100%' }}
    totalCount={displayData.length}
    overscan={400}
    endReached={handleEndReached}
    components={{ List: ItemContainer, Item: ItemWrapper }}
    itemContent={itemContent}
/>
```

### Key Implementation Details

- **Fixed item size**: 180×240px cards
- **Dual mode**: Normal images vs. stacks (controlled by `stacksMode` prop)
- **Score display**: Dynamic based on `sortBy` — shows percentage, date, or ID
- **Label colors**: Maps `Red/Yellow/Green/Blue/Purple` → hex colors for border
- **Rating stars**: Gold `★` overlay on image bottom
- **Image source**: `media://` protocol for all images (see electron-dev skill)

### Adding a New Display Mode

1. Add new `sortBy` case in `getScoreDisplay()` callback
2. If needed, add new score column to the `Image` interface
3. Add `<option>` to the sort dropdown in `App.tsx`
4. Ensure the DB query in `electron/db.ts` includes the column in SELECT

## Styling Conventions

- **Inline CSS**: The project uses inline styles (not CSS modules or Tailwind)
- **Dark theme**: Backgrounds `#1e1e1e`/`#2a2a2a`, text `#eee`/`#ccc`/`#888`
- **Consistent padding**: 8–10px for cards, 20px for containers
- **Gradient overlays**: `linear-gradient(to top, rgba(0,0,0,0.8), transparent)` for text-on-image

## FilterPanel (`src/components/Sidebar/FilterPanel.tsx`)

Exports `FilterState` interface and `FilterPanel` component:
```typescript
interface FilterState {
    minRating?: number;
    colorLabel?: string;
    keyword?: string;
    sortBy?: string;
    order?: 'ASC' | 'DESC';
}
```

### Adding a New Filter

1. Add field to `FilterState` interface
2. Add UI control in `FilterPanel` or `App.tsx` sidebar
3. Update `ImageQueryOptions` in `electron/db.ts` with matching field
4. Add SQL condition in `getImages()` / `getImageCount()`

## ImageViewer (`src/components/Viewer/ImageViewer.tsx`)

Full-screen overlay with:
- Prev/next navigation (arrow keys + buttons)
- Metadata display (scores, rating, label, keywords)
- In-viewer editing (title, description, rating, color label)
- Delete from database
- Escape key to close

## Folder Navigation

- `FolderTree` component renders a nested tree
- Selection updates `selectedFolderId` → triggers `useImages` reset
- Escape key navigates to parent folder (only when viewer is closed)
- Subfolders shown as icon cards when a folder has no images
