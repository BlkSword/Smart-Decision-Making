import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { client_id: string } }
) {
  const clientId = params.client_id;
  
  // 检查是否为WebSocket升级请求
  const upgrade = request.headers.get('upgrade');
  if (upgrade !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 400 });
  }
  
  // Next.js API路由不能直接处理WebSocket升级
  // 我们需要返回一个错误，告诉客户端尝试直接连接
  return new Response(
    JSON.stringify({
      error: 'WebSocket proxy not supported',
      message: 'Please try direct backend connection',
      backend_url: process.env.BACKEND_URL || 'http://localhost:8000',
      websocket_url: `ws://localhost:8000/ws/${clientId}`
    }),
    {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}