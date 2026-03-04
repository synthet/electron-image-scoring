import { useState, useEffect, useCallback, useRef } from 'react';

// Maximum number of items to keep in memory
const MAX_LOADED_ITEMS = 2000;

export function useDatabase() {
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    const MAX_AUTO_RETRIES = 3;
    const BASE_DELAY_MS = 2000;

    const connect = useCallback(async () => {
        if (!window.electron) {
            setError("Not running in Electron");
            return;
        }
        setError(null);

        const CONNECT_TIMEOUT_MS = 20000;

        try {
            await Promise.race([
                (async () => {
                    const res = await window.electron.ping();
                    if (res !== 'pong') {
                        throw new Error('Main process not responding');
                    }

                    const dbConnected = await window.electron.checkDbConnection();
                    if (!dbConnected) {
                        throw new Error("Database connection returned false");
                    }
                })(),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error(
                        `Connection timeout after ${CONNECT_TIMEOUT_MS / 1000}s — is Firebird running?`
                    )), CONNECT_TIMEOUT_MS)
                )
            ]);

            setIsConnected(true);
            setError(null);
            setRetryCount(0);
        } catch (e: any) {
            setIsConnected(false);
            const msg = e.message || 'Unknown connection error';
            console.error(`[useDatabase] Connection attempt failed:`, msg);
            setError(msg);
        }
    }, []);

    // Initial connection + auto-retry with backoff
    useEffect(() => {
        connect();
    }, [connect]);

    useEffect(() => {
        if (error && retryCount < MAX_AUTO_RETRIES) {
            const delay = BASE_DELAY_MS * Math.pow(2, retryCount);
            console.log(`[useDatabase] Auto-retry ${retryCount + 1}/${MAX_AUTO_RETRIES} in ${delay}ms...`);
            const timer = setTimeout(() => {
                setRetryCount(prev => prev + 1);
                connect();
            }, delay);
            return () => clearTimeout(timer);
        }
    }, [error, retryCount, connect]);

    // Manual retry (resets counter)
    const retry = useCallback(() => {
        setRetryCount(0);
        setError(null);
        connect();
    }, [connect]);

    const checkConnection = async () => {
        if (!window.electron) return false;
        return await window.electron.checkDbConnection();
    };

    return { isConnected, error, checkConnection, retry };
}

export function useImageCount() {
    const [count, setCount] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!window.electron) return;
        window.electron.getImageCount().then(res => {
            if (typeof res === 'number') setCount(res);
            setLoading(false);
        });
    }, []);

    return { count, loading };
}

export function useKeywords() {
    const [keywords, setKeywords] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!window.electron) return;
        window.electron.getKeywords().then(res => {
            if (Array.isArray(res)) setKeywords(res);
            setLoading(false);
        });
    }, []);

    return { keywords, loading };
}

/**
 * Generic hook for paginated data fetching with memory management.
 */
function usePaginatedData<T>(
    pageSize: number,
    folderId: number | undefined,
    filters: Record<string, any> | undefined,
    fetchFunc: (options: any) => Promise<T[]>,
    countFunc: (options: any) => Promise<number>,
    getUniqueKey: (item: T) => string | number
) {
    const [items, setItems] = useState<T[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [offset, setOffset] = useState(0);
    const [totalCount, setTotalCount] = useState(0);

    // Use refs to avoid stale closures
    const offsetRef = useRef(0);
    const filtersRef = useRef<Record<string, any> | undefined>(filters);
    const folderIdRef = useRef(folderId);

    // Update refs when deps change
    useEffect(() => {
        offsetRef.current = offset;
    }, [offset]);

    useEffect(() => {
        filtersRef.current = filters;
    }, [filters]);

    useEffect(() => {
        folderIdRef.current = folderId;
    }, [folderId]);

    // Reset when folder or filters change (shallow comparison)
    useEffect(() => {
        setItems([]);
        setOffset(0);
        setHasMore(true);

        if (window.electron) {
            const options = { folderId, ...filters };
            countFunc(options).then((c: number) => {
                setTotalCount(c);
            }).catch(err => {
                console.error('Failed to fetch count:', err);
            });
        }
    }, [folderId, JSON.stringify(filters)]);

    // Load more with memory cap
    const loadMore = useCallback(async () => {
        if (!window.electron || loading || !hasMore) return;

        setLoading(true);
        try {
            const options = { limit: pageSize, offset: offsetRef.current, folderId: folderIdRef.current, ...filtersRef.current };
            const newItems = await fetchFunc(options);

            if (newItems.length < pageSize) {
                setHasMore(false);
            }

            setItems(prev => {
                // Deduplicate by unique key
                const existingKeys = new Set(prev.map(item => getUniqueKey(item)));
                const filtered = newItems.filter(item => !existingKeys.has(getUniqueKey(item)));
                const merged = [...prev, ...filtered];

                // Trim if exceeds max loaded items
                if (merged.length > MAX_LOADED_ITEMS) {
                    const trimmed = merged.slice(merged.length - MAX_LOADED_ITEMS);
                    return trimmed;
                }

                return merged;
            });

            setOffset(prev => prev + pageSize);
        } catch (err) {
            console.error("Failed to load data:", err);
        } finally {
            setLoading(false);
        }
    }, [pageSize, loading, hasMore, fetchFunc]);

    // Initial load when offset becomes 0
    useEffect(() => {
        if (offset === 0 && hasMore && !loading) {
            loadMore();
        }
    }, [offset, hasMore, loading, loadMore]);

    const refresh = useCallback(() => {
        setOffset(0);
        setItems([]);
        setHasMore(true);
        setLoading(false);
        setTimeout(() => loadMore(), 0);
    }, [loadMore]);

    const removeItem = useCallback((key: string | number) => {
        setItems(prev => prev.filter(item => getUniqueKey(item) !== key));
        setTotalCount(prev => Math.max(0, prev - 1));
    }, [getUniqueKey]);

    return { items, loading, hasMore, loadMore, totalCount, refresh, removeItem };
}

export function useImages(pageSize: number = 50, folderId?: number, filters?: Record<string, any>) {
    const result = usePaginatedData(
        pageSize,
        folderId,
        filters,
        (opts) => window.electron!.getImages(opts),
        (opts) => window.electron!.getImageCount(opts),
        (img: any) => img.id
    );

    // Remove image from state (e.g. after delete)
    const removeImage = useCallback((id: number) => {
        result.removeItem(id);
    }, [result.removeItem]);

    return {
        images: result.items,
        loading: result.loading,
        hasMore: result.hasMore,
        loadMore: result.loadMore,
        totalCount: result.totalCount,
        removeImage
    };
}

export function useStacks(pageSize: number = 50, folderId?: number, filters?: Record<string, any>) {
    const result = usePaginatedData(
        pageSize,
        folderId,
        filters,
        (opts) => window.electron!.getStacks(opts),
        (opts) => window.electron!.getStackCount(opts),
        (stack: any) => stack.stack_key || stack.id
    );

    return {
        stacks: result.items,
        loading: result.loading,
        hasMore: result.hasMore,
        loadMore: result.loadMore,
        totalCount: result.totalCount,
        refresh: result.refresh
    };
}
