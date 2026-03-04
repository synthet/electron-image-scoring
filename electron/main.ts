import { app, BrowserWindow, ipcMain, protocol, net, Menu, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import isDev from 'electron-is-dev';
import * as db from './db';
import { nefExtractor } from './nefExtractor';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// if (require('electron-squirrel-startup')) {
//     app.quit();
// }

let mainWindow: BrowserWindow | null = null;
let currentExportImageContext: { imageBytes: number[]; mimeType: string; fileName: string } | null = null;

function getDialogWindow(): BrowserWindow | null {
    const focused = BrowserWindow.getFocusedWindow();
    if (focused && !focused.isDestroyed()) return focused;
    return (mainWindow && !mainWindow.isDestroyed()) ? mainWindow : null;
}

function showMessageBox(options: Electron.MessageBoxOptions) {
    const win = getDialogWindow();
    return win ? dialog.showMessageBox(win, options) : dialog.showMessageBox(options);
}

function showSaveDialog(options: Electron.SaveDialogOptions) {
    const win = getDialogWindow();
    return win ? dialog.showSaveDialog(win, options) : dialog.showSaveDialog(options);
}

/**
 * Wraps an IPC handler to provide consistent error handling.
 * Returns { ok: true, data: T } on success, { ok: false, error: string } on error.
 */
function wrapIpcHandler<T>(
    handler: (...args: any[]) => Promise<T> | T
): (...args: any[]) => Promise<{ ok: boolean; data?: T; error?: string }> {
    return async (...args: any[]) => {
        try {
            const data = await handler(...args);
            return { ok: true, data };
        } catch (error: any) {
            const errorMessage = error?.message || String(error) || 'Unknown error';
            console.error('[IPC] Handler error:', errorMessage, error);
            return { ok: false, error: errorMessage };
        }
    };
}

const exportCurrentImage = async () => {
    if (!currentExportImageContext?.imageBytes?.length) {
        await showMessageBox({
            type: 'info',
            title: 'Export',
            message: 'No image preview is currently available to export.',
        });
        return;
    }

    const defaultName = currentExportImageContext.fileName || 'export.jpg';
    const saveResult = await showSaveDialog({
        title: 'Export',
        defaultPath: defaultName,
    });

    if (saveResult.canceled || !saveResult.filePath) {
        return;
    }

    await fs.promises.writeFile(saveResult.filePath, Buffer.from(currentExportImageContext.imageBytes));
    await showMessageBox({
        type: 'info',
        title: 'Export',
        message: `Image exported to:\n${saveResult.filePath}`,
    });
};

const rebuildApplicationMenu = () => {
    const menu = Menu.buildFromTemplate([
        {
            label: 'File',
            submenu: [
                {
                    label: 'Export',
                    enabled: !!currentExportImageContext?.imageBytes?.length,
                    click: async () => {
                        try {
                            await exportCurrentImage();
                        } catch (e: any) {
                            console.error('[Main] Export image error:', e);
                            await showMessageBox({
                                type: 'error',
                                title: 'Export Failed',
                                message: e?.message || 'Failed to export image.',
                            });
                        }
                    }
                },
                { type: 'separator' },
                { role: 'quit' }
            ]
        },
        { role: 'editMenu' },
        { role: 'viewMenu' },
        { role: 'windowMenu' },
    ]);

    Menu.setApplicationMenu(menu);
};

// Register secure media protocol
protocol.registerSchemesAsPrivileged([
    { scheme: 'media', privileges: { secure: true, supportFetchAPI: true, standard: true, bypassCSP: true } }
]);

// Load configuration
function loadConfig() {
    const configPath = path.resolve(path.join(__dirname, '../config.json'));
    try {
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
    } catch (e) {
        console.error('Failed to load config.json:', e);
    }
    return {};
}

const config = loadConfig();
const devRemoteDebuggingPort = process.env.ELECTRON_REMOTE_DEBUGGING_PORT || '9222';

if (isDev) {
    app.commandLine.appendSwitch('remote-debugging-port', devRemoteDebuggingPort);
}

function createWindow() {
    console.log('[Main] Creating window...');
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: true
        },
        icon: path.join(__dirname, '../public/icon.png')
    });

    if (isDev) {
        const devUrl = config.dev?.url || 'http://localhost:5173';
        console.log('[Main] Loading dev URL:', devUrl);
        mainWindow.loadURL(devUrl);
    } else {
        console.log('[Main] Loading production file');
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.on('closed', () => {
        console.log('[Main] Window closed');
        mainWindow = null;
    });

    mainWindow.webContents.on('did-finish-load', () => {
        console.log('[Main] Window finished loading');
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('[Main] Window failed to load:', errorCode, errorDescription);
    });
}

