import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: { client_id: string } }
) {
  const { client_id } = params;
  
  try {
    // Check if WebSocket upgrade is requested
    const upgrade = request.headers.get('upgrade');
    if (upgrade !== 'websocket') {
      return NextResponse.json({ error: 'WebSocket upgrade required' }, { status: 400 });
    }

    // Return WebSocket connection info
    return NextResponse.json({
      message: 'WebSocket endpoint',
      client_id,
      backend_url: BACKEND_URL,
      websocket_url: `${BACKEND_URL.replace('http', 'ws')}/ws/${client_id}`
    });
  } catch (error) {
    console.error('WebSocket API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}