import { WebSocketMessage } from '../../shared/types/index.js';

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;
  private messageHandlers: Map<string, Function[]> = new Map();

  connect(url: string = 'ws://localhost:8080'): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log('WebSocket连接成功');
          this.reconnectAttempts = 0;
          this.emit('connected', {});
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('WebSocket消息解析错误:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket连接关闭:', event.code, event.reason);
          this.emit('disconnected', { code: event.code, reason: event.reason });
          this.handleReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket错误:', error);
          this.emit('error', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`尝试重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectInterval);
    } else {
      console.error('达到最大重连次数，停止重连');
      this.emit('reconnectFailed', {});
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    console.log('收到WebSocket消息:', message.type, message.data);
    this.emit(message.type, message.data);
  }

  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket未连接');
    }
  }

  subscribe(videoId: string): void {
    this.send({
      type: 'subscribe',
      data: { videoId },
      timestamp: Date.now(),
    });
  }

  unsubscribe(videoId: string): void {
    this.send({
      type: 'unsubscribe',
      data: { videoId },
      timestamp: Date.now(),
    });
  }

  ping(): void {
    this.send({
      type: 'ping',
      data: {},
      timestamp: Date.now(),
    });
  }

  on(event: string, handler: Function): void {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, []);
    }
    this.messageHandlers.get(event)!.push(handler);
  }

  off(event: string, handler?: Function): void {
    if (!this.messageHandlers.has(event)) return;

    if (handler) {
      const handlers = this.messageHandlers.get(event)!;
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    } else {
      this.messageHandlers.delete(event);
    }
  }

  private emit(event: string, data: any): void {
    if (this.messageHandlers.has(event)) {
      this.messageHandlers.get(event)!.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`WebSocket事件处理错误 (${event}):`, error);
        }
      });
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageHandlers.clear();
  }

  get isConnected(): boolean {
    return this.ws ? this.ws.readyState === WebSocket.OPEN : false;
  }
}

export const websocketService = new WebSocketService();