import { useState, useEffect } from 'react';
import { GameState } from './types';

export function useGamePersistence(roomId: string) {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  /**
   * Save game state to database
   */
  const saveGameState = async (gameState: GameState): Promise<boolean> => {
    if (!roomId) {
      setError('Room ID is required');
      return false;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/game/state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomId, gameState }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save game state');
      }

      setLastSaved(new Date());
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save game state';
      setError(errorMessage);
      console.error('Error saving game state:', err);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Load game state from database
   */
  const loadGameState = async (): Promise<GameState | null> => {
    if (!roomId) {
      setError('Room ID is required');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/game/state?roomId=${encodeURIComponent(roomId)}`);

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Game state not found, not an error
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load game state');
      }

      const data = await response.json();
      return data.gameState;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load game state';
      setError(errorMessage);
      console.error('Error loading game state:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get player statistics
   */
  const getPlayerStatistics = async (userId: number) => {
    try {
      const response = await fetch(`/api/game/statistics?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to get player statistics');
      }

      const data = await response.json();
      return data.statistics;
    } catch (err) {
      console.error('Error getting player statistics:', err);
      return null;
    }
  };

  /**
   * Update player statistics
   */
  const updatePlayerStatistics = async (userId: number, updates: any) => {
    try {
      const response = await fetch('/api/game/statistics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, updates }),
      });

      if (!response.ok) {
        throw new Error('Failed to update player statistics');
      }

      return true;
    } catch (err) {
      console.error('Error updating player statistics:', err);
      return false;
    }
  };

  /**
   * Clear any errors
   */
  const clearError = () => {
    setError(null);
  };

  return {
    // State
    isSaving,
    isLoading,
    error,
    lastSaved,

    // Actions
    saveGameState,
    loadGameState,
    getPlayerStatistics,
    updatePlayerStatistics,
    clearError,
  };
}

export default useGamePersistence;