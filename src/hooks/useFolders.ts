import { useState, useEffect, useMemo } from 'react';
import { buildFolderTree } from '../components/Tree/treeUtils';

export function useFolders() {
    const [flatFolders, setFlatFolders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchFolders = () => {
        if (!window.electron) return;
        setLoading(true);
        window.electron.getFolders().then(res => {
            setFlatFolders(res);
            setLoading(false);
        });
    };

    useEffect(() => {
        fetchFolders();
    }, []);

    const folderTree = useMemo(() => buildFolderTree(flatFolders), [flatFolders]);

    return { folders: folderTree, loading, refresh: fetchFolders };
}
