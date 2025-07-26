import { db } from '@/lib/db/drizzle';
import { gameRooms, gameStates, gameActions, gameParticipants } from '@/lib/db/schema';
import { GameReplay, ReplayFrame, ReplayMetadata, ReplayAnalytics, ReplaySearchParams } from './replayTypes';
import { eq, and, desc, asc, gte, lte, like, or, sql } from 'drizzle-orm';
import { GameState } from './types';

export class ReplayService {
  private static instance: ReplayService;
  private recordingRooms: Set<string> = new Set();

  static getInstance(): ReplayService {
    if (!ReplayService.instance) {
      ReplayService.instance = new ReplayService();
    }
    return ReplayService.instance;
  }

  /**
   * Start recording a game session
   */
  async startRecording(roomId: string): Promise<void> {
    if (this.recordingRooms.has(roomId)) {
      console.log(`Recording already started for room ${roomId}`);
      return;
    }

    this.recordingRooms.add(roomId);
    console.log(`Started recording for room ${roomId}`);
  }

  /**
   * Stop recording and finalize the replay
   */
  async stopRecording(roomId: string): Promise<void> {
    if (!this.recordingRooms.has(roomId)) {
      console.log(`No recording found for room ${roomId}`);
      return;
    }

    this.recordingRooms.delete(roomId);
    
    // Generate replay metadata and analytics
    await this.generateReplayMetadata(roomId);
    
    console.log(`Stopped recording for room ${roomId}`);
  }

  /**
   * Check if a room is being recorded
   */
  isRecording(roomId: string): boolean {
    return this.recordingRooms.has(roomId);
  }

  /**
   * Generate replay data for a completed game
   */
  async generateReplay(roomId: string): Promise<GameReplay | null> {
    try {
      // Get room information
      const room = await db.query.gameRooms.findFirst({
        where: eq(gameRooms.id, roomId),
        with: {
          participants: true,
          states: {
            orderBy: asc(gameStates.turn)
          },
          actions: {
            orderBy: asc(gameActions.timestamp)
          }
        }
      });

      if (!room || !room.isCompleted) {
        console.log(`Room ${roomId} not found or not completed`);
        return null;
      }

      // Group actions by turn
      const actionsByTurn: Record<number, typeof room.actions> = {};
      room.actions.forEach(action => {
        if (!actionsByTurn[action.turn]) {
          actionsByTurn[action.turn] = [];
        }
        actionsByTurn[action.turn].push(action);
      });

      // Create replay frames
      const frames: ReplayFrame[] = room.states.map(state => ({
        turn: state.turn,
        timestamp: state.createdAt, // Use createdAt instead of timestamp
        gameState: state,
        actions: actionsByTurn[state.turn] || []
      }));

      // Calculate duration
      const startTime = room.startedAt || room.createdAt;
      const endTime = room.completedAt || new Date();
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

      // Find winner
      const winner = room.participants.find(p => p.finalRank === 1)?.playerName || 'Unknown';

      const replay: GameReplay = {
        id: roomId,
        roomId: roomId,
        roomName: room.name,
        participants: room.participants.map(p => ({
          id: p.id,
          playerName: p.playerName,
          finalRank: p.finalRank || 0,
          finalAssets: p.finalAssets || 0
        })),
        startTime,
        endTime,
        totalTurns: Math.max(...room.states.map(s => s.turn), 0),
        winner,
        frames,
        metadata: {
          gameMode: room.settings?.gameMode || 'standard',
          maxPlayers: room.maxPlayers,
          duration,
          recordingVersion: '1.0'
        }
      };

      return replay;
    } catch (error) {
      console.error(`Error generating replay for room ${roomId}:`, error);
      return null;
    }
  }

