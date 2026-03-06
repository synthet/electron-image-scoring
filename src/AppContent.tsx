import { useState, useMemo, useEffect, useCallback } from 'react';
import { MainLayout } from './components/Layout/MainLayout';
import { useImages, useKeywords, useStacks } from './hooks/useDatabase';
import { useFolders } from './hooks/useFolders';
import { FolderTree } from './components/Tree/FolderTree';
import type { Folder } from './components/Tree/treeUtils';
import { GalleryGrid } from './components/Gallery/GalleryGrid';
import { FilterPanel } from './components/Sidebar/FilterPanel';
import type { FilterState } from './components/Sidebar/FilterPanel';
import { ImageViewer } from './components/Viewer/ImageViewer';
import { useNotificationStore } from './store/useNotificationStore';
import { NotificationTray } from './components/Layout/NotificationTray';
import { SettingsModal } from './components/Settings/SettingsModal';
import { DuplicateFinder } from './components/Duplicates/DuplicateFinder';

interface ImageRow {
  id: number;
  file_path: string;
  file_name: string;
  score_general: number;
  score_technical?: number;
  score_aesthetic?: number;
  score_spaq?: number;
  score_ava?: number;
  score_liqe?: number;
  rating: number;
  label: string | null;
  created_at?: string;
  thumbnail_path?: string;
  stack_id?: number | null;
  stack_key?: number;
  image_count?: number;
  sort_value?: number;
}

interface AppContentProps {
  isConnected: boolean;
}

