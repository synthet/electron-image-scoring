export class ApiClient {
    private ws: WebSocket | null = null;
    private listeners: { [key: string]: ((data: any) => void)[] } = {};
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 50;
    private minReconnectInterval: number = 1000; // 1 second
    private maxReconnectInterval: number = 30000; // 30 seconds
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
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

    /**
     * Calculate exponential backoff with jitter.
     * Starts at 1s, doubles each attempt up to 30s max.
     */
    private getReconnectDelay(): number {
        const baseDelay = Math.min(
            this.minReconnectInterval * Math.pow(2, this.reconnectAttempts),
            this.maxReconnectInterval
        );
        // Add ±20% jitter to avoid thundering herd
        const jitter = baseDelay * 0.2 * (Math.random() * 2 - 1);
        return Math.max(this.minReconnectInterval, baseDelay + jitter);
    }

    private connect() {
        // Check if we've exceeded max reconnection attempts
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[ApiClient] Max reconnection attempts reached, giving up');
            return;
        }

        const url = `ws://127.0.0.1:${this.port}/ws/updates`;
        console.log(`[ApiClient] Connecting to ${url}... (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log('[ApiClient] Connected to Python API');
            // Reset reconnect counter on successful connection
            this.reconnectAttempts = 0;
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
            console.log('[ApiClient] Disconnected, scheduling reconnect...');
            this.scheduleReconnect();
        };

        this.ws.onerror = (err) => {
            console.error('[ApiClient] WebSocket error:', err);
            // Let onclose handle reconnection
        };
    }

    /**
     * Schedule a reconnection attempt with exponential backoff.
     */
    private scheduleReconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[ApiClient] Max reconnection attempts reached, stopping reconnect');
            return;
        }

        const delay = this.getReconnectDelay();
        console.log(`[ApiClient] Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);

        this.reconnectAttempts++;
        this.reconnectTimeout = setTimeout(() => {
            this.connect();
        }, delay);
    }

    public disconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        console.log('[ApiClient] Disconnected');
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
