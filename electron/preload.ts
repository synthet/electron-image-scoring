import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    ping: () => ipcRenderer.invoke('ping'),
    getImageCount: (options?: any) => ipcRenderer.invoke('db:get-image-count', options),
    getImages: (options?: any) => ipcRenderer.invoke('db:get-images', options),
    getImageDetails: (id: number) => ipcRenderer.invoke('db:get-image-details', id),
    updateImageDetails: (id: number, updates: any) => ipcRenderer.invoke('db:update-image-details', { id, updates }),
    deleteImage: (id: number) => ipcRenderer.invoke('db:delete-image', id),
    getFolders: () => ipcRenderer.invoke('db:get-folders'),
    getKeywords: () => ipcRenderer.invoke('db:get-keywords'),
    getStacks: (options?: any) => ipcRenderer.invoke('db:get-stacks', options),
    getImagesByStack: (stackId: number | null, options?: any) => ipcRenderer.invoke('db:get-images-by-stack', { stackId, options }),
    getStackCount: (options?: any) => ipcRenderer.invoke('db:get-stack-count', options),
    rebuildStackCache: () => ipcRenderer.invoke('db:rebuild-stack-cache'),
    log: (level: string, message: string, data?: any) => ipcRenderer.invoke('debug:log', { level, message, data, timestamp: Date.now() }),
    extractNefPreview: (filePath: string) => ipcRenderer.invoke('nef:extract-preview', filePath),
});
