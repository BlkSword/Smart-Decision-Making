'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { GameReplay, ReplayPlaybackState, ReplayControls } from '@/lib/game/replayTypes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  Square, 
  SkipBack, 
  SkipForward, 
  FastForward,
  Rewind,
  Clock,
  Users,
  Trophy,
  Target,
  BarChart3,
  Eye
} from 'lucide-react';

interface ReplayPlayerProps {
  replay: GameReplay;
  onClose: () => void;
  showAnalytics?: boolean;
}

export default function ReplayPlayer({ replay, onClose, showAnalytics = false }: ReplayPlayerProps) {
  const [playbackState, setPlaybackState] = useState<ReplayPlaybackState>({
    currentFrame: 0,
    isPlaying: false,
    playbackSpeed: 1.0,
    isPaused: false,
    totalFrames: replay.frames.length,
    autoAdvance: true
  });

  const [showControls, setShowControls] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate playback interval based on speed
  const getPlaybackInterval = useCallback(() => {
    return Math.max(100, 1000 / playbackState.playbackSpeed);
  }, [playbackState.playbackSpeed]);

  // Replay controls
  const controls: ReplayControls = {
    play: () => {
      setPlaybackState(prev => ({ ...prev, isPlaying: true, isPaused: false }));
    },
    pause: () => {
      setPlaybackState(prev => ({ ...prev, isPlaying: false, isPaused: true }));
    },
    stop: () => {
      setPlaybackState(prev => ({ 
        ...prev, 
        isPlaying: false, 
        isPaused: false, 
        currentFrame: 0 
      }));
    },
    nextFrame: () => {
      setPlaybackState(prev => ({
        ...prev,
        currentFrame: Math.min(prev.currentFrame + 1, prev.totalFrames - 1)
      }));
    },
    previousFrame: () => {
      setPlaybackState(prev => ({
        ...prev,
        currentFrame: Math.max(prev.currentFrame - 1, 0)
      }));
    },
    jumpToFrame: (frameNumber: number) => {
      setPlaybackState(prev => ({
        ...prev,
        currentFrame: Math.max(0, Math.min(frameNumber, prev.totalFrames - 1))
      }));
    },
    setPlaybackSpeed: (speed: number) => {
      setPlaybackState(prev => ({ ...prev, playbackSpeed: speed }));
    },
    jumpToTurn: (turn: number) => {
      const frameIndex = replay.frames.findIndex(f => f.turn === turn);
      if (frameIndex !== -1) {
        controls.jumpToFrame(frameIndex);
      }
    }
  };

  // Auto-advance frames when playing
  useEffect(() => {
    if (playbackState.isPlaying && playbackState.autoAdvance) {
      intervalRef.current = setInterval(() => {
        setPlaybackState(prev => {
          if (prev.currentFrame >= prev.totalFrames - 1) {
            // Reached the end
            return { ...prev, isPlaying: false, isPaused: false };
          }
          return { ...prev, currentFrame: prev.currentFrame + 1 };
        });
      }, getPlaybackInterval());
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [playbackState.isPlaying, playbackState.autoAdvance, getPlaybackInterval]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (playbackState.isPlaying) {
            controls.pause();
          } else {
            controls.play();
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          controls.nextFrame();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          controls.previousFrame();
          break;
        case 'Home':
          e.preventDefault();
          controls.jumpToFrame(0);
          break;
        case 'End':
          e.preventDefault();
          controls.jumpToFrame(playbackState.totalFrames - 1);
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playbackState.isPlaying, playbackState.totalFrames, controls, onClose]);

  const currentFrame = replay.frames[playbackState.currentFrame];
  const currentGameState = currentFrame?.gameState;
  const currentActions = currentFrame?.actions || [];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const progress = playbackState.totalFrames > 0 ? (playbackState.currentFrame / (playbackState.totalFrames - 1)) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col font-mono">
      {/* Header */}
      <div className="bg-gray-900 border-b border-white/20 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="bg-black text-white border-white">
            <Eye className="w-4 h-4 mr-1" />
            REPLAY
          </Badge>
          <div>
            <h1 className="text-xl font-bold text-white">[{replay.roomName}]</h1>
            <p className="text-sm text-gray-400">
              {formatDate(replay.startTime)} • {formatTime(replay.metadata.duration)} • {replay.participants.length} players
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowStats(!showStats)}
            className="text-white hover:bg-white hover:text-black"
          >
            <BarChart3 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white hover:text-black"
          >
            [CLOSE]
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Game view */}
        <div className="flex-1 flex flex-col">
          {/* Game state display */}
          <div className="flex-1 p-4">
            <Card className="bg-gray-900 border-white/20 h-full">
              <CardHeader>
                <CardTitle className="text-white font-mono flex items-center justify-between">
                  <span>[TURN_{currentFrame?.turn || 0}]</span>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">
                      {currentFrame ? formatDate(currentFrame.timestamp) : 'No Data'}
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Game map placeholder */}
                <div className="bg-black rounded-lg h-64 flex items-center justify-center border border-white/20">
                  <p className="text-gray-400">GAME_MAP_RENDERER</p>
                </div>

                {/* Current actions */}
                {currentActions.length > 0 && (
                  <div>
                    <h3 className="text-white font-mono mb-2">[ACTIONS_THIS_TURN]</h3>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {currentActions.map((action, index) => (
                        <div key={index} className="text-sm text-gray-300 bg-gray-800 p-2 rounded">
                          <span className="text-yellow-400">{action.actionType}</span>
                          <span className="text-gray-400 ml-2">
                            {formatDate(action.timestamp)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Company status */}
                {currentGameState && (
                  <div>
                    <h3 className="text-white font-mono mb-2">[COMPANY_STATUS]</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {(currentGameState.companies as any[])?.map((company, index) => (
                        <div key={index} className="bg-gray-800 p-2 rounded border border-white/20">
                          <div className="flex items-center justify-between">
                            <span className="text-white font-bold">{company.name}</span>
                            <Badge variant={company.status === 'active' ? 'default' : 'destructive'}>
                              {company.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-400">
                            Assets: ${company.assets?.toLocaleString() || 0}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <div className="bg-gray-900 border-t border-white/20 p-4">
            <div className="space-y-4">
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Frame {playbackState.currentFrame + 1} of {playbackState.totalFrames}</span>
                  <span>Turn {currentFrame?.turn || 0}</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {/* Control buttons */}
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={controls.stop}
                  className="bg-black text-white border-white hover:bg-white hover:text-black"
                >
                  <Square className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={controls.previousFrame}
                  className="bg-black text-white border-white hover:bg-white hover:text-black"
                >
                  <SkipBack className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={playbackState.isPlaying ? controls.pause : controls.play}
                  className="bg-black text-white border-white hover:bg-white hover:text-black px-6"
                >
                  {playbackState.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={controls.nextFrame}
                  className="bg-black text-white border-white hover:bg-white hover:text-black"
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-sm text-gray-400">Speed:</span>
                  {[0.5, 1, 2, 4].map(speed => (
                    <Button
                      key={speed}
                      variant={playbackState.playbackSpeed === speed ? "default" : "outline"}
                      size="sm"
                      onClick={() => controls.setPlaybackSpeed(speed)}
                      className="bg-black text-white border-white hover:bg-white hover:text-black"
                    >
                      {speed}x
                    </Button>
                  ))}
                </div>
              </div>

              {/* Keyboard shortcuts */}
              <div className="text-xs text-gray-500 text-center">
                SPACE: Play/Pause • ←/→: Frame by frame • HOME/END: Jump to start/end • ESC: Close
              </div>
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div className="w-80 bg-gray-900 border-l border-white/20 p-4 overflow-y-auto">
          {/* Game info */}
          <Card className="bg-gray-800 border-white/20 mb-4">
            <CardHeader>
              <CardTitle className="text-white font-mono text-sm">
                [GAME_INFO]
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Duration:</span>
                  <span className="text-white">{formatTime(replay.metadata.duration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Turns:</span>
                  <span className="text-white">{replay.totalTurns}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Players:</span>
                  <span className="text-white">{replay.participants.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Winner:</span>
                  <span className="text-yellow-400">{replay.winner}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Players */}
          <Card className="bg-gray-800 border-white/20">
            <CardHeader>
              <CardTitle className="text-white font-mono text-sm">
                [FINAL_RANKINGS]
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {replay.participants
                  .sort((a, b) => a.finalRank - b.finalRank)
                  .map((participant, index) => (
                    <div key={participant.id} className="flex items-center justify-between p-2 rounded bg-gray-700">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm">#{participant.finalRank}</span>
                        <span className="text-white">{participant.playerName}</span>
                      </div>
                      <span className="text-green-400 text-sm">
                        ${participant.finalAssets.toLocaleString()}
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}