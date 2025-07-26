import { getBackendUrl } from './backend-config';

export class WebSocketConnection {
  private ws: WebSocket | null = null;
  private clientId: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  
  public onMessage: ((data: any) => void) | null = null;
  public onConnect: (() => void) | null = null;
  public onDisconnect: (() => void) | null = null;
  public onError: ((error: Event) => void) | null = null;
  public onConnecting: (() => void) | null = null;
  public onClose: (() => void) | null = null;

  constructor() {
    this.clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.connect();
  }

  private async connect() {
    try {
      // 使用和HTTP API相同的URL解析逻辑
      const wsUrl = this.getWebSocketUrl();
      
      console.log('🔗 Connecting to WebSocket:', wsUrl);
      console.log('🏷️ Client ID:', this.clientId);
      
      // 通知开始连接
      if (this.onConnecting) {
        this.onConnecting();
      }
      
      this.ws = new WebSocket(wsUrl);
      
      // 添加连接超时处理
      this.connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.warn('⚠️ WebSocket connection timeout, closing connection');
          this.ws.close();
          this.handleConnectionError(new Error('Connection timeout'));
        }
      }, 5000); // 5秒超时
      
      // 添加 readyState 监控
      const checkReadyState = () => {
        console.log('🔍 WebSocket readyState:', this.ws?.readyState, '(0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED)');
      };
      
      checkReadyState();
      setTimeout(checkReadyState, 100);
      setTimeout(checkReadyState, 1000);
      setTimeout(checkReadyState, 3000);
      
      this.ws.onopen = () => {
        // 清除连接超时
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
        
        console.log('✅ WebSocket connected to:', wsUrl);
        this.reconnectAttempts = 0;
        
        // 订阅游戏事件和数据变化通知
        console.log('📡 Subscribing to channels...');
        this.subscribe('game_events');
        this.subscribe('data_changed');
        
        if (this.onConnect) {
          this.onConnect();
        }
      };
      
      this.ws.onmessage = (event) => {
        try {
          console.log('📨 Raw WebSocket message received:', event.data);
          const data = JSON.parse(event.data);
          console.log('📊 Parsed WebSocket data:', data);
          
          if (data.type === 'pong') {
            console.log('💓 Pong received');
            return;
          }
          
          if (this.onMessage) {
            this.onMessage(data);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error, 'Raw data:', event.data);
        }
      };
      
      this.ws.onclose = (event) => {
        // 清除连接超时
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
        
        console.log('🔒 WebSocket disconnected. Code:', event.code, 'Reason:', event.reason);
        this.ws = null;
        
        if (this.onClose) {
          this.onClose();
        }
        
        if (this.onDisconnect) {
          this.onDisconnect();
        }
        
        // 尝试重连
        this.attemptReconnect();
      };
      
      this.ws.onerror = (error) => {
        // 清除连接超时
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
        
        console.error('❌ WebSocket connection error:', error);
        console.error('❌ WebSocket state:', this.ws?.readyState);
        console.error('❌ WebSocket URL was:', wsUrl);
        
        this.handleConnectionError(error);
      };
      
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.attemptReconnect();
    }
  }

  private handleConnectionError(error: any) {
    // 检查是否是连接被拒绝错误
    if (error?.message?.includes('ECONNREFUSED') || 
        (typeof error === 'object' && Object.keys(error).length === 0)) {
      console.error('❌ WebSocket connection refused. Please check if the backend server is running.');
    }
    
    if (this.onError) {
      this.onError(error);
    }
    
    // 尝试重连
    this.attemptReconnect();
  }

  private getWebSocketUrl(): string {
    console.log('🔍 当前页面信息:');
    console.log('  - hostname:', window.location.hostname);
    console.log('  - host:', window.location.host);
    console.log('  - protocol:', window.location.protocol);
    console.log('  - href:', window.location.href);

    // 使用backend-config.ts中的逻辑获取后端URL
    const backendUrl = getBackendUrl();
    console.log('🌐 从backend-config获取的后端URL:', backendUrl);

    // 将HTTP(S)协议转换为WebSocket协议
    const wsProtocol = backendUrl.startsWith('https://') ? 'wss://' : 'ws://';
    const backendUrlWithoutProtocol = backendUrl.replace('http://', '').replace('https://', '');
    const wsUrl = `${wsProtocol}${backendUrlWithoutProtocol}/ws/${this.clientId}`;

    console.log('🔗 最终WebSocket URL:', wsUrl);
    return wsUrl;
  }

  private attemptReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  public subscribe(channel: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        type: 'subscribe',
        channel: channel
      };
      console.log('📡 Subscribing to channel:', channel);
      this.ws.send(JSON.stringify(message));
    } else {
      console.log('⚠️ WebSocket not ready, deferring subscription to:', channel);
      // 延迟订阅
      setTimeout(() => {
        this.subscribe(channel);
      }, 1000);
    }
  }

  public unsubscribe(channel: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        type: 'unsubscribe',
        channel: channel
      };
      console.log('📡 Unsubscribing from channel:', channel);
      this.ws.send(JSON.stringify(message));
    }
  }

  public sendMessage(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.log('⚠️ WebSocket not ready, message not sent:', message);
    }
  }

  public ping() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = { type: 'ping' };
      console.log('💓 Sending ping');
      this.ws.send(JSON.stringify(message));
    }
  }

  public disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.reconnectAttempts = 0;
  }
}