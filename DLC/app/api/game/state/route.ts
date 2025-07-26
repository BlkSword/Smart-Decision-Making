import { NextRequest, NextResponse } from 'next/server';
import { gamePersistence } from '@/lib/game/persistence';
import { gameStateManager } from '@/lib/game/gameStateManager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    const gameState = await gameStateManager.loadGameState(roomId);
    
    if (!gameState) {
      return NextResponse.json({ error: 'Game state not found' }, { status: 404 });
    }

    return NextResponse.json({ gameState });
  } catch (error) {
    console.error('Error loading game state:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { roomId, gameState } = await request.json();

    if (!roomId || !gameState) {
      return NextResponse.json({ error: 'Room ID and game state are required' }, { status: 400 });
    }

    await gameStateManager.saveImmediately(roomId, gameState);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving game state:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}