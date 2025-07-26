import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { chatMessages, gameRooms } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { roomId, userId, playerName, message, messageType } = await request.json();

    // Validate required fields
    if (!roomId || !playerName || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // For single-player mode, just return success without saving
    if (roomId === 'single-player') {
      return NextResponse.json({ 
        success: true, 
        messageId: 'single-player' 
      });
    }

    // Check if room exists
    const room = await db
      .select()
      .from(gameRooms)
      .where(eq(gameRooms.id, roomId))
      .limit(1);

    if (room.length === 0) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    // Insert chat message
    const result = await db
      .insert(chatMessages)
      .values({
        roomId,
        userId,
        playerName,
        message,
        messageType: messageType || 'chat',
      })
      .returning();

    return NextResponse.json({ 
      success: true, 
      messageId: result[0].id 
    });
  } catch (error) {
    console.error('Error saving chat message:', error);
    return NextResponse.json(
      { error: 'Failed to save chat message' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID is required' },
        { status: 400 }
      );
    }

    // Get chat messages for the room
    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.roomId, roomId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);

    return NextResponse.json({
      success: true,
      messages: messages.reverse() // Reverse to show chronological order
    });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat messages' },
      { status: 500 }
    );
  }
}