import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { users, gameStatistics } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  try {
    const usersData = await db.query.users.findMany({
      with: {
        statistics: true
      },
      orderBy: desc(users.createdAt),
      limit: 100
    });

    const usersFormatted = usersData.map(user => ({
      id: user.id,
      name: user.name || 'Unknown',
      email: user.email,
      isActive: user.deletedAt === null,
      lastLogin: user.updatedAt,
      gamesPlayed: user.statistics?.gamesPlayed || 0,
      isBanned: user.deletedAt !== null,
      createdAt: user.createdAt
    }));

    return NextResponse.json({
      users: usersFormatted
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}