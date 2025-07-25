import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/backend-config';

const BACKEND_URL = getBackendUrl();

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/simulation/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch simulation status' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching simulation status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}