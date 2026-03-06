import { useState, useEffect, useMemo } from 'react';
import { buildFolderTree } from '../components/Tree/treeUtils';
import type { Folder } from '../components/Tree/treeUtils';

interface FolderRow {
    id: number;
    path: string;
    parent_id: number | null;
    is_fully_scored: number;
    image_count: number;
}

export function useFolders(): { folders: Folder[]; loading: boolean; refresh: () => void } {
    const [flatFolders, setFlatFolders] = useState<FolderRow[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchFolders = () => {
        if (!window.electron) return;
        setLoading(true);
        window.electron.getFolders().then(res => {
            setFlatFolders(res);
            setLoading(false);
        }).catch(err => {
            console.error('[useFolders] Failed to fetch folders:', err);
            setLoading(false);
        });
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchFolders();
    }, []);

    const folderTree = useMemo(() => buildFolderTree(flatFolders), [flatFolders]);

    return { folders: folderTree, loading, refresh: fetchFolders };
}
