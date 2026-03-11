import { Client } from "@gradio/client";

export class GradioClient {
    private client: any = null;
    private port: number = 7860;
    private initialized: boolean = false;
    private initPromise: Promise<void> | null = null;

    constructor() {
        // Defer connecting until needed
    }

    private async init(): Promise<void> {
        if (this.initialized && this.client) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            if (window.electron && window.electron.getApiPort) {
                try {
                    this.port = await window.electron.getApiPort();
                    console.log(`[GradioClient] Discovered API port: ${this.port}`);
                } catch (e) {
                    console.error('[GradioClient] Failed to get API port, using default:', e);
                }
            }
            
            const url = `http://127.0.0.1:${this.port}/`;
            try {
                this.client = await Client.connect(url);
                this.initialized = true;
                console.log(`[GradioClient] Connected to ${url}`);
            } catch (e) {
                console.error(`[GradioClient] Failed to connect to ${url}:`, e);
                throw e;
            }
        })();

        return this.initPromise;
    }

    private async getClient(): Promise<any> {
        await this.init();
        return this.client;
    }

    // --- API Endpoints ---

    /**
     * Updates the static UI components when a new folder is selected.
     */
    public async updateFolderSelection(folderPath: string): Promise<string[]> {
        const c = await this.getClient();
        const result = await c.predict("/_update_folder_selection", { folder_path: folderPath || "" });
        return result.data as string[];
    }

    /**
     * Gets the tree html component.
     */
    public async getTreeHtml(): Promise<string> {
        const c = await this.getClient();
        const result = await c.predict("/get_tree_html", {});
        return result.data?.[0] as string;
    }

    /**
     * Runs scoring on the given path.
     */
    public async runScoring(path: string, force: boolean = false): Promise<any> {
        const c = await this.getClient();
        const result = await c.predict("/_run_scoring", { path: path || "", force });
        return result.data?.[0];
    }

    /**
     * Runs culling on the given path.
     */
    public async runCulling(path: string, force: boolean = false): Promise<any> {
        const c = await this.getClient();
        const result = await c.predict("/_run_culling", { path: path || "", force });
        return result.data?.[0];
    }

    /**
     * Runs tagging on the given path.
     */
    public async runTagging(path: string, overwrite: boolean = false, captions: boolean = false): Promise<any> {
        const c = await this.getClient();
        const result = await c.predict("/_run_tagging", { path: path || "", overwrite, captions });
        return result.data?.[0];
    }

    /**
     * Runs all pending jobs for the given path.
     */
    public async runAllPending(path: string): Promise<any> {
        const c = await this.getClient();
        const result = await c.predict("/_run_all_pending", { path: path || "" });
        return result.data?.[0];
    }

    /**
     * Stops all running jobs.
     */
    public async stopAll(): Promise<any> {
        const c = await this.getClient();
        const result = await c.predict("/_stop_all", {});
        return result.data?.[0];
    }

    /**
     * Monitors the status of the selected folder.
     */
    public async monitorStatusWrapper(selectedFolder: string): Promise<string[]> {
        const c = await this.getClient();
        const result = await c.predict("/monitor_status_wrapper", { selected_folder: selectedFolder || "" });
        return result.data as string[];
    }
}

export const gradioClient = new GradioClient();
