export { };

interface ImageQueryOptions {
    limit?: number;
    offset?: number;
    folderId?: number;
    folderIds?: number[];
    minRating?: number;
    colorLabel?: string;
    keyword?: string;
    sortBy?: string;
    order?: 'ASC' | 'DESC';
}

interface ImageRow {
    id: number;
    file_path: string;
    file_name: string;
    score_general: number;
    score_technical: number;
    score_aesthetic: number;
    score_spaq: number;
    score_ava: number;
    score_liqe: number;
    rating: number;
    label: string | null;
    created_at?: string;
    thumbnail_path?: string;
}

interface ImageDetail extends ImageRow {
    job_id?: string;
    file_type?: string;
    score?: number;
    score_koniq?: number;
    score_paq2piq?: number;
    title?: string;
    description?: string;
    keywords?: string;
    metadata?: string;
    scores_json?: string;
    model_version?: string;
    image_hash?: string;
    folder_id?: number;
    stack_id?: number;
    burst_uuid?: string;
    win_path?: string;
    file_exists?: boolean;
    image_uuid?: string;
}

interface ImageUpdates {
    title?: string;
    description?: string;
    rating?: number;
    label?: string;
    keywords?: string;
}

interface FolderRow {
    id: number;
    path: string;
    parent_id: number | null;
    is_fully_scored: number;
    image_count: number;
}

interface DuplicatePair {
    image_id_a: number;
    image_id_b: number;
    similarity: number;
    file_path_a: string;
    file_path_b: string;
}

interface DuplicateResponse {
    success: boolean;
    data?: {
        duplicates: DuplicatePair[];
    };
    message?: string;
}

interface AppConfig {
    database?: {
        host?: string;
        port?: number;
        path?: string;
        user?: string;
        password?: string;
    };
    dev?: {
        url?: string;
    };
    api?: {
        url?: string;
        port?: number;
        host?: string;
    };
    firebird?: {
        path?: string;
    };
    selection?: Record<string, unknown>;
    [key: string]: unknown;
}

declare global {
    interface Window {
        electron: {
            ping: () => Promise<string>;
            checkDbConnection: () => Promise<boolean>;
            getImageCount: (options?: ImageQueryOptions) => Promise<number>;
            getImages: (options?: ImageQueryOptions) => Promise<ImageRow[]>;
            getImageDetails: (id: number) => Promise<ImageDetail | null>;
            updateImageDetails: (id: number, updates: ImageUpdates) => Promise<boolean>;
            deleteImage: (id: number) => Promise<boolean>;
            deleteFolder: (id: number) => Promise<boolean>;
            getFolders: () => Promise<FolderRow[]>;
            getKeywords: () => Promise<string[]>;
            findNearDuplicates: (options?: { threshold?: number; folder_path?: string; limit?: number }) => Promise<DuplicateResponse>;
            searchSimilarImages: (options: { imageId: number; limit?: number; folderPath?: string; minSimilarity?: number }) => Promise<{ query_image_id: number; results: any[]; count: number; error?: string }>;
            getStacks: (options?: ImageQueryOptions) => Promise<ImageRow[]>;
            getImagesByStack: (stackId: number | null, options?: ImageQueryOptions) => Promise<ImageRow[]>;
            getStackCount: (options?: ImageQueryOptions) => Promise<number>;
            rebuildStackCache: () => Promise<{ success: boolean; count: number }>;
            log: (level: string, message: string, data?: unknown) => Promise<boolean>;
            extractNefPreview: (filePath: string) => Promise<{
                success: boolean;
                buffer?: Uint8Array;
                fallback?: boolean;
                error?: string;
            }>;
            getApiPort: () => Promise<number>;
            getApiConfig: () => Promise<{ url: string }>;
            getConfig: () => Promise<AppConfig>;
            saveConfig: (updates: Partial<AppConfig>) => Promise<AppConfig>;
            setCurrentExportImageContext: (context: { imageBytes: number[]; mimeType: string; fileName: string } | null) => Promise<boolean>;
            readExif: (filePath: string) => Promise<any>;
            onOpenSettings: (callback: () => void) => () => void;
            onOpenDuplicates: (callback: () => void) => () => void;
            onImportFolderSelected: (callback: (folderPath: string) => void) => () => void;
            importRun: (folderPath: string) => Promise<{ added: number; skipped: number; errors: string[] }>;
            onImportProgress: (callback: (data: { current: number; total: number; path?: string }) => void) => () => void;
        };
    };
}
