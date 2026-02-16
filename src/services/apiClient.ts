export class ApiClient {
    private ws: WebSocket | null = null;
    private listeners: { [key: string]: ((data: any) => void)[] } = {};
    private reconnectInterval = 5000;
    private port = 7860; // Default port

    constructor() {
        this.init();
    }

    private async init() {
        if (window.electron && window.electron.getApiPort) {
            try {
                this.port = await window.electron.getApiPort();
                console.log(`[ApiClient] Discovered API port: ${this.port}`);
            } catch (e) {
                console.error('[ApiClient] Failed to get API port, using default:', e);
            }
        }
        this.connect();
    }

    private connect() {
        const url = `ws://127.0.0.1:${this.port}/ws/updates`;
        console.log(`[ApiClient] Connecting to ${url}...`);

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log('[ApiClient] Connected to Python API');
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type && this.listeners[message.type]) {
                    this.listeners[message.type].forEach(callback => callback(message.data));
                }
            } catch (e) {
                console.error('[ApiClient] Error parsing message:', e);
            }
        };

        this.ws.onclose = () => {
            console.log('[ApiClient] Disconnected. Reconnecting in 5s...');
            setTimeout(() => this.connect(), this.reconnectInterval);
        };

        this.ws.onerror = (err) => {
            console.error('[ApiClient] WebSocket error:', err);
            // Let onclose handle reconnection
        };
    }

    public on(eventType: string, callback: (data: any) => void) {
        if (!this.listeners[eventType]) {
            this.listeners[eventType] = [];
        }
        this.listeners[eventType].push(callback);
    }

    public off(eventType: string, callback: (data: any) => void) {
        if (this.listeners[eventType]) {
            this.listeners[eventType] = this.listeners[eventType].filter(cb => cb !== callback);
        }
    }
}

export const apiClient = new ApiClient();
