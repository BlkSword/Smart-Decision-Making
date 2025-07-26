import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { gameRooms } from '@/lib/db/schema';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { id, name, hostId, maxPlayers, isPrivate, password } = await request.json();

    if (!name || !maxPlayers) {
      return NextResponse.json({ error: 'Room name and max players are required' }, { status: 400 });
    }

    // Create room in database
    const [room] = await db.insert(gameRooms).values({
      id: id || randomUUID(),
      name,
      hostId,
      maxPlayers,
      isPrivate: isPrivate || false,
      passwordHash: password ? await bcrypt.hash(password, 10) : null,
    }).returning();

    return NextResponse.json({ room }, { status: 201 });
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    if (roomId) {
      // Get specific room
      const room = await db.query.gameRooms.findFirst({
        where: (rooms, { eq }) => eq(rooms.id, roomId),
        with: {
          participants: true,
        },
      });

      if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }

      return NextResponse.json({ room });
    } else {
      // Get all available rooms
      const rooms = await db.query.gameRooms.findMany({
        where: (rooms, { eq }) => eq(rooms.isCompleted, false),
        with: {
          participants: true,
        },
        orderBy: (rooms, { desc }) => desc(rooms.createdAt),
      });

      return NextResponse.json({ rooms });
    }
  } catch (error) {
    console.error('Error getting rooms:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}