  /**
   * Get replay metadata for listing
   */
  async getReplayMetadata(roomId: string): Promise<ReplayMetadata | null> {
    try {
      const room = await db.query.gameRooms.findFirst({
        where: eq(gameRooms.id, roomId),
        with: {
          participants: true,
          actions: true,
          states: true
        }
      });

      if (!room || !room.isCompleted) {
        return null;
      }

      const startTime = room.startedAt || room.createdAt;
      const endTime = room.completedAt || new Date();
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      const winner = room.participants.find(p => p.finalRank === 1)?.playerName || 'Unknown';

      return {
        id: roomId,
        roomId: roomId,
        roomName: room.name,
        gameMode: room.settings?.gameMode || 'standard',
        playerCount: room.participants.length,
        winner,
        duration,
        startTime,
        endTime,
        totalTurns: Math.max(...room.states.map(s => s.turn), 0),
        totalActions: room.actions.length,
        viewCount: 0, // TODO: Implement view tracking
        createdAt: room.createdAt
      };
    } catch (error) {
      console.error(`Error getting replay metadata for room ${roomId}:`, error);
      return null;
    }
  }

  /**
   * Search replays with filters
   */
  async searchReplays(params: ReplaySearchParams): Promise<ReplayMetadata[]> {
    try {
      // Use simpler query with relations
      const rooms = await db.query.gameRooms.findMany({
        where: eq(gameRooms.isCompleted, true),
        with: {
          participants: true,
          states: true,
          actions: true
        },
        orderBy: desc(gameRooms.completedAt),
        limit: params.limit,
        offset: params.offset
      });
      
      const results: ReplayMetadata[] = [];
      
      for (const room of rooms) {
        // Apply filters
        if (params.roomName && !room.name.toLowerCase().includes(params.roomName.toLowerCase())) {
          continue;
        }
        
        if (params.playerName) {
          const hasPlayer = room.participants.some(p => 
            p.playerName.toLowerCase().includes(params.playerName!.toLowerCase())
          );
          if (!hasPlayer) continue;
        }
        
        const startTime = room.startedAt || room.createdAt;
        const endTime = room.completedAt || room.createdAt;
        const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
        const winner = room.participants.find(p => p.finalRank === 1)?.playerName || 'Unknown';
        const totalTurns = room.states.length > 0 ? Math.max(...room.states.map(s => s.turn)) : 0;
        
        results.push({
          id: room.id,
          roomId: room.id,
          roomName: room.name,
          gameMode: (room.settings as any)?.gameMode || 'standard',
          playerCount: room.participants.length,
          winner,
          duration,
          startTime,
          endTime,
          totalTurns,
          totalActions: room.actions.length,
          viewCount: 0,
          createdAt: room.createdAt
        });
      }
      
      return results;
    } catch (error) {
      console.error('Error searching replays:', error);
      return [];
    }
  }