function AppContent({ isConnected }: AppContentProps) {
  const addNotification = useNotificationStore(state => state.addNotification);

  const { folders, loading: foldersLoading, refresh: refreshFolders } = useFolders();
  const { keywords, loading: keywordsLoading } = useKeywords();

  const [selectedFolderId, setSelectedFolderId] = useState<number | undefined>(undefined);
  const [filters, setFilters] = useState<FilterState>({ minRating: 0, sortBy: 'score_general', order: 'DESC' });
  const [openingImage, setOpeningImage] = useState<ImageRow | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [currentView, setCurrentView] = useState<'gallery' | 'duplicates'>('gallery');

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  useEffect(() => {
    // Register settings menu listener
    let cleanupSettings: (() => void) | undefined;
    if (window.electron?.onOpenSettings) {
      cleanupSettings = window.electron.onOpenSettings(() => {
        setIsSettingsOpen(true);
      });
    }

    let cleanupDuplicates: (() => void) | undefined;
    if (window.electron?.onOpenDuplicates) {
      cleanupDuplicates = window.electron.onOpenDuplicates(() => {
        setCurrentView('duplicates');
      });
    }

    return () => {
      if (cleanupSettings) cleanupSettings();
      if (cleanupDuplicates) cleanupDuplicates();
    };
  }, []);

  // Stacks mode state
  const [stacksMode, setStacksMode] = useState(false);
  const [activeStackId, setActiveStackId] = useState<number | null>(null);
  const [activeStackInfo, setActiveStackInfo] = useState<{ stackId: number; imageCount: number } | null>(null);
  const [cacheBuilt, setCacheBuilt] = useState(false);

  const { images, loadMore, totalCount, removeImage } = useImages(50, selectedFolderId, filters);
  const { stacks, loadMore: loadMoreStacks, totalCount: stacksTotalCount, refresh: refreshStacks } = useStacks(50, selectedFolderId, filters);

  const [stackImages, setStackImages] = useState<ImageRow[]>([]);
  const [stackImagesLoading, setStackImagesLoading] = useState(false);

  // Rebuild stack cache when stacks mode is first enabled
  useEffect(() => {
    if (stacksMode && !cacheBuilt && window.electron) {
      window.electron.rebuildStackCache().then((result) => {
        console.log('[App] Stack cache rebuild result:', result);
        setCacheBuilt(true);
        refreshStacks();
      }).catch(err => {
        console.error('[App] Failed to rebuild stack cache:', err);
      });
    }
  }, [stacksMode, cacheBuilt, refreshStacks]);

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

  // Subscribe to real-time updates from Python API
  useEffect(() => {
    let ws: { connect: () => void; disconnect: () => void; on: (type: string, handler: (data: unknown) => void) => void } | null = null;

    import('./services/WebSocketService').then(({ webSocketService }) => {
      ws = webSocketService;
      ws.connect();

      ws.on('stack_created', (data: unknown) => {
        const d = data as { summary?: string };
        console.log('[App] Received stack_created event:', d);
        addNotification(`New stack created: ${d.summary || 'Summary not available'}`, 'success');
        if (window.electron) {
          window.electron.rebuildStackCache().then(() => {
            console.log('[App] Stack cache rebuilt due to external event.');
          });
        }
      });

      ws.on('folder_discovered', (data: unknown) => {
        const d = data as { path: string };
        console.log('[App] Folder discovered:', d.path);
        addNotification(`Discovered folder: ${d.path.split(/[\\/]/).pop()}`, 'info');
      });

      ws.on('image_discovered', () => {
        // Silent for individual images to avoid spam, but could use for status bar
      });

      ws.on('image_scored', (data: unknown) => {
        const d = data as { file_path: string };
        console.log('[App] Image scored:', d.file_path);
      });

      ws.on('job_started', (data: unknown) => {
        const d = data as { job_type: string; job_id: string };
        console.log('[App] Job started:', d);
        const typeLabel = d.job_type === 'scoring' ? 'Scoring' :
          d.job_type === 'tagging' ? 'Tagging' :
            d.job_type === 'clustering' ? 'Clustering' : 'Process';
        addNotification(`${typeLabel} job started (ID: ${d.job_id})`, 'info');
      });

      ws.on('job_completed', (data: unknown) => {
        const d = data as { status: string; job_id: string };
        console.log('[App] Job completed:', d);
        const status = d.status === 'completed' ? 'finished successfully' : 'failed';
        const type = d.status === 'completed' ? 'success' : 'error';
        addNotification(`Job ${d.job_id} ${status}`, type);

        // Refresh stacks if it was a clustering/selection job
        if (d.status === 'completed' && window.electron) {
          window.electron.rebuildStackCache().then(() => {
            console.log('[App] Stack cache rebuilt after job completion.');
          });
        }
      });

    });

    return () => {
      if (ws) ws.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


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

  const handleImageClick = (image: ImageRow) => {
    const imgList = (stacksMode && !activeStackId) ? stacks : (activeStackId ? stackImages : images);
    const index = imgList.findIndex(img => img.id === image.id);
    setCurrentImageIndex(index >= 0 ? index : 0);
    setOpeningImage(image);
  };

  const handleNavigateImage = (newIndex: number) => {
    const imgList = (stacksMode && !activeStackId) ? stacks : (activeStackId ? stackImages : images);
    if (newIndex >= 0 && newIndex < imgList.length) {
      setCurrentImageIndex(newIndex);
      setOpeningImage(imgList[newIndex]);
    }
  };

  const handleImageDelete = (id: number) => {
    if (activeStackId) {
      setStackImages(prev => prev.filter(img => img.id !== id));
      if (activeStackInfo) {
        setActiveStackInfo(prev => prev ? ({ ...prev, imageCount: Math.max(0, prev.imageCount - 1) }) : null);
      }
    } else {
      removeImage(id);
    }
    setOpeningImage(null);
  };

  const handleSelectStack = (stack: ImageRow & { stack_id?: number | null; image_count?: number }) => {
    if (stack.stack_id !== null && stack.stack_id !== undefined) {
      setActiveStackId(stack.stack_id);
      setActiveStackInfo({ stackId: stack.stack_id, imageCount: stack.image_count || 0 });
      loadStackImages(stack.stack_id);
    } else {
      handleImageClick(stack);
    }
  };

  const handleNavigateToParent = () => {
    if (activeStackId) {
      setActiveStackId(null);
      setActiveStackInfo(null);
      setStackImages([]);
      return;
    }

    if (!selectedFolderId) return;

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
  const currentImages = (stacksMode && !activeStackId) ? stacks : (activeStackId ? stackImages : images);
  const currentTotal = stacksMode && !activeStackId ? stacksTotalCount : (activeStackId ? (activeStackInfo?.imageCount || stackImages.length) : totalCount);

  // Header title
  const headerTitle = (() => {
    if (activeStackId) {
      return `Stack #${activeStackId}`;
    }
    return currentFolder ? (currentFolder.title || 'Folder') : 'Image Gallery';
  })();

  return (
    <>
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
                &larr; Back to Stacks
              </button>
            )}

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '15px' }}>
            </div>
          </div>
        }
        sidebar={
          <div style={{ padding: 10, display: 'flex', flexDirection: 'column', height: '100%' }}>

            {currentView === 'duplicates' && (
              <div style={{ marginBottom: 15 }}>
                <button
                  onClick={() => setCurrentView('gallery')}
                  style={{
                    width: '100%', padding: '10px',
                    backgroundColor: '#4caf50',
                    color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer',
                    fontWeight: 'bold', borderLeft: '4px solid #fff'
                  }}
                >
                  Back to Gallery
                </button>
              </div>
            )}

            <h3 style={{ marginBottom: 10 }}>Folders</h3>
            <div style={{ marginBottom: 10, fontSize: '0.8em', color: '#888' }}>
              <p>DB Status:
                <span style={{
                  color: isConnected ? '#4caf50' : '#f44336',
                  fontWeight: 'bold',
                  marginLeft: 5
                }}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </p>
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
                <FolderTree folders={folders} onSelect={handleSelectFolder} selectedId={selectedFolderId} onRefresh={refreshFolders} />
              )}
            </div>
          </div>
        }
        content={
          <div style={{ height: '100%', overflow: 'hidden', position: 'relative' }}>
            {currentView === 'duplicates' ? (
              <DuplicateFinder currentFolder={currentFolder} />
            ) : (
              <>
                {stackImagesLoading && (
                  <div style={{
                    position: 'absolute', top: 10, right: 10, zIndex: 10,
                    padding: '4px 12px', background: 'rgba(0, 0, 0, 0.7)',
                    color: 'white', borderRadius: 4, fontSize: '0.9em'
                  }}>
                    Loading...
                  </div>
                )}
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
                    onDelete={handleImageDelete}
                  />
                )}
              </>
            )}
          </div>
        }
      />
      <NotificationTray />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}

export default AppContent;
