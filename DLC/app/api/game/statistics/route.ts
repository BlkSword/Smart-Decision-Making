import { NextRequest, NextResponse } from 'next/server';
import { gamePersistence } from '@/lib/game/persistence';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const statistics = await gamePersistence.getPlayerStatistics(userIdNum);
    
    return NextResponse.json({ statistics });
  } catch (error) {
    console.error('Error getting player statistics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, updates } = await request.json();

    if (!userId || !updates) {
      return NextResponse.json({ error: 'User ID and updates are required' }, { status: 400 });
    }

    await gamePersistence.updatePlayerStatistics(userId, updates);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating player statistics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}