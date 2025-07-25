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
  public onConnecting: (() => void) | null = null;

  constructor() {
    this.clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.connect();
  }

  private connect() {
    try {
      // 获取WebSocket URL - 连接到后端服务器
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      
      let wsUrl;
      let backendHost;
      
      if (window.location.hostname.includes('clackypaas.com')) {
        // 在Clacky环境中，直接尝试后端连接
        console.log('🌐 Clacky环境检测到');
        
        // 在Clacky环境中，尝试使用8000端口对应的主机地址
        // 将3000端口替换为8000端口
        backendHost = window.location.host.replace('3000-', '8000-');
        
        // 使用wss协议与外部可访问的地址
        wsUrl = `wss://${backendHost}/ws/${this.clientId}`;
        
        console.log('🔗 使用Clacky环境Backend地址连接');
        
      } else {
        // 本地开发环境
        backendHost = process.env.NEXT_PUBLIC_BACKEND_WS_URL || 'localhost:8000';
        wsUrl = `${protocol}//${backendHost}/ws/${this.clientId}`;
      }
      
      console.log('🔗 Connecting to WebSocket:', wsUrl);
      console.log('🔧 Protocol:', protocol);
      console.log('🌐 Backend Host:', backendHost);
      console.log('🏷️ Client ID:', this.clientId);
      
      // 通知开始连接
      if (this.onConnecting) {
        this.onConnecting();
      }
      
      console.log('🔍 Window location:', window.location.href);
      console.log('🔍 Creating WebSocket with URL:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);
      
      // 添加 readyState 监控
      const checkReadyState = () => {
        console.log('🔍 WebSocket readyState:', this.ws?.readyState, '(0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED)');
      };
      
      checkReadyState();
      setTimeout(checkReadyState, 100);
      setTimeout(checkReadyState, 1000);
      setTimeout(checkReadyState, 3000);
      
      this.ws.onopen = () => {
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
        console.log('🔒 WebSocket disconnected. Code:', event.code, 'Reason:', event.reason);
        this.ws = null;
        
        if (this.onDisconnect) {
          this.onDisconnect();
        }
        
        // 尝试重连
        this.attemptReconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error('❌ WebSocket connection error:', error);
        console.error('❌ WebSocket state:', this.ws?.readyState);
        console.error('❌ WebSocket URL was:', wsUrl);
        
        // 在Clacky环境中，如果连接失败，尝试其他策略
        if (window.location.hostname.includes('clackypaas.com')) {
          console.log('🔄 初始连接失败，尝试其他策略...');
          this.attemptDirectBackendConnection();
          return;
        }
        
        if (this.onError) {
          this.onError(error);
        }
      };
      
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.attemptReconnect();
    }
  }

  private attemptDirectBackendConnection() {
    // 在Clacky环境中，如果前端代理失败，尝试直接连接到后端
    if (!window.location.hostname.includes('clackypaas.com')) {
      return;
    }
    
    try {
      console.log('🔄 尝试直接连接到后端服务器...');
      
      // 尝试多种后端连接策略
      const strategies = [
        // 策略1: 尝试8000端口的域名
        window.location.host.replace('3000-', '8000-'),
        // 策略2: 尝试直接内部连接
        'localhost:8000',
        // 策略3: 尝试容器内部网络连接
        '127.0.0.1:8000',
      ];
      
      this.tryBackendStrategies(strategies, 0);
    } catch (error) {
      console.error('Error in direct backend connection attempt:', error);
      this.attemptReconnect();
    }
  }
  
  private tryBackendStrategies(strategies: string[], index: number) {
    if (index >= strategies.length) {
      console.error('All backend connection strategies failed');
      if (this.onError) {
        this.onError(new Event('All connection strategies failed'));
      }
      return;
    }
    
    const strategy = strategies[index];
    
    // 选择正确的协议
    let protocol;
    if (strategy.includes('clackypaas.com')) {
      // Clacky环境使用WSS
      protocol = 'wss:';
    } else {
      // 本地开发环境使用WS
      protocol = 'ws:';
    }
    
    const wsUrl = `${protocol}//${strategy}/ws/${this.clientId}`;
    
    console.log(`🔄 尝试策略 ${index + 1}: ${wsUrl}`);
    
    try {
      const testWs = new WebSocket(wsUrl);
      
      const timeout = setTimeout(() => {
        testWs.close();
        console.log(`⏰ 策略 ${index + 1} 超时`);
        this.tryBackendStrategies(strategies, index + 1);
      }, 5000);
      
      testWs.onopen = () => {
        clearTimeout(timeout);
        console.log(`✅ 策略 ${index + 1} 成功！`);
        testWs.close();
        
        // 成功的策略，重新连接
        this.ws = null;
        this.reconnectAttempts = 0;
        
        // 更新连接URL并重新连接
        setTimeout(() => {
          this.connectWithUrl(wsUrl);
        }, 100);
      };
      
      testWs.onerror = () => {
        clearTimeout(timeout);
        console.log(`❌ 策略 ${index + 1} 失败`);
        this.tryBackendStrategies(strategies, index + 1);
      };
      
    } catch (error) {
      console.error(`策略 ${index + 1} 创建失败:`, error);
      this.tryBackendStrategies(strategies, index + 1);
    }
  }
  
  private connectWithUrl(wsUrl: string) {
    try {
      console.log('🔗 使用指定URL连接WebSocket:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
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
        console.log('🔒 WebSocket disconnected. Code:', event.code, 'Reason:', event.reason);
        this.ws = null;
        
        if (this.onDisconnect) {
          this.onDisconnect();
        }
        
        // 尝试重连
        this.attemptReconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error('❌ WebSocket connection error:', error);
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