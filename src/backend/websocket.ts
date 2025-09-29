import { WebSocketServer, WebSocket } from 'ws';
import { WebSocketMessage } from '../shared/types/index';

export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  initialize(server: any): void {
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('新的WebSocket连接建立');
      this.clients.add(ws);

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          this.handleClientMessage(ws, data);
        } catch (error) {
          console.error('WebSocket消息解析错误:', error);
        }
      });

      ws.on('close', () => {
        console.log('WebSocket连接关闭');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket错误:', error);
        this.clients.delete(ws);
      });

      // 发送连接成功的消息
      this.sendToClient(ws, {
        type: 'connected',
        data: { message: '连接成功' },
        timestamp: Date.now(),
      });
    });
  }

  private handleClientMessage(ws: WebSocket, message: any): void {
    switch (message.type) {
      case 'subscribe':
        this.handleSubscribe(ws, message.data);
        break;
      case 'unsubscribe':
        this.handleUnsubscribe(ws, message.data);
        break;
      case 'ping':
        this.sendToClient(ws, {
          type: 'pong',
          data: { timestamp: Date.now() },
          timestamp: Date.now(),
        });
        break;
      default:
        console.log('未知的WebSocket消息类型:', message.type);
    }
  }

  private handleSubscribe(ws: WebSocket, data: any): void {
    const { videoId } = data;
    console.log(`客户端订阅视频任务: ${videoId}`);
    
    this.sendToClient(ws, {
      type: 'subscribed',
      data: { videoId, message: '订阅成功' },
      timestamp: Date.now(),
    });
  }

  private handleUnsubscribe(ws: WebSocket, data: any): void {
    const { videoId } = data;
    console.log(`客户端取消订阅视频任务: ${videoId}`);
    
    this.sendToClient(ws, {
      type: 'unsubscribed',
      data: { videoId, message: '取消订阅成功' },
      timestamp: Date.now(),
    });
  }

  sendToAll(message: WebSocketMessage): void {
    const messageString = JSON.stringify(message);
    
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageString);
      }
    });
  }

  sendToClient(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  broadcastFileUpdate(fileData: any, updateType: 'fileAdded' | 'fileModified' | 'fileDeleted'): void {
    this.sendToAll({
      type: updateType,
      data: fileData,
      timestamp: Date.now(),
    });
  }

  broadcastScriptUpdate(scriptData: any): void {
    this.sendToAll({
      type: 'scriptUpdated',
      data: scriptData,
      timestamp: Date.now(),
    });
  }

  broadcastTaskUpdate(taskData: any): void {
    this.sendToAll({
      type: 'taskUpdated',
      data: taskData,
      timestamp: Date.now(),
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }
}