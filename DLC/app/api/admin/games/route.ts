import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { gameRooms, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  try {
    const rooms = await db.query.gameRooms.findMany({
      with: {
        host: true,
        participants: true
      },
      orderBy: desc(gameRooms.createdAt),
      limit: 50
    });

    const roomsFormatted = rooms.map(room => ({
      id: room.id,
      name: room.name,
      playerCount: room.participants.length,
      maxPlayers: room.maxPlayers,
      isStarted: room.isStarted,
      createdAt: room.createdAt,
      hostName: room.host?.name || 'Unknown'
    }));

    return NextResponse.json({
      rooms: roomsFormatted
    });
  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    );
  }
}