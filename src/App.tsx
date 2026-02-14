import { useState, useMemo, useEffect, useCallback } from 'react';
import { MainLayout } from './components/Layout/MainLayout';
import { useDatabase, useImages, useKeywords, useStacks } from './hooks/useDatabase';
import { useFolders } from './hooks/useFolders';
import { FolderTree } from './components/Tree/FolderTree';
import type { Folder } from './components/Tree/treeUtils';
import { GalleryGrid } from './components/Gallery/GalleryGrid';
import { FilterPanel } from './components/Sidebar/FilterPanel';
import type { FilterState } from './components/Sidebar/FilterPanel';
import { ImageViewer } from './components/Viewer/ImageViewer';
import { useSessionRecorder } from './hooks/useSessionRecorder';

function App() {
  useSessionRecorder();
  const { isConnected, error } = useDatabase();
  const { folders, loading: foldersLoading } = useFolders();
  const { keywords, loading: keywordsLoading } = useKeywords();

  const [selectedFolderId, setSelectedFolderId] = useState<number | undefined>(undefined);
  const [filters, setFilters] = useState<FilterState>({ minRating: 0, sortBy: 'score_general', order: 'DESC' });
  const [openingImage, setOpeningImage] = useState<any | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);

  // Stacks mode state
  const [stacksMode, setStacksMode] = useState(false);
  const [activeStackId, setActiveStackId] = useState<number | null>(null);
  const [activeStackInfo, setActiveStackInfo] = useState<{ stackId: number; imageCount: number } | null>(null);
  const [cacheBuilt, setCacheBuilt] = useState(false);

  const { images, loadMore, totalCount } = useImages(50, selectedFolderId, filters);
  const { stacks, loadMore: loadMoreStacks, totalCount: stacksTotalCount } = useStacks(50, selectedFolderId, filters);

  const [stackImages, setStackImages] = useState<any[]>([]);
  const [stackImagesLoading, setStackImagesLoading] = useState(false);

  // Rebuild stack cache when stacks mode is first enabled
  useEffect(() => {
    if (stacksMode && !cacheBuilt && window.electron) {
      window.electron.rebuildStackCache().then((result) => {
        console.log('[App] Stack cache rebuild result:', result);
        setCacheBuilt(true);
      }).catch(err => {
        console.error('[App] Failed to rebuild stack cache:', err);
      });
    }
  }, [stacksMode, cacheBuilt]);

  // Load images when activeStackId changes or filters change while inside a stack
  const loadStackImages = useCallback(async (stackId: number) => {
    if (!window.electron) return;
    setStackImagesLoading(true);
    try {
      const options = { folderId: selectedFolderId, ...filters };
      const imgs = await window.electron.getImagesByStack(stackId, options);
      setStackImages(imgs);
    } catch (err) {
      console.error("Failed to load stack images", err);
    } finally {
      setStackImagesLoading(false);
    }
  }, [selectedFolderId, filters]);

  // React to filter changes while viewing a stack
  useEffect(() => {
    if (activeStackId !== null) {
      loadStackImages(activeStackId);
    }
  }, [activeStackId, loadStackImages]);

  const handleSelectFolder = (folder: Folder) => {
    setSelectedFolderId(folder.id);
    setActiveStackId(null);
    setActiveStackInfo(null);
    setStackImages([]);
  };

  const currentFolder = useMemo(() => {
    if (!selectedFolderId) return null;
    const find = (nodes: Folder[]): Folder | undefined => {
      for (const node of nodes) {
        if (node.id === selectedFolderId) return node;
        if (node.children) {
          const found = find(node.children);
          if (found) return found;
        }
      }
    };
    return find(folders);
  }, [folders, selectedFolderId]);

  const handleImageClick = (image: any) => {
    const imgList = activeStackId ? stackImages : images;
    const index = imgList.findIndex(img => img.id === image.id);
    setCurrentImageIndex(index >= 0 ? index : 0);
    setOpeningImage(image);
  };

  const handleNavigateImage = (newIndex: number) => {
    const imgList = activeStackId ? stackImages : images;
    if (newIndex >= 0 && newIndex < imgList.length) {
      setCurrentImageIndex(newIndex);
      setOpeningImage(imgList[newIndex]);
    }
  };

  const handleSelectStack = (stack: any) => {
    if (stack.stack_id !== null && stack.stack_id !== undefined) {
      setActiveStackId(stack.stack_id);
      setActiveStackInfo({ stackId: stack.stack_id, imageCount: stack.image_count || 0 });
      loadStackImages(stack.stack_id);
    } else {
      // Single image "stack" - just open the image
      handleImageClick(stack);
    }
  };

  const handleNavigateToParent = () => {
    // If viewing inside a stack, go back to stacks view
    if (activeStackId) {
      setActiveStackId(null);
      setActiveStackInfo(null);
      setStackImages([]);
      return;
    }

    if (!selectedFolderId) return;

    // Find parent of current folder
    const findParent = (nodes: Folder[], targetId: number, parentId?: number): number | undefined => {
      for (const node of nodes) {
        if (node.id === targetId) return parentId;
        if (node.children) {
          const result = findParent(node.children, targetId, node.id);
          if (result !== undefined) return result;
        }
      }
      return undefined;
    };

    const parentId = findParent(folders, selectedFolderId);
    setSelectedFolderId(parentId);
  };

  const closeViewer = () => {
    setOpeningImage(null);
  };

  // Determine current display
  const currentImages = activeStackId ? stackImages : images;
  const currentTotal = stacksMode && !activeStackId ? stacksTotalCount : (activeStackId ? (activeStackInfo?.imageCount || stackImages.length) : totalCount);

  // Header title
  const headerTitle = (() => {
    if (activeStackId) {
      return `Stack #${activeStackId}`;
    }
    return currentFolder ? (currentFolder.title || 'Folder') : 'Image Gallery';
  })();

  if (!isConnected && !error) return <div style={{ padding: 20 }}>Connecting to services...</div>;
  if (error) return <div style={{ padding: 20, color: 'red' }}>Error: {error}</div>;

  return (
    <MainLayout
      header={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: '1.2em' }}>
            {headerTitle}
          </h2>
          <span style={{ fontSize: '0.9em', color: '#888' }}>
            ({currentTotal} {stacksMode && !activeStackId ? 'stacks' : 'items'})
          </span>
          {activeStackId && (
            <button
              onClick={() => { setActiveStackId(null); setActiveStackInfo(null); setStackImages([]); }}
              style={{
                background: 'none', border: '1px solid #555', color: '#ccc',
                padding: '2px 10px', borderRadius: 4, cursor: 'pointer', fontSize: '0.85em'
              }}
            >
              ← Back to Stacks
            </button>
          )}
        </div>
      }
      sidebar={
        <div style={{ padding: 10, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <h3 style={{ marginBottom: 10 }}>Folders</h3>
          <div style={{ marginBottom: 10, fontSize: '0.8em', color: '#888' }}>
            <p>DB Status: Connected</p>
          </div>

          <div style={{ padding: '0 0 10px 0', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {/* Stacks Toggle */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px', background: '#333', borderRadius: 4, border: '1px solid #555'
            }}>
              <span style={{ fontSize: '12px', color: '#ccc' }}>Stacks</span>
              <button
                onClick={() => {
                  setStacksMode(!stacksMode);
                  setActiveStackId(null);
                  setActiveStackInfo(null);
                  setStackImages([]);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 0,
                  background: 'none', border: '1px solid #666', borderRadius: 12,
                  padding: 0, cursor: 'pointer', overflow: 'hidden'
                }}
              >
                <span style={{
                  padding: '3px 10px', fontSize: '11px', fontWeight: 600,
                  background: !stacksMode ? '#007acc' : '#444',
                  color: !stacksMode ? '#fff' : '#999',
                  transition: 'all 0.15s ease'
                }}>OFF</span>
                <span style={{
                  padding: '3px 10px', fontSize: '11px', fontWeight: 600,
                  background: stacksMode ? '#007acc' : '#444',
                  color: stacksMode ? '#fff' : '#999',
                  transition: 'all 0.15s ease'
                }}>ON</span>
              </button>
            </div>

            <select
              value={filters.keyword || ''}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value || undefined })}
              style={{
                background: '#333',
                color: '#eee',
                border: '1px solid #555',
                padding: '6px',
                borderRadius: 4,
                width: '100%',
                cursor: 'pointer'
              }}
              disabled={keywordsLoading}
            >
              <option value="">All Keywords</option>
              {keywords.map((kw) => (
                <option key={kw} value={kw}>
                  {kw}
                </option>
              ))}
            </select>

            <select
              value={filters.sortBy || 'score_general'}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
              style={{
                background: '#333',
                color: '#eee',
                border: '1px solid #555',
                padding: '6px',
                borderRadius: 4,
                width: '100%',
                cursor: 'pointer'
              }}
            >
              <option value="score_general">General Score</option>
              <option value="created_at">Date Added</option>
              <option value="id">ID</option>
              <option value="score_technical">Technical Score</option>
              <option value="score_aesthetic">Aesthetic Score</option>
              <option value="score_spaq">SPAQ</option>
              <option value="score_ava">AVA</option>
              <option value="score_liqe">LIQE</option>
            </select>

            <select
              value={filters.order || 'DESC'}
              onChange={(e) => setFilters({ ...filters, order: e.target.value as 'ASC' | 'DESC' })}
              style={{
                background: '#333',
                color: '#eee',
                border: '1px solid #555',
                padding: '6px',
                borderRadius: 4,
                width: '100%',
                cursor: 'pointer'
              }}
            >
              <option value="DESC">Highest First</option>
              <option value="ASC">Lowest First</option>
            </select>
          </div>

          <FilterPanel filters={filters} onChange={setFilters} />

          <div style={{ flex: 1, overflow: 'hidden', borderTop: '1px solid #333', paddingTop: 10 }}>
            {foldersLoading ? <div>Loading folders...</div> : (
              <FolderTree folders={folders} onSelect={handleSelectFolder} selectedId={selectedFolderId} />
            )}
          </div>
        </div>
      }
      content={
        <div style={{ height: '100%', overflow: 'hidden' }}>
          <GalleryGrid
            images={currentImages}
            onSelect={handleImageClick}
            onEndReached={activeStackId ? undefined : loadMore}
            onNavigateToParent={handleNavigateToParent}
            viewerOpen={!!openingImage}
            subfolders={folders.flatMap(f => {
              const find = (nodes: Folder[]): Folder | undefined => {
                for (const node of nodes) {
                  if (node.id === selectedFolderId) return node;
                  if (node.children) {
                    const found = find(node.children);
                    if (found) return found;
                  }
                }
              };
              return find([f])?.children || [];
            })}
            onSelectFolder={handleSelectFolder}
            sortBy={filters.sortBy}
            stacksMode={stacksMode}
            stacks={stacks}
            onSelectStack={handleSelectStack}
            onStackEndReached={loadMoreStacks}
            activeStackId={activeStackId}
          />
          {openingImage && (
            <ImageViewer
              image={openingImage}
              onClose={closeViewer}
              allImages={currentImages}
              currentIndex={currentImageIndex}
              onNavigate={handleNavigateImage}
            />
          )}
        </div>
      }
    />
  );
}

export default App;
