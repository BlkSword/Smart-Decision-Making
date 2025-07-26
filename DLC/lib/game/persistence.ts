import { db } from '@/lib/db/drizzle';
import { 
  gameRooms, 
  gameParticipants, 
  gameStates, 
  gameActions, 
  gameStatistics,
  GameRoom,
  GameParticipant,
  GameState as DBGameState,
  GameAction,
  GameStatistics,
  GamePhase,
  ActionType,
  ActivityType,
  activityLogs
} from '@/lib/db/schema';
import { GameState, GameRoom as WSGameRoom, Player } from '@/lib/game/types';
import { eq, and, desc, asc, isNull } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export class GamePersistenceService {
  /**
   * Create a new game room in the database
   */
  async createGameRoom(roomData: {
    name: string;
    hostId?: number;
    maxPlayers: number;
    isPrivate: boolean;
    password?: string;
    settings?: any;
  }): Promise<GameRoom> {
    const passwordHash = roomData.password ? await bcrypt.hash(roomData.password, 10) : null;
    
    const [room] = await db.insert(gameRooms).values({
      name: roomData.name,
      hostId: roomData.hostId,
      maxPlayers: roomData.maxPlayers,
      isPrivate: roomData.isPrivate,
      passwordHash,
      settings: roomData.settings,
    }).returning();
    
    return room;
  }

  /**
   * Add a participant to a game room
   */
  async addParticipant(roomId: string, participantData: {
    userId?: number;
    playerName: string;
    isHost: boolean;
  }): Promise<GameParticipant> {
    const [participant] = await db.insert(gameParticipants).values({
      roomId,
      userId: participantData.userId,
      playerName: participantData.playerName,
      isHost: participantData.isHost,
    }).returning();
    
    return participant;
  }

  /**
   * Update participant ready status
   */
  async updateParticipantReady(roomId: string, userId: number | null, playerName: string, isReady: boolean): Promise<void> {
    await db.update(gameParticipants)
      .set({ isReady })
      .where(and(
        eq(gameParticipants.roomId, roomId),
        userId ? eq(gameParticipants.userId, userId) : eq(gameParticipants.playerName, playerName)
      ));
  }

  /**
   * Remove a participant from a game room
   */
  async removeParticipant(roomId: string, participantId: number): Promise<void> {
    await db.update(gameParticipants)
      .set({ leftAt: new Date() })
      .where(and(
        eq(gameParticipants.roomId, roomId),
        eq(gameParticipants.id, participantId)
      ));
  }

  /**
   * Start a game and update room status
   */
  async startGame(roomId: string): Promise<void> {
    await db.update(gameRooms)
      .set({ 
        isStarted: true,
        startedAt: new Date()
      })
      .where(eq(gameRooms.id, roomId));
  }

  /**
   * Complete a game and update final results
   */
  async completeGame(roomId: string, results: {
    participantId: number;
    finalRank: number;
    finalAssets: number;
  }[]): Promise<void> {
    // Update room as completed
    await db.update(gameRooms)
      .set({ 
        isCompleted: true,
        completedAt: new Date()
      })
      .where(eq(gameRooms.id, roomId));

    // Update participant results
    for (const result of results) {
      await db.update(gameParticipants)
        .set({
          finalRank: result.finalRank,
          finalAssets: result.finalAssets
        })
        .where(eq(gameParticipants.id, result.participantId));
    }
  }

  /**
   * Save game state snapshot
   */
  async saveGameState(roomId: string, gameState: GameState): Promise<void> {
    await db.insert(gameStates).values({
      roomId,
      turn: gameState.currentTurn,
      gamePhase: gameState.gamePhase || GamePhase.PLAYING,
      companies: gameState.companies,
      map: gameState.map,
      gameData: {
        recentEvents: gameState.recentEvents,
        analytics: gameState.analytics,
        stockMarket: gameState.stockMarket,
        winner: gameState.winner,
        victoryReason: gameState.victoryReason,
        isActive: gameState.isActive,
        startTime: gameState.startTime,
        eliminationStartTime: gameState.eliminationStartTime,
        lastUpdate: gameState.lastUpdate
      }
    });
  }

  /**
   * Load the latest game state
   */
  async loadGameState(roomId: string): Promise<GameState | null> {
    const [latestState] = await db.select()
      .from(gameStates)
      .where(eq(gameStates.roomId, roomId))
      .orderBy(desc(gameStates.createdAt))
      .limit(1);

    if (!latestState) return null;

    const gameData = latestState.gameData as any;
    
    return {
      companies: latestState.companies as any,
      map: latestState.map as any,
      currentTurn: latestState.turn,
      gamePhase: latestState.gamePhase as any,
      recentEvents: gameData?.recentEvents || [],
      analytics: gameData?.analytics || {},
      stockMarket: gameData?.stockMarket || {},
      winner: gameData?.winner || null,
      victoryReason: gameData?.victoryReason || null,
      isActive: gameData?.isActive || false,
      startTime: gameData?.startTime ? new Date(gameData.startTime) : new Date(),
      eliminationStartTime: gameData?.eliminationStartTime ? new Date(gameData.eliminationStartTime) : undefined,
      lastUpdate: gameData?.lastUpdate ? new Date(gameData.lastUpdate) : new Date()
    };
  }

  /**
   * Record a player action
   */
  async recordAction(roomId: string, userId: number | null, actionType: ActionType, actionData: any, turn: number): Promise<void> {
    await db.insert(gameActions).values({
      roomId,
      userId,
      actionType,
      actionData,
      turn
    });
  }

  /**
   * Get game history for a room
   */
  async getGameHistory(roomId: string): Promise<GameAction[]> {
    return await db.select()
      .from(gameActions)
      .where(eq(gameActions.roomId, roomId))
      .orderBy(asc(gameActions.timestamp));
  }

  /**
   * Update player statistics
   */
  async updatePlayerStatistics(userId: number, updates: {
    gamesPlayed?: number;
    gamesWon?: number;
    totalPlayTime?: number;
    highestAssets?: number;
    rank?: number;
  }): Promise<void> {
    // Get current stats
    const [currentStats] = await db.select()
      .from(gameStatistics)
      .where(eq(gameStatistics.userId, userId))
      .limit(1);

    if (!currentStats) {
      // Create new stats record
      await db.insert(gameStatistics).values({
        userId,
        gamesPlayed: updates.gamesPlayed || 1,
        gamesWon: updates.gamesWon || 0,
        totalPlayTime: updates.totalPlayTime || 0,
        highestAssets: updates.highestAssets || 0,
        averageRank: updates.rank || 0,
        lastPlayed: new Date()
      });
    } else {
      // Update existing stats
      const newGamesPlayed = currentStats.gamesPlayed + (updates.gamesPlayed || 1);
      const newGamesWon = currentStats.gamesWon + (updates.gamesWon || 0);
      const newTotalPlayTime = currentStats.totalPlayTime + (updates.totalPlayTime || 0);
      const newHighestAssets = Math.max(currentStats.highestAssets || 0, updates.highestAssets || 0);
      
      // Calculate new average rank
      const currentAverage = currentStats.averageRank || 0;
      const newRank = updates.rank || 0;
      const newAverageRank = Math.round((currentAverage * (newGamesPlayed - 1) + newRank) / newGamesPlayed);

      await db.update(gameStatistics)
        .set({
          gamesPlayed: newGamesPlayed,
          gamesWon: newGamesWon,
          totalPlayTime: newTotalPlayTime,
          highestAssets: newHighestAssets,
          averageRank: newAverageRank,
          lastPlayed: new Date(),
          updatedAt: new Date()
        })
        .where(eq(gameStatistics.userId, userId));
    }
  }

  /**
   * Get player statistics
   */
  async getPlayerStatistics(userId: number): Promise<GameStatistics | null> {
    const [stats] = await db.select()
      .from(gameStatistics)
      .where(eq(gameStatistics.userId, userId))
      .limit(1);

    return stats || null;
  }

  /**
   * Get game room with participants
   */
  async getGameRoom(roomId: string): Promise<(GameRoom & { participants: GameParticipant[] }) | null> {
    const [room] = await db.select()
      .from(gameRooms)
      .where(eq(gameRooms.id, roomId))
      .limit(1);

    if (!room) return null;

    const participants = await db.select()
      .from(gameParticipants)
      .where(and(
        eq(gameParticipants.roomId, roomId),
        isNull(gameParticipants.leftAt)
      ))
      .orderBy(asc(gameParticipants.joinedAt));

    return { ...room, participants };
  }

  /**
   * Verify room password
   */
  async verifyRoomPassword(roomId: string, password: string): Promise<boolean> {
    const [room] = await db.select()
      .from(gameRooms)
      .where(eq(gameRooms.id, roomId))
      .limit(1);

    if (!room || !room.passwordHash) return false;

    return await bcrypt.compare(password, room.passwordHash);
  }

  /**
   * Log activity
   */
  async logActivity(userId: number, action: ActivityType, metadata?: any): Promise<void> {
    await db.insert(activityLogs).values({
      userId,
      action,
      metadata: metadata ? JSON.stringify(metadata) : null
    });
  }

  /**
   * Get active game rooms
   */
  async getActiveGameRooms(): Promise<(GameRoom & { participants: GameParticipant[] })[]> {
    const rooms = await db.select()
      .from(gameRooms)
      .where(and(
        eq(gameRooms.isStarted, false),
        eq(gameRooms.isCompleted, false)
      ))
      .orderBy(desc(gameRooms.createdAt));

    const roomsWithParticipants = await Promise.all(
      rooms.map(async (room) => {
        const participants = await db.select()
          .from(gameParticipants)
          .where(and(
            eq(gameParticipants.roomId, room.id),
            isNull(gameParticipants.leftAt)
          ))
          .orderBy(asc(gameParticipants.joinedAt));

        return { ...room, participants };
      })
    );

    return roomsWithParticipants;
  }

  /**
   * Clean up old completed games
   */
  async cleanupOldGames(daysOld: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // Delete old game states
    await db.delete(gameStates)
      .where(and(
        eq(gameStates.createdAt, cutoffDate)
      ));

    // Delete old game actions
    await db.delete(gameActions)
      .where(and(
        eq(gameActions.timestamp, cutoffDate)
      ));
  }
}

export const gamePersistence = new GamePersistenceService();

// CommonJS export for Node.js compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { gamePersistence, GamePersistenceService };
}