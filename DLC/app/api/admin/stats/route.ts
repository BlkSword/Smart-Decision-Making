import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { users, gameRooms, gameParticipants } from '@/lib/db/schema';
import { count, eq, and, gte, sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Get total users
    const totalUsersResult = await db.select({ count: count() }).from(users);
    const totalUsers = totalUsersResult[0]?.count || 0;

    // Get active users (logged in within last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeUsersResult = await db
      .select({ count: count() })
      .from(users)
      .where(
        and(
          gte(users.updatedAt, twentyFourHoursAgo),
          eq(users.deletedAt, null)
        )
      );
    const activeUsers = activeUsersResult[0]?.count || 0;

    // Get total games
    const totalGamesResult = await db.select({ count: count() }).from(gameRooms);
    const totalGames = totalGamesResult[0]?.count || 0;

    // Get active games
    const activeGamesResult = await db
      .select({ count: count() })
      .from(gameRooms)
      .where(
        and(
          eq(gameRooms.isStarted, true),
          eq(gameRooms.isCompleted, false)
        )
      );
    const activeGames = activeGamesResult[0]?.count || 0;

    // Mock system health data (in a real app, this would come from monitoring)
    const memoryUsage = Math.floor(Math.random() * 30) + 40; // 40-70%
    const cpuUsage = Math.floor(Math.random() * 20) + 10; // 10-30%
    const serverUptime = Math.floor(Date.now() / 1000) - 1700000000; // Mock uptime

    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (memoryUsage > 80 || cpuUsage > 80) {
      systemHealth = 'critical';
    } else if (memoryUsage > 60 || cpuUsage > 60) {
      systemHealth = 'warning';
    }

    return NextResponse.json({
      totalUsers,
      activeUsers,
      totalGames,
      activeGames,
      systemHealth,
      serverUptime,
      memoryUsage,
      cpuUsage
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin stats' },
      { status: 500 }
    );
  }
}