  /**
   * Generate analytics for a replay
   */
  async generateAnalytics(roomId: string): Promise<ReplayAnalytics | null> {
    try {
      const room = await db.query.gameRooms.findFirst({
        where: eq(gameRooms.id, roomId),
        with: {
          participants: true,
          states: {
            orderBy: asc(gameStates.turn)
          },
          actions: {
            orderBy: asc(gameActions.timestamp)
          }
        }
      });

      if (!room || !room.isCompleted) {
        return null;
      }

      // Turn-by-turn statistics
      const turnByTurnStats = room.states.map(state => {
        const gameData = state.gameData as any;
        const companies = state.companies as any[];
        
        return {
          turn: state.turn,
          timestamp: state.createdAt, // Use createdAt instead of timestamp
          companiesActive: companies?.filter(c => c.status === 'active').length || 0,
          totalAssets: companies?.reduce((sum, c) => sum + (c.assets || 0), 0) || 0,
          marketActivity: gameData?.stockMarket?.volatility || 0,
          actionCount: room.actions.filter(a => a.turn === state.turn).length,
          eliminationOccurred: companies?.some(c => c.status === 'bankrupt') || false
        };
      });

      // Player performance analysis
      const playerPerformance = room.participants.map(participant => {
        const playerActions = room.actions.filter(a => a.userId === participant.userId);
        const actionCounts: Record<string, number> = {};
        
        playerActions.forEach(action => {
          actionCounts[action.actionType] = (actionCounts[action.actionType] || 0) + 1;
        });

        // Calculate asset progression
        const assetProgression = room.states.map(state => {
          const companies = state.companies as any[];
          const playerCompany = companies?.find(c => c.playerId === participant.userId?.toString());
          
          return {
            turn: state.turn,
            assets: playerCompany?.assets || 0
          };
        });

        const peakAssets = Math.max(...assetProgression.map(p => p.assets));
        const survivalTime = room.states.length; // Simplified - should calculate actual survival

        return {
          playerId: participant.userId?.toString() || participant.id.toString(),
          playerName: participant.playerName,
          assetProgression,
          actionCounts,
          survivalTime,
          peakAssets,
          finalRank: participant.finalRank || 0
        };
      });

      // Game events detection
      const gameEvents = [];
      for (let i = 1; i < room.states.length; i++) {
        const prevState = room.states[i - 1];
        const currentState = room.states[i];
        
        const prevCompanies = prevState.companies as any[];
        const currentCompanies = currentState.companies as any[];
        
        // Check for eliminations
        if (prevCompanies && currentCompanies) {
          const prevActive = prevCompanies.filter(c => c.status === 'active');
          const currentActive = currentCompanies.filter(c => c.status === 'active');
          
          if (currentActive.length < prevActive.length) {
            const eliminated = prevActive.filter(pc => 
              !currentActive.some(cc => cc.id === pc.id)
            );
            
            eliminated.forEach(company => {
              gameEvents.push({
                turn: currentState.turn,
                timestamp: currentState.createdAt, // Use createdAt instead of timestamp
                eventType: 'elimination' as const,
                description: `${company.name} was eliminated`,
                involvedPlayers: [company.name]
              });
            });
          }
        }

        // Check for victory
        if (i === room.states.length - 1) {
          const winner = room.participants.find(p => p.finalRank === 1);
          if (winner) {
            gameEvents.push({
              turn: currentState.turn,
              timestamp: currentState.createdAt, // Use createdAt instead of timestamp
              eventType: 'victory' as const,
              description: `${winner.playerName} achieved victory`,
              involvedPlayers: [winner.playerName]
            });
          }
        }
      }

      return {
        turnByTurnStats,
        playerPerformance,
        gameEvents
      };
    } catch (error) {
      console.error(`Error generating analytics for room ${roomId}:`, error);
      return null;
    }
  }

  /**
   * Delete old replays to save space
   */
  async cleanupOldReplays(olderThanDays: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    try {
      // Delete old game data
      await db.delete(gameActions).where(
        sql`EXISTS (
          SELECT 1 FROM ${gameRooms} 
          WHERE ${gameRooms.id} = ${gameActions.roomId} 
          AND ${gameRooms.completedAt} < ${cutoffDate}
        )`
      );

      await db.delete(gameStates).where(
        sql`EXISTS (
          SELECT 1 FROM ${gameRooms} 
          WHERE ${gameRooms.id} = ${gameStates.roomId} 
          AND ${gameRooms.completedAt} < ${cutoffDate}
        )`
      );

      console.log(`Cleaned up replays older than ${olderThanDays} days`);
    } catch (error) {
      console.error('Error cleaning up old replays:', error);
    }
  }

  /**
   * Generate replay metadata for a completed game
   */
  private async generateReplayMetadata(roomId: string): Promise<void> {
    try {
      // This is called when recording stops
      // Additional metadata generation logic can be added here
      console.log(`Generated replay metadata for room ${roomId}`);
    } catch (error) {
      console.error(`Error generating replay metadata for room ${roomId}:`, error);
    }
  }
}

export const replayService = ReplayService.getInstance();