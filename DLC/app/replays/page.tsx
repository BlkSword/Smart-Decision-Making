'use client';

import { useState, useEffect } from 'react';
import { GameReplay } from '@/lib/game/replayTypes';
import ReplayBrowser from '@/components/ReplayBrowser';
import ReplayPlayer from '@/components/ReplayPlayer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, ArrowLeft } from 'lucide-react';

type ViewMode = 'browser' | 'player';

export default function ReplaysPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('browser');
  const [currentReplay, setCurrentReplay] = useState<GameReplay | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handlePlayReplay = async (replayId: string) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/replays/${replayId}`);
      const data = await response.json();
      
      if (data.success) {
        setCurrentReplay(data.replay);
        setViewMode('player');
      } else {
        setError(data.error || 'Failed to load replay');
      }
    } catch (err) {
      setError('Failed to load replay');
      console.error('Error loading replay:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClosePlayer = () => {
    setCurrentReplay(null);
    setViewMode('browser');
  };

  const handleCloseBrowser = () => {
    window.history.back();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mb-4"></div>
          <p className="text-white text-xl font-mono">LOADING_REPLAY...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl font-mono mb-4">[ERROR]</div>
          <p className="text-white font-mono mb-4">{error}</p>
          <Button
            onClick={() => setError('')}
            variant="outline"
            className="bg-black text-white border-white hover:bg-white hover:text-black"
          >
            [RETRY]
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {viewMode === 'browser' && (
        <ReplayBrowser
          onPlayReplay={handlePlayReplay}
          onClose={handleCloseBrowser}
          showAnalytics={true}
        />
      )}
      
      {viewMode === 'player' && currentReplay && (
        <ReplayPlayer
          replay={currentReplay}
          onClose={handleClosePlayer}
          showAnalytics={true}
        />
      )}
    </div>
  );
}