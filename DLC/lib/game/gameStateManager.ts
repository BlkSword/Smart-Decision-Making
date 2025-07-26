import { gamePersistence } from './persistence';
import { replayService } from './replayService';
import { GameState, GameRoom } from './types';

export class GameStateManager {
  private saveInterval: NodeJS.Timeout | null = null;
  private roomSaveQueues: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Start automatic periodic saving for a game room
   */
  startPeriodicSaving(roomId: string, gameState: GameState, intervalMs: number = 30000): void {
    // Clear existing interval if any
    this.stopPeriodicSaving(roomId);

    // Start replay recording
    replayService.startRecording(roomId);

    // Set up new interval
    this.saveInterval = setInterval(async () => {
      try {
        await gamePersistence.saveGameState(roomId, gameState);
        console.log(`Game state saved for room ${roomId}`);
      } catch (error) {
        console.error(`Error saving game state for room ${roomId}:`, error);
      }
    }, intervalMs);

    console.log(`Started periodic saving for room ${roomId} every ${intervalMs}ms`);
  }

  /**
   * Stop automatic periodic saving for a game room
   */
  stopPeriodicSaving(roomId: string): void {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }

    // Clear any queued save for this room
    const queuedSave = this.roomSaveQueues.get(roomId);
    if (queuedSave) {
      clearTimeout(queuedSave);
      this.roomSaveQueues.delete(roomId);
    }

    // Stop replay recording
    replayService.stopRecording(roomId);

    console.log(`Stopped periodic saving for room ${roomId}`);
  }

  /**
   * Queue a save operation (debounced to prevent too frequent saves)
   */
  queueSave(roomId: string, gameState: GameState, delayMs: number = 5000): void {
    // Clear existing queued save
    const existingQueue = this.roomSaveQueues.get(roomId);
    if (existingQueue) {
      clearTimeout(existingQueue);
    }

    // Queue new save
    const saveTimeout = setTimeout(async () => {
      try {
        await gamePersistence.saveGameState(roomId, gameState);
        console.log(`Queued game state saved for room ${roomId}`);
      } catch (error) {
        console.error(`Error in queued save for room ${roomId}:`, error);
      } finally {
        this.roomSaveQueues.delete(roomId);
      }
    }, delayMs);

    this.roomSaveQueues.set(roomId, saveTimeout);
  }

  /**
   * Save game state immediately
   */
  async saveImmediately(roomId: string, gameState: GameState): Promise<void> {
    try {
      await gamePersistence.saveGameState(roomId, gameState);
      console.log(`Game state immediately saved for room ${roomId}`);
    } catch (error) {
      console.error(`Error immediately saving game state for room ${roomId}:`, error);
      throw error;
    }
  }

  /**
   * Load the latest game state for a room
   */
  async loadGameState(roomId: string): Promise<GameState | null> {
    try {
      const gameState = await gamePersistence.loadGameState(roomId);
      if (gameState) {
        console.log(`Game state loaded for room ${roomId}`);
      }
      return gameState;
    } catch (error) {
      console.error(`Error loading game state for room ${roomId}:`, error);
      return null;
    }
  }

  /**
   * Record a player action
   */
  async recordPlayerAction(roomId: string, userId: number | null, actionType: string, actionData: any, turn: number): Promise<void> {
    try {
      await gamePersistence.recordAction(roomId, userId, actionType as any, actionData, turn);
    } catch (error) {
      console.error(`Error recording action for room ${roomId}:`, error);
    }
  }

  /**
   * Complete a game and save final results
   */
  async completeGame(roomId: string, results: { playerId: string; finalRank: number; finalAssets: number }[]): Promise<void> {
    try {
      // Stop periodic saving (this will also stop replay recording)
      this.stopPeriodicSaving(roomId);

      // Map player IDs to participant IDs and update statistics
      const dbResults = [];
      for (const result of results) {
        const participantId = parseInt(result.playerId);
        if (!isNaN(participantId)) {
          dbResults.push({
            participantId,
            finalRank: result.finalRank,
            finalAssets: result.finalAssets
          });

          // Update player statistics
          await gamePersistence.updatePlayerStatistics(participantId, {
            gamesPlayed: 1,
            gamesWon: result.finalRank === 1 ? 1 : 0,
            totalPlayTime: 0, // Will be calculated elsewhere
            highestAssets: result.finalAssets,
            rank: result.finalRank
          });
        }
      }

      // Complete the game in database
      await gamePersistence.completeGame(roomId, dbResults);

      console.log(`Game completed for room ${roomId}`);
    } catch (error) {
      console.error(`Error completing game for room ${roomId}:`, error);
    }
  }

  /**
   * Get game statistics for a player
   */
  async getPlayerStatistics(userId: number): Promise<any> {
    try {
      return await gamePersistence.getPlayerStatistics(userId);
    } catch (error) {
      console.error(`Error getting player statistics for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Clean up all timers and intervals
   */
  cleanup(): void {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }

    // Clear all queued saves
    this.roomSaveQueues.forEach((timeout) => clearTimeout(timeout));
    this.roomSaveQueues.clear();

    console.log('GameStateManager cleanup completed');
  }
}

export const gameStateManager = new GameStateManager();