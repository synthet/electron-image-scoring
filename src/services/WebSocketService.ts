
interface WebSocketMessage {
    type: string;
    data: any;
}

type MessageHandler = (data: any) => void;

class WebSocketService {
    private ws: WebSocket | null = null;
    private url: string = '';
    private reconnectInterval: number = 3000;
    private handlers: Map<string, Set<MessageHandler>> = new Map();
    private isConnected: boolean = false;

    constructor() {
    }

    public async connect() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        try {
            const config = await window.electron.getApiConfig();
            this.url = config.url.replace('http', 'ws') + '/ws/updates'; // Assuming WS endpoint is at /ws/updates

            console.log('[WebSocket] Connecting to:', this.url);
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                console.log('[WebSocket] Connected');
                this.isConnected = true;
            };

            this.ws.onmessage = (event) => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data);
                    this.dispatch(message.type, message.data);
                } catch (e) {
                    console.error('[WebSocket] Failed to parse message:', e);
                }
            };

            this.ws.onclose = () => {
                console.log('[WebSocket] Disconnected');
                this.isConnected = false;
                setTimeout(() => this.connect(), this.reconnectInterval);
            };

            this.ws.onerror = (error) => {
                console.error('[WebSocket] Error:', error);
                this.ws?.close();
            };

        } catch (e) {
            console.error('[WebSocket] Failed to initialize connection:', e);
            setTimeout(() => this.connect(), this.reconnectInterval);
        }
    }

    public on(type: string, handler: MessageHandler) {
        if (!this.handlers.has(type)) {
            this.handlers.set(type, new Set());
        }
        this.handlers.get(type)?.add(handler);
    }

    public off(type: string, handler: MessageHandler) {
        this.handlers.get(type)?.delete(handler);
    }

    private dispatch(type: string, data: any) {
        const handlers = this.handlers.get(type);
        if (handlers) {
            handlers.forEach(handler => handler(data));
        }
    }
}

export const webSocketService = new WebSocketService();
