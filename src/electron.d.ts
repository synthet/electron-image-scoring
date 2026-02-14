export { };

declare global {
    interface Window {
        electron: {
            ping: () => Promise<string>;
            getImageCount: (options?: { limit?: number; offset?: number; folderId?: number; minRating?: number; colorLabel?: string; keyword?: string; sortBy?: string; order?: 'ASC' | 'DESC' }) => Promise<number | { error: string }>;
            getImages: (options?: { limit?: number; offset?: number; folderId?: number; minRating?: number; colorLabel?: string; keyword?: string; sortBy?: string; order?: 'ASC' | 'DESC' }) => Promise<any[]>;
            getImageDetails: (id: number) => Promise<any>;
            updateImageDetails: (id: number, updates: any) => Promise<boolean>;
            deleteImage: (id: number) => Promise<boolean>;
            getFolders: () => Promise<any[]>;
            getKeywords: () => Promise<string[]>;
            getStacks: (options?: { limit?: number; offset?: number; folderId?: number; minRating?: number; colorLabel?: string; keyword?: string; sortBy?: string; order?: 'ASC' | 'DESC' }) => Promise<any[]>;
            getImagesByStack: (stackId: number | null, options?: { limit?: number; offset?: number; folderId?: number; minRating?: number; colorLabel?: string; keyword?: string; sortBy?: string; order?: 'ASC' | 'DESC' }) => Promise<any[]>;
            getStackCount: (options?: { folderId?: number; minRating?: number; colorLabel?: string; keyword?: string }) => Promise<number | { error: string }>;
            rebuildStackCache: () => Promise<{ success: boolean; count?: number; error?: string }>;
            log: (level: string, message: string, data?: any) => Promise<boolean>;
            extractNefPreview: (filePath: string) => Promise<{
                success: boolean;
                buffer?: number[];
                fallback?: boolean;
                error?: string;
            }>;
        };
    };
}
