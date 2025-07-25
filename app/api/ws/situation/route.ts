import { NextRequest } from 'next/server';

// Note: Next.js doesn't natively support WebSocket in API routes
// We need to handle this differently or use a separate WebSocket server

export async function GET(request: NextRequest) {
  return new Response('WebSocket upgrade not supported in Next.js API routes. Please use the backend WebSocket endpoint directly.', {
    status: 400,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}