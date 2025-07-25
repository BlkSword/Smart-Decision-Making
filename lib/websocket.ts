export class WebSocketConnection {
  private ws: WebSocket | null = null;
  private clientId: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  
  public onMessage: ((data: any) => void) | null = null;
  public onConnect: (() => void) | null = null;
  public onDisconnect: (() => void) | null = null;
  public onError: ((error: Event) => void) | null = null;

  constructor() {
    this.clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.connect();
  }

  private connect() {
    try {
      // 获取WebSocket URL - 连接到后端服务器
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const backendHost = process.env.NEXT_PUBLIC_BACKEND_WS_URL || 'localhost:8000';
      const wsUrl = `${protocol}//${backendHost}/ws/${this.clientId}`;
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        
        // 订阅游戏事件
        this.subscribe('game_events');
        
        if (this.onConnect) {
          this.onConnect();
        }
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'pong') {
            // 心跳响应，忽略
            return;
          }
          
          if (this.onMessage) {
            this.onMessage(data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.ws = null;
        
        if (this.onDisconnect) {
          this.onDisconnect();
        }
        
        // 尝试重连
        this.attemptReconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        
        if (this.onError) {
          this.onError(error);
        }
      };
      
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  public send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  public subscribe(channel: string) {
    this.send({
      type: 'subscribe',
      channel: channel
    });
  }

  public unsubscribe(channel: string) {
    this.send({
      type: 'unsubscribe',
      channel: channel
    });
  }

  public ping() {
    this.send({
      type: 'ping'
    });
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
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}