app.whenReady().then(async () => {
    console.log('[Main] App ready, setting up protocol...');

    // Ensure DB is running
    await db.ensureFirebirdRunning();

    // Handle media:// requests with path sanitization
    protocol.handle('media', (request) => {
        console.log('[Main] Media request:', request.url);
        let url = request.url.replace('media://', '');
        let filePath = decodeURIComponent(url);

        // Convert WSL paths to Windows paths
        if (filePath.match(/^\/?mnt\/[a-zA-Z]\//)) {
            filePath = filePath.replace(/^\/?mnt\/([a-zA-Z])\//, '$1:/');
        }

        // Sanitize path: resolve and normalize to prevent traversal attacks
        try {
            const resolvedPath = path.resolve(filePath);
            const normalizedPath = path.normalize(resolvedPath);

            // Ensure the path doesn't contain .. or resolve outside expected boundaries
            if (normalizedPath.includes('..') || !normalizedPath.includes(':')) {
                console.error('[Main] Blocked suspicious path:', filePath);
                return new Response('Access denied', { status: 403 });
            }

            return net.fetch('file:///' + normalizedPath);
        } catch (e) {
            console.error('[Main] Invalid media path:', filePath, e);
            return new Response('Invalid path', { status: 400 });
        }
    });

    // Register ALL IPC handlers BEFORE creating the window.
    // The renderer calls ping/checkDbConnection immediately on load —
    // if handlers aren't registered yet, ipcRenderer.invoke() never resolves.
    ipcMain.handle('ping', () => 'pong');

    ipcMain.handle('db:check-connection', wrapIpcHandler(async () => {
        return await db.checkConnection();
    }));

    ipcMain.handle('db:get-image-count', wrapIpcHandler(async (_, options) => {
        return await db.getImageCount(options);
    }));

    ipcMain.handle('db:get-images', wrapIpcHandler(async (_, options) => {
        return await db.getImages(options);
    }));

    ipcMain.handle('db:get-image-details', wrapIpcHandler(async (_, id) => {
        console.log(`[Main] Getting image details for ID: ${id}`);
        const result = await db.getImageDetails(id);
        console.log(`[Main] Image details result:`, result ? 'Data received' : 'NULL returned');
        if (result) {
            console.log(`[Main] Image details keys:`, Object.keys(result));
        }
        return result;
    }));

    ipcMain.handle('db:update-image-details', wrapIpcHandler(async (_, { id, updates }) => {
        console.log(`[Main] Updating image details for ID: ${id}`, updates);
        return await db.updateImageDetails(id, updates);
    }));

    ipcMain.handle('db:delete-image', wrapIpcHandler(async (_, id) => {
        console.log(`[Main] Deleting image ID: ${id}`);
        return await db.deleteImage(id);
    }));

    ipcMain.handle('db:get-keywords', wrapIpcHandler(async () => {
        return await db.getKeywords();
    }));

    ipcMain.handle('db:get-stacks', wrapIpcHandler(async (_, options) => {
        return await db.getStacks(options);
    }));

    ipcMain.handle('db:get-images-by-stack', wrapIpcHandler(async (_, { stackId, options }) => {
        return await db.getImagesByStack(stackId, options);
    }));

    ipcMain.handle('db:get-stack-count', wrapIpcHandler(async (_, options) => {
        return await db.getStackCount(options);
    }));

    ipcMain.handle('db:rebuild-stack-cache', wrapIpcHandler(async () => {
        const count = await db.rebuildStackCache();
        return { success: true, count };
    }));

    ipcMain.handle('db:get-folders', wrapIpcHandler(async () => {
        const rawFolders = await db.getFolders();


        const convertPathToLocal = (p: string) => {
            const isWindows = process.platform === 'win32';
            if (isWindows) {
                const pStr = p.replace(/\\/g, '/');
                if (pStr.startsWith('/mnt/')) {
                    const parts = pStr.split('/');
                    if (parts.length > 2 && parts[2].length === 1) {
                        const drive = parts[2].toUpperCase();
                        const rest = parts.slice(3).join('/');
                        return `${drive}:/${rest}`;
                    }
                }
            }
            return p;
        };

        const processed = rawFolders.map((f: any) => {
            return { ...f, path: convertPathToLocal(f.path) };
        }).filter((f: any) => {
            if (process.platform === 'win32') {
                const isDrivePath = /^[a-zA-Z]:/.test(f.path);
                if (!isDrivePath) return false;
                if (f.path.startsWith('/mnt') || f.path === '/' || f.path === '.') return false;
                return true;
            }
            return true;
        });

        return processed;
    }));

    ipcMain.handle('db:delete-folder', wrapIpcHandler(async (_, id) => {
        console.log(`[Main] Deleting folder ID: ${id}`);
        return await db.deleteFolder(id);
    }));

    ipcMain.handle('nef:extract-preview', async (_, filePath: string) => {
        try {
            console.log(`[Main] NEF preview requested for: ${filePath}`);

            let convertedPath = filePath;
            if (process.platform === 'win32' && filePath.match(/^\/mnt\/[a-zA-Z]\//)) {
                convertedPath = filePath.replace(/^\/mnt\/([a-zA-Z])\//, '$1:/');
                console.log(`[Main] Converted WSL path: ${filePath} -> ${convertedPath}`);
            }

            const ext = path.extname(convertedPath).toLowerCase();
            if (ext !== '.nef') {
                console.log(`[Main] Skipping non-NEF file (${ext}), returning fallback`);
                const fileBuffer = await fs.promises.readFile(convertedPath);
                return {
                    success: false,
                    fallback: true,
                    buffer: fileBuffer
                };
            }

            const buffer = await nefExtractor.extractPreview(convertedPath);

            if (buffer) {
                return {
                    success: true,
                    buffer: buffer
                };
            }

            console.log('[Main] Tier 1 failed, falling back to client-side extraction');
            const fileBuffer = await fs.promises.readFile(convertedPath);
            return {
                success: false,
                fallback: true,
                buffer: fileBuffer
            };
        } catch (e: any) {
            console.error('[Main] NEF extraction error:', e);
            return {
                success: false,
                error: e.message
            };
        }
    });

    ipcMain.handle('export:set-current-image-context', async (_, context: { imageBytes: number[]; mimeType: string; fileName: string } | null) => {
        currentExportImageContext = context;
        rebuildApplicationMenu();
        return true;
    });

    ipcMain.handle('debug:log', async (_, { level, message, data, timestamp }) => {
        const logDir = app.getPath('userData');
        const dateStr = new Date().toISOString().split('T')[0];
        const logFile = path.join(logDir, `session_${dateStr}.log`);

        const logEntry = JSON.stringify({
            timestamp,
            level,
            message,
            data
        }) + os.EOL;

        try {
            await fs.promises.appendFile(logFile, logEntry);
            return true;
        } catch (e) {
            console.error('Failed to write log:', e);
            return false;
        }
    });

    ipcMain.handle('system:get-api-config', async () => {
        const config = loadConfig();
        let port = 7860;
        let host = '127.0.0.1';

        if (config.api) {
            if (config.api.url) return { url: config.api.url };
            if (config.api.port) port = config.api.port;
            if (config.api.host) host = config.api.host;
        }

        try {
            const projectRoot = path.resolve(__dirname, '..');
            const projectsDir = path.resolve(projectRoot, '..');
            const locks = [
                path.join(projectsDir, 'image-scoring', 'webui.lock'),
                path.join(projectsDir, 'image-scoring', 'webui-debug.lock')
            ];

            for (const lockFile of locks) {
                if (fs.existsSync(lockFile)) {
                    const content = await fs.promises.readFile(lockFile, 'utf8');
                    const data = JSON.parse(content);
                    if (data && data.port) {
                        port = data.port;
                        console.log(`[Main] Found active WebUI at port ${port} from ${path.basename(lockFile)}`);
                        break;
                    }
                }
            }
        } catch (e) {
            console.error('[Main] Failed to read API lock file:', e);
        }

        return { url: `http://${host}:${port}` };
    });

    ipcMain.handle('system:get-api-port', async () => {
        try {
            const projectRoot = path.resolve(__dirname, '..');
            const projectsDir = path.resolve(projectRoot, '..');
            const lockFile = path.join(projectsDir, 'image-scoring', 'webui.lock');

            console.log('[Main] Looking for API lock file at:', lockFile);

            if (fs.existsSync(lockFile)) {
                const content = await fs.promises.readFile(lockFile, 'utf8');
                const data = JSON.parse(content);
                console.log('[Main] Found API lock file:', data);
                if (data && data.port) {
                    return data.port;
                }
            }
        } catch (e) {
            console.error('[Main] Failed to read API port:', e);
        }
        return 7860;
    });

    console.log('[Main] All IPC handlers registered. Creating window...');
    createWindow();
    rebuildApplicationMenu();
});





app.on('window-all-closed', async () => {
    // Close persistent database connection
    db.closeConnection();

    // Cleanup exiftool resources
    await nefExtractor.cleanup();

    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
