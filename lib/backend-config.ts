/**
 * 获取后端API URL
 * 在Clacky环境中会动态计算，在本地开发环境中使用配置的值
 */
export function getBackendUrl(): string {
  // 如果是浏览器环境，需要动态计算
  if (typeof window !== 'undefined') {
    console.log('🔍 getBackendUrl - 当前环境信息:');
    console.log('  - hostname:', window.location.hostname);
    console.log('  - host:', window.location.host);
    console.log('  - protocol:', window.location.protocol);
    
    if (window.location.hostname.includes('clackypaas.com')) {
      console.log('🌐 Clacky环境检测到');
      
      // Clacky环境：将3000端口替换为8000端口
      const protocol = window.location.protocol; // http: 或 https:
      let backendHost = window.location.host.replace('3000-', '8000-');
      console.log('🔄 尝试3000- -> 8000-替换:', backendHost);
      
      // 如果替换失败，尝试其他格式
      if (backendHost === window.location.host) {
        console.log('⚠️ 3000-替换失败，尝试:3000 -> :8000');
        backendHost = window.location.host.replace(':3000', ':8000');
        console.log('🔄 尝试:3000 -> :8000替换:', backendHost);
      }
      
      // 如果还是失败，尝试更复杂的匹配
      if (backendHost === window.location.host) {
        console.log('⚠️ 所有基础替换都失败，尝试正则匹配...');
        const match = window.location.host.match(/^(\d+)-(.*\.clackypaas\.com)$/);
        if (match) {
          backendHost = `8000-${match[2]}`;
          console.log('✅ 正则匹配成功:', backendHost);
        } else {
          console.log('❌ 正则匹配失败，使用原始host');
        }
      }
      
      const backendUrl = `${protocol}//${backendHost}`;
      console.log('🔗 最终计算的后端URL:', backendUrl);
      return backendUrl;
    }
    
    console.log('🏠 非Clacky环境，使用本地配置');
  }
  
  // 本地开发环境或服务器端渲染
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
  console.log('🏠 本地开发环境，使用配置的后端URL:', backendUrl);
  return backendUrl;
}

/**
 * 获取WebSocket URL
 */
export function getWebSocketUrl(clientId: string): string {
  const backendUrl = getBackendUrl();
  const wsUrl = backendUrl.replace('http://', 'ws://').replace('https://', 'wss://');
  return `${wsUrl}/ws/${clientId}`;
}