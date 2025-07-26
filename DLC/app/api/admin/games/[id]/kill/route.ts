import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { gameRooms } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const roomId = params.id;
    
    if (!roomId) {
      return NextResponse.json(
        { error: 'Invalid room ID' },
        { status: 400 }
      );
    }

    // Force complete the game
    await db
      .update(gameRooms)
      .set({
        isCompleted: true,
        completedAt: new Date()
      })
      .where(eq(gameRooms.id, roomId));

    // TODO: In a real implementation, you would also:
    // 1. Notify all connected players via WebSocket
    // 2. Clean up any active game state
    // 3. Update player statistics appropriately
    // 4. Log the admin action

    return NextResponse.json({
      success: true,
      message: 'Game killed successfully'
    });
  } catch (error) {
    console.error('Error killing game:', error);
    return NextResponse.json(
      { error: 'Failed to kill game' },
      { status: 500 }
    );
  }
}