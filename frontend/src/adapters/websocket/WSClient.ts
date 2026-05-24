const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
const HEARTBEAT_INTERVAL = 30_000;
const HEARTBEAT_TIMEOUT  = 90_000;

export class WSClient {
  private ws: WebSocket | null = null;
  private reconnectDelay = 1_000;
  private readonly maxReconnectDelay = 30_000;
  private heartbeatTimer?: number;
  private pongTimer?: number;
  private handlers = new Map<string, Set<(payload: any) => void>>();

  constructor(private token: string) {}

  connect() {
    this.ws = new WebSocket(`${WS_BASE}/ws/supervisor?token=${this.token}`);
    this.ws.onopen    = () => this.onOpen();
    this.ws.onmessage = (e) => this.onMessage(e);
    this.ws.onclose   = () => this.onClose();
  }

  private onOpen() {
    this.reconnectDelay = 1_000;
    this.startHeartbeat();
    this.emit('connected', {});
  }

  private startHeartbeat() {
    this.heartbeatTimer = window.setInterval(() => {
      this.ws?.send(JSON.stringify({ type: 'PING' }));
      this.pongTimer = window.setTimeout(() => {
        this.ws?.close();
      }, HEARTBEAT_TIMEOUT - HEARTBEAT_INTERVAL);
    }, HEARTBEAT_INTERVAL);
  }

  private onMessage(event: MessageEvent) {
    const msg = JSON.parse(event.data);
    if (msg.type === 'PONG') {
      window.clearTimeout(this.pongTimer);
      return;
    }
    this.emit(msg.type, msg.payload);
  }

  private onClose() {
    window.clearInterval(this.heartbeatTimer);
    this.emit('disconnected', {});
    window.setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      this.connect();
    }, this.reconnectDelay);
  }

  on(event: string, handler: (payload: any) => void) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
  }

  private emit(event: string, payload: any) {
    this.handlers.get(event)?.forEach(h => h(payload));
  }

  disconnect() {
    window.clearInterval(this.heartbeatTimer);
    window.clearTimeout(this.pongTimer);
    this.ws?.close();
  }
}
