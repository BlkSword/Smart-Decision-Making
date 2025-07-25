import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching situation data from backend...');
    
    // Call the backend API
    const backendResponse = await fetch(`${BACKEND_URL}/api/situation/full-data`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!backendResponse.ok) {
      console.error(`Backend API error: ${backendResponse.status} ${backendResponse.statusText}`);
      throw new Error(`Backend API responded with status ${backendResponse.status}`);
    }

    const data = await backendResponse.json();
    console.log('Successfully fetched situation data:', Object.keys(data));

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in situation API route:', error);
    
    // Return proper error response instead of mock data
    return NextResponse.json(
      { 
        error: 'Failed to fetch situation data from backend',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}