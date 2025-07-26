"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DebugPage() {
  const [isClient, setIsClient] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [errorLog, setErrorLog] = useState<string[]>([]);

  useEffect(() => {
    setIsClient(true);
    
    // 收集调试信息
    const info = {
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      localStorage: !!window.localStorage,
      sessionStorage: !!window.sessionStorage,
      webSocket: !!window.WebSocket,
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        devicePixelRatio: window.devicePixelRatio
      }
    };
    
    setDebugInfo(info);
    
    // 监听错误
    const handleError = (event: ErrorEvent) => {
      setErrorLog(prev => [...prev, `Error: ${event.message} at ${event.filename}:${event.lineno}`]);
    };
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      setErrorLog(prev => [...prev, `Unhandled Promise Rejection: ${event.reason}`]);
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (!isClient) {
    return <div className="p-8">Loading debug information...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">🔍 游戏调试页面</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-green-400">✅ 系统状态</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>✅ 页面加载成功</div>
                <div>✅ React 组件正常</div>
                <div>✅ CSS 样式加载</div>
                <div>✅ JavaScript 运行正常</div>
                <div>✅ Next.js 正常工作</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-blue-400">ℹ️ 环境信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div><strong>时间:</strong> {debugInfo.timestamp}</div>
                <div><strong>URL:</strong> {debugInfo.url}</div>
                <div><strong>屏幕:</strong> {debugInfo.screen?.width}x{debugInfo.screen?.height}</div>
                <div><strong>设备像素比:</strong> {debugInfo.screen?.devicePixelRatio}</div>
                <div><strong>存储支持:</strong> {debugInfo.localStorage ? '✅' : '❌'}</div>
                <div><strong>WebSocket:</strong> {debugInfo.webSocket ? '✅' : '❌'}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-yellow-400">⚠️ 错误日志</CardTitle>
            </CardHeader>
            <CardContent>
              {errorLog.length > 0 ? (
                <div className="space-y-2 text-sm">
                  {errorLog.map((error, index) => (
                    <div key={index} className="text-red-400 p-2 bg-red-900/20 rounded">
                      {error}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-green-400">✅ 没有发现错误</div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-purple-400">🔗 游戏链接</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <a 
                  href="/" 
                  className="block w-full p-3 bg-blue-600 hover:bg-blue-700 rounded transition-colors text-center"
                >
                  🏠 返回首页
                </a>
                <a 
                  href="/game" 
                  className="block w-full p-3 bg-green-600 hover:bg-green-700 rounded transition-colors text-center"
                >
                  🎮 单人游戏
                </a>
                <a 
                  href="/multiplayer" 
                  className="block w-full p-3 bg-red-600 hover:bg-red-700 rounded transition-colors text-center"
                >
                  👥 多人游戏
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gray-800 border-gray-700 mt-6">
          <CardHeader>
            <CardTitle className="text-cyan-400">🌐 浏览器信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm break-all">
              <strong>User Agent:</strong> {debugInfo.userAgent}
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 p-4 bg-yellow-900/20 rounded-lg border border-yellow-600">
          <h2 className="text-xl font-bold text-yellow-400 mb-2">🛠️ 排查建议</h2>
          <ul className="space-y-2 text-sm">
            <li>• 确保你的浏览器支持现代 JavaScript 功能</li>
            <li>• 检查浏览器控制台是否有错误信息 (按 F12)</li>
            <li>• 尝试刷新页面 (Ctrl+F5 或 Cmd+R)</li>
            <li>• 检查网络连接是否正常</li>
            <li>• 如果问题持续，请尝试使用不同的浏览器</li>
          </ul>
        </div>
      </div>
    </div>
  );
}