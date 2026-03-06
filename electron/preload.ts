import { contextBridge, ipcRenderer } from 'electron';
import type { ImageQueryOptions, ImageRow, ImageDetail, ImageUpdates, FolderRow, DuplicateResponse, AppConfig } from './types';

/**
 * Unwraps IPC envelope responses.
 * IPC handlers return { ok: boolean, data?: T, error?: string }
 * This function extracts the data or throws the error.
 */
function unwrapEnvelope<T>(response: { ok: boolean; data?: T; error?: string }): T {
    if (response.ok) {
        return response.data as T;
    }
    throw new Error(response.error || 'Unknown error');
}

contextBridge.exposeInMainWorld('electron', {
    ping: () => ipcRenderer.invoke('ping'),
    checkDbConnection: async () => {
        const response = await ipcRenderer.invoke('db:check-connection');
        return unwrapEnvelope<boolean>(response);
    },
    getImageCount: async (options?: ImageQueryOptions) => {
        const response = await ipcRenderer.invoke('db:get-image-count', options);
        return unwrapEnvelope<number>(response);
    },
    getImages: async (options?: ImageQueryOptions) => {
        const response = await ipcRenderer.invoke('db:get-images', options);
        return unwrapEnvelope<ImageRow[]>(response);
    },
    getImageDetails: async (id: number) => {
        const response = await ipcRenderer.invoke('db:get-image-details', id);
        return unwrapEnvelope<ImageDetail | null>(response);
    },
    updateImageDetails: async (id: number, updates: ImageUpdates) => {
        const response = await ipcRenderer.invoke('db:update-image-details', { id, updates });
        return unwrapEnvelope<boolean>(response);
    },
    deleteImage: async (id: number) => {
        const response = await ipcRenderer.invoke('db:delete-image', id);
        return unwrapEnvelope<boolean>(response);
    },
    deleteFolder: async (id: number) => {
        const response = await ipcRenderer.invoke('db:delete-folder', id);
        return unwrapEnvelope<boolean>(response);
    },
    getFolders: async () => {
        const response = await ipcRenderer.invoke('db:get-folders');
        return unwrapEnvelope<FolderRow[]>(response);
    },
    getKeywords: async () => {
        const response = await ipcRenderer.invoke('db:get-keywords');
        return unwrapEnvelope<string[]>(response);
    },
    findNearDuplicates: async (options?: { threshold?: number; folder_path?: string; limit?: number }) => {
        // Find duplicates doesn't use standard DB envelope
        return await ipcRenderer.invoke('mcp-find-duplicates', options) as DuplicateResponse;
    },
    getStacks: async (options?: ImageQueryOptions) => {
        const response = await ipcRenderer.invoke('db:get-stacks', options);
        return unwrapEnvelope<ImageRow[]>(response);
    },
    getImagesByStack: async (stackId: number | null, options?: ImageQueryOptions) => {
        const response = await ipcRenderer.invoke('db:get-images-by-stack', { stackId, options });
        return unwrapEnvelope<ImageRow[]>(response);
    },
    getStackCount: async (options?: ImageQueryOptions) => {
        const response = await ipcRenderer.invoke('db:get-stack-count', options);
        return unwrapEnvelope<number>(response);
    },
    rebuildStackCache: async () => {
        const response = await ipcRenderer.invoke('db:rebuild-stack-cache');
        return unwrapEnvelope<{ success: boolean; count: number }>(response);
    },
    log: async (level: string, message: string, data?: unknown) => {
        return ipcRenderer.invoke('debug:log', { level, message, data, timestamp: Date.now() });
    },
    extractNefPreview: async (filePath: string) => {
        const response = await ipcRenderer.invoke('nef:extract-preview', filePath);
        // NEF preview doesn't use envelope pattern
        return response;
    },
    getApiPort: async () => {
        return ipcRenderer.invoke('system:get-api-port');
    },
    getApiConfig: async () => {
        return ipcRenderer.invoke('system:get-api-config');
    },
    getConfig: async () => {
        const response = await ipcRenderer.invoke('system:get-config');
        return unwrapEnvelope<AppConfig>(response);
    },
    saveConfig: async (updates: Partial<AppConfig>) => {
        const response = await ipcRenderer.invoke('system:save-config', updates);
        return unwrapEnvelope<AppConfig>(response);
    },
    setCurrentExportImageContext: async (context: { imageBytes: number[]; mimeType: string; fileName: string } | null) => {
        return ipcRenderer.invoke('export:set-current-image-context', context);
    },
    readExif: async (filePath: string) => {
        const response = await ipcRenderer.invoke('nef:read-exif', filePath);
        return unwrapEnvelope<any>(response);
    },
    onOpenSettings: (callback: () => void) => {
        const handler = () => callback();
        ipcRenderer.on('open-settings', handler);
        return () => {
            ipcRenderer.removeListener('open-settings', handler);
        };
    },
    onOpenDuplicates: (callback: () => void) => {
        const handler = () => callback();
        ipcRenderer.on('open-duplicates', handler);
        return () => {
            ipcRenderer.removeListener('open-duplicates', handler);
        };
    },
});
