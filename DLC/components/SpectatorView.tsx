'use client';

import { useState, useEffect } from 'react';
import { getSocketClient } from '@/lib/websocket/client';
import type { GameRoom, GameState } from '@/lib/game/types';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import GameChat from './GameChat';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Users, Trophy, DollarSign } from 'lucide-react';

interface SpectatorViewProps {
  roomId: string;
  onLeave: () => void;
}

export default function SpectatorView({ roomId, onLeave }: SpectatorViewProps) {
  const { t } = useLanguage();
  const [socketClient] = useState(() => getSocketClient());
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string>('');
  const [chatMinimized, setChatMinimized] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

  useEffect(() => {
    // Set up socket callbacks
    socketClient.setCallbacks({
      onRoomJoined: (room) => {
        setRoom(room);
        setGameState(room.gameState);
        setError('');
      },
      onRoomUpdated: (room) => {
        setRoom(room);
      },
      onGameStateUpdated: (gameState) => {
        setGameState(gameState);
      },
      onGameStarted: (gameState) => {
        setGameState(gameState);
      },
      onGameEnded: (winner) => {
        // Game ended, show winner
        console.log('Game ended, winner:', winner);
      },
      onPlayerEliminated: (playerId) => {
        // Player eliminated, update UI
        console.log('Player eliminated:', playerId);
      },
      onSpectatorJoined: (spectatorId, spectatorName) => {
        console.log('Spectator joined:', spectatorName);
      },
      onSpectatorLeft: (spectatorId, spectatorName) => {
        console.log('Spectator left:', spectatorName);
      },
      onError: (message) => {
        setError(message);
      }
    });

    // Check connection and join as spectator
    const checkConnection = () => {
      setIsConnected(socketClient.isConnected());
      if (socketClient.isConnected() && !room) {
        socketClient.joinAsSpectator(roomId);
      }
    };

    socketClient.connect();
    checkConnection();

    const interval = setInterval(checkConnection, 1000);

    return () => {
      clearInterval(interval);
      if (room) {
        socketClient.leaveAsSpectator(roomId);
      }
    };
  }, [socketClient, roomId, room]);

  const handleLeave = () => {
    if (room) {
      socketClient.leaveAsSpectator(roomId);
    }
    onLeave();
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mb-4"></div>
          <p className="text-white text-xl font-mono">CONNECTING...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl font-mono mb-4">[ERROR]</div>
          <p className="text-white font-mono">{error}</p>
          <Button 
            onClick={handleLeave}
            className="mt-4 bg-white text-black hover:bg-gray-200 font-mono"
          >
            [RETURN_TO_LOBBY]
          </Button>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-white text-xl font-mono">LOADING_ROOM...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      {/* Header */}
      <div className="bg-gray-900 border-b border-white/20 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="bg-black text-white border-white">
              <Eye className="w-4 h-4 mr-1" />
              SPECTATOR_MODE
            </Badge>
            <h1 className="text-2xl font-bold">[{room.name}]</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{room.players.length} PLAYERS</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span>{room.spectators.length} SPECTATORS</span>
            </div>
            <Button 
              onClick={handleLeave}
              variant="outline"
              className="bg-black text-white border-white hover:bg-white hover:text-black"
            >
              [LEAVE]
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Game View */}
          <div className="lg:col-span-3 space-y-4">
            {/* Game Status */}
            <Card className="bg-gray-900 border-white/20">
              <CardHeader>
                <CardTitle className="text-white font-mono">
                  [GAME_STATUS]
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {room.isStarted ? 'ACTIVE' : 'WAITING'}
                    </div>
                    <div className="text-sm text-gray-400">STATUS</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      {gameState?.currentTurn || 0}
                    </div>
                    <div className="text-sm text-gray-400">TURN</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">
                      {gameState?.companies.filter(c => c.status === 'active').length || 0}
                    </div>
                    <div className="text-sm text-gray-400">ACTIVE_COMPANIES</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">
                      {gameState?.companies.filter(c => c.status === 'bankrupt').length || 0}
                    </div>
                    <div className="text-sm text-gray-400">ELIMINATED</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Game Map */}
            <Card className="bg-gray-900 border-white/20">
              <CardHeader>
                <CardTitle className="text-white font-mono">
                  [GAME_MAP]
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-black rounded-lg h-96 flex items-center justify-center border border-white/20">
                  <p className="text-gray-400 font-mono">MAP_RENDERER_PLACEHOLDER</p>
                </div>
              </CardContent>
            </Card>

            {/* Company Rankings */}
            {gameState && (
              <Card className="bg-gray-900 border-white/20">
                <CardHeader>
                  <CardTitle className="text-white font-mono">
                    [COMPANY_RANKINGS]
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {gameState.companies
                      .sort((a, b) => b.assets - a.assets)
                      .map((company, index) => (
                        <div 
                          key={company.id}
                          className={`flex items-center justify-between p-3 rounded border ${
                            selectedCompany === company.id 
                              ? 'border-white bg-gray-800' 
                              : 'border-white/20 hover:border-white/40'
                          } cursor-pointer transition-colors`}
                          onClick={() => setSelectedCompany(
                            selectedCompany === company.id ? null : company.id
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Trophy className="w-4 h-4 text-yellow-400" />
                              <span className="text-sm">#{index + 1}</span>
                            </div>
                            <div 
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: company.color }}
                            />
                            <span className="font-bold">{company.name}</span>
                            <Badge 
                              variant={company.status === 'active' ? 'default' : 'destructive'}
                              className="text-xs"
                            >
                              {company.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4 text-green-400" />
                              <span className="text-green-400 font-bold">
                                {company.assets.toLocaleString()}
                              </span>
                            </div>
                            <div className="text-sm text-gray-400">
                              {company.employees} EMP
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            {/* Players List */}
            <Card className="bg-gray-900 border-white/20">
              <CardHeader>
                <CardTitle className="text-white font-mono text-sm">
                  [PLAYERS]
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {room.players.map((player) => (
                    <div 
                      key={player.id}
                      className="flex items-center justify-between p-2 rounded border border-white/20"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          player.isOnline ? 'bg-green-400' : 'bg-red-400'
                        }`} />
                        <span className="text-sm">{player.name}</span>
                      </div>
                      {player.id === room.host && (
                        <Badge variant="outline" className="text-xs">
                          HOST
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Spectators List */}
            <Card className="bg-gray-900 border-white/20">
              <CardHeader>
                <CardTitle className="text-white font-mono text-sm">
                  [SPECTATORS]
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {room.spectators.map((spectator) => (
                    <div 
                      key={spectator.id}
                      className="flex items-center gap-2 p-2 rounded border border-white/20"
                    >
                      <Eye className="w-3 h-3 text-gray-400" />
                      <span className="text-sm">{spectator.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Chat */}
            <Card className="bg-gray-900 border-white/20">
              <CardHeader>
                <CardTitle className="text-white font-mono text-sm flex items-center justify-between">
                  [CHAT]
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setChatMinimized(!chatMinimized)}
                    className="text-white hover:bg-white hover:text-black"
                  >
                    {chatMinimized ? '▲' : '▼'}
                  </Button>
                </CardTitle>
              </CardHeader>
              {!chatMinimized && (
                <CardContent>
                  <GameChat 
                    roomId={roomId}
                    isSpectator={true}
                    className="h-64"
                  />
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}