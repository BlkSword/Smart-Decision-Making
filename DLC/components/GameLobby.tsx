  'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSocketClient } from '@/lib/websocket/client';
import type { GameRoom } from '@/lib/game/types';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import GameChat from './GameChat';
import MiniLeaderboard from './MiniLeaderboard';

interface GameLobbyProps {
  onGameStart: (gameState: any) => void;
}

export default function GameLobby({ onGameStart }: GameLobbyProps) {
  const { language, t } = useLanguage();
  const router = useRouter();
  const [socketClient] = useState(() => getSocketClient());
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string>('');
  const [chatMinimized, setChatMinimized] = useState(false);
  const [isPrivateRoom, setIsPrivateRoom] = useState(false);
  const [gamePassword, setGamePassword] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [readyPlayersCount, setReadyPlayersCount] = useState(0);

  useEffect(() => {
    // Set up socket callbacks
    socketClient.setCallbacks({
      onRoomsList: (roomsList) => {
        setRooms(roomsList);
      },
      onRoomJoined: (room) => {
        setCurrentRoom(room);
        setShowCreateRoom(false);
        setError('');
      },
      onRoomLeft: (room) => {
        setCurrentRoom(null);
        socketClient.listRooms(); // Refresh rooms list
      },
      onRoomUpdated: (room) => {
        setCurrentRoom(room);
      },
      onGameStarted: (gameState) => {
        onGameStart(gameState);
      },
      onError: (message) => {
        setError(message);
      }
    });

    // Check connection status
    const checkConnection = () => {
      setIsConnected(socketClient.isConnected());
      if (socketClient.isConnected()) {
        socketClient.listRooms();
      }
    };

    // Connect and start checking
    socketClient.connect();
    checkConnection();

    // Set up periodic connection check
    const interval = setInterval(checkConnection, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [socketClient, onGameStart]);

  const handleCreateRoom = () => {
    if (roomName.trim()) {
      const password = isPrivateRoom ? gamePassword.trim() : undefined;
      socketClient.createRoom(roomName.trim(), maxPlayers, password);
      setRoomName('');
      setGamePassword('');
      setIsPrivateRoom(false);
    }
  };

  const handleJoinRoom = (roomId: string, password?: string) => {
    socketClient.joinRoom(roomId, password);
  };

  const handleSpectateRoom = (roomId: string, password?: string) => {
    // Navigate to spectator page
    router.push(`/spectate/${roomId}`);
  };

  const handleLeaveRoom = () => {
    if (currentRoom) {
      socketClient.leaveRoom(currentRoom.id);
    }
  };

  const handleStartGame = () => {
    if (currentRoom) {
      socketClient.startGame(currentRoom.id);
    }
  };

  const handleUpdatePlayerName = () => {
    if (playerName.trim()) {
      socketClient.updatePlayerName(playerName.trim());
    }
  };

  const handleToggleReady = () => {
    socketClient.toggleReady();
    setIsPlayerReady(!isPlayerReady);
  };

  const isHost = currentRoom?.host === socketClient.getSocketId();
  const canStartGame = isHost && currentRoom && currentRoom.players.length >= 2;
  
  // Update ready players count when room changes
  useEffect(() => {
    if (currentRoom) {
      setReadyPlayersCount(currentRoom.players.filter(p => p.isReady).length);
    }
  }, [currentRoom]);

  return (
    <div className="flex-1 flex items-center justify-center">
      <section className="py-20 text-center w-full">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground tracking-tight sm:text-5xl md:text-6xl mb-2">
              {t.multiplayer.gameTitle}
              <span className="block text-primary">{t.multiplayer.multiplayerLobby}</span>
            </h1>
            <div className="mt-6 flex items-center justify-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-muted-foreground">{isConnected ? t.multiplayer.connected : t.multiplayer.connecting}</span>
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-4 mb-6 text-center">
              <p className="text-destructive">{error}</p>
              <button 
                onClick={() => setError('')}
                className="mt-2 text-destructive hover:text-destructive/80 text-sm"
              >
                {t.multiplayer.dismiss}
              </button>
            </div>
          )}

          {!currentRoom ? (
            // Room selection view
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Available Rooms */}
              <div className="lg:col-span-2 bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border">
                <h2 className="text-2xl font-semibold mb-4 text-foreground">{t.multiplayer.availableRooms}</h2>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {rooms.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">{t.multiplayer.noRoomsAvailable}</p>
                  ) : (
                    rooms.map((room) => (
                      <div 
                        key={room.id} 
                        className="bg-card/30 rounded-lg p-4 border border-border hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-foreground">{room.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {room.players.length}/{room.maxPlayers} {t.multiplayer.players} • {room.spectators?.length || 0} spectators • {t.multiplayer.host}: {room.players.find(p => p.id === room.host)?.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-xs text-green-400">{room.players.filter(p => p.isReady).length} ready</span>
                              </div>
                              {room.isPrivate && (
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                  <span className="text-xs text-yellow-400">Private</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                if (room.isPrivate) {
                                  const password = prompt('Enter room password:');
                                  if (password) handleJoinRoom(room.id, password);
                                } else {
                                  handleJoinRoom(room.id);
                                }
                              }}
                              disabled={room.players.length >= room.maxPlayers}
                              className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed rounded-lg transition-colors text-sm text-primary-foreground"
                            >
                              {room.players.length >= room.maxPlayers ? t.multiplayer.full : t.multiplayer.join}
                            </button>
                            {room.settings?.allowSpectators && (
                              <button
                                onClick={() => {
                                  if (room.isPrivate) {
                                    const password = prompt('Enter room password:');
                                    if (password) handleSpectateRoom(room.id, password);
                                  } else {
                                    handleSpectateRoom(room.id);
                                  }
                                }}
                                disabled={room.spectators?.length >= (room.settings?.maxSpectators || 0)}
                                className="px-3 py-2 bg-secondary hover:bg-secondary/80 disabled:bg-muted disabled:cursor-not-allowed rounded-lg transition-colors text-sm"
                              >
                                👁️ {room.spectators?.length >= (room.settings?.maxSpectators || 0) ? 'Full' : 'Watch'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                <button
                  onClick={() => socketClient.listRooms()}
                  className="w-full mt-4 py-2 px-4 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors text-sm"
                >
                  {t.multiplayer.refresh}
                </button>
              </div>

              {/* Create Room */}
              <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border">
                <h2 className="text-2xl font-semibold mb-4 text-foreground">{t.multiplayer.createRoom}</h2>
              
                {!showCreateRoom ? (
                  <button
                    onClick={() => setShowCreateRoom(true)}
                    className="w-full py-3 px-6 bg-primary hover:bg-primary/90 rounded-lg transition-all transform hover:scale-105 font-semibold text-primary-foreground"
                  >
                    {t.multiplayer.createNewRoom}
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">{t.multiplayer.roomName}</label>
                      <input
                        type="text"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        className="w-full p-3 bg-background border border-border rounded-lg focus:outline-none focus:border-primary text-foreground"
                        placeholder={t.multiplayer.enterRoomName}
                        maxLength={50}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">{t.multiplayer.maxPlayers}</label>
                      <select
                        value={maxPlayers}
                        onChange={(e) => setMaxPlayers(Number(e.target.value))}
                        className="w-full p-3 bg-background border border-border rounded-lg focus:outline-none focus:border-primary text-foreground"
                      >
                        <option value={2}>2 {t.multiplayer.players}</option>
                        <option value={3}>3 {t.multiplayer.players}</option>
                        <option value={4}>4 {t.multiplayer.players}</option>
                        <option value={5}>5 {t.multiplayer.players}</option>
                        <option value={6}>6 {t.multiplayer.players}</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="private-room"
                        checked={isPrivateRoom}
                        onChange={(e) => setIsPrivateRoom(e.target.checked)}
                        className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
                      />
                      <label htmlFor="private-room" className="text-sm font-medium text-foreground">
                        {t.multiplayer.privateRoom}
                      </label>
                    </div>

                    {isPrivateRoom && (
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">{t.multiplayer.password}</label>
                        <input
                          type="password"
                          value={gamePassword}
                          onChange={(e) => setGamePassword(e.target.value)}
                          className="w-full p-3 bg-background border border-border rounded-lg focus:outline-none focus:border-primary text-foreground"
                          placeholder={t.multiplayer.enterPassword}
                          maxLength={30}
                        />
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={handleCreateRoom}
                        disabled={!roomName.trim() || (isPrivateRoom && !gamePassword.trim())}
                        className="flex-1 py-3 px-4 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed rounded-lg transition-colors font-semibold text-primary-foreground"
                      >
                        {t.multiplayer.create}
                      </button>
                      <button
                        onClick={() => setShowCreateRoom(false)}
                        className="flex-1 py-3 px-4 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                      >
                        {t.multiplayer.cancel}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Current room view
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Room Info */}
              <div className="lg:col-span-2 bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-foreground">{currentRoom.name}</h2>
                  <button
                    onClick={handleLeaveRoom}
                    className="px-4 py-2 bg-destructive hover:bg-destructive/90 rounded-lg transition-colors text-sm text-destructive-foreground"
                  >
                    {t.multiplayer.leaveRoom}
                  </button>
                </div>

                {/* Players List */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground">
                    {t.multiplayer.players} ({currentRoom.players.length}/{currentRoom.maxPlayers})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentRoom.players.map((player) => (
                      <div key={player.id} className="bg-card/30 rounded-lg p-3 border border-border">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${player.isReady ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className="font-medium text-foreground">{player.name}</span>
                            {player.id === currentRoom.host && (
                              <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">HOST</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Player Controls */}
                <div className="mt-6 flex items-center gap-4">
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="flex-1 p-3 bg-background border border-border rounded-lg focus:outline-none focus:border-primary text-foreground"
                    placeholder={t.multiplayer.enterPlayerName}
                    maxLength={20}
                  />
                  <button
                    onClick={handleUpdatePlayerName}
                    disabled={!playerName.trim()}
                    className="px-4 py-3 bg-secondary hover:bg-secondary/80 disabled:bg-muted disabled:cursor-not-allowed rounded-lg transition-colors text-sm"
                  >
                    {t.multiplayer.updateName}
                  </button>
                  <button
                    onClick={handleToggleReady}
                    className={`px-6 py-3 rounded-lg transition-colors text-sm font-medium ${
                      isPlayerReady 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'bg-gray-600 hover:bg-gray-700 text-white'
                    }`}
                  >
                    {isPlayerReady ? '✓ Ready' : 'Not Ready'}
                  </button>
                </div>
              </div>

              {/* Game controls */}
              <div className="flex justify-center">
                {isHost ? (
                  <div className="text-center">
                    <button
                      onClick={handleStartGame}
                      disabled={!canStartGame}
                      className="px-8 py-4 bg-green-600 hover:bg-green-700 disabled:bg-muted disabled:cursor-not-allowed rounded-lg transition-all transform hover:scale-105 font-semibold text-lg text-white"
                    >
                      {canStartGame ? t.multiplayer.startGame : `Waiting for players (${readyPlayersCount}/${currentRoom.players.length} ready)`}
                    </button>
                    {currentRoom.players.length >= 2 && readyPlayersCount < currentRoom.players.length && (
                      <p className="text-yellow-500 text-sm mt-2">
                        ⚠️ All players must be ready to start
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center">{t.multiplayer.waitingForHost}</p>
                )}
              </div>

              {/* Game info */}
              <div className="mt-6 text-center text-sm text-muted-foreground">
                <p>{t.multiplayer.gameWillStart}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Chat System - only show when in a room */}
        {currentRoom && (
          <GameChat
            roomId={currentRoom.id}
            isMinimized={chatMinimized}
            onToggleMinimize={() => setChatMinimized(!chatMinimized)}
            className={chatMinimized ? '' : 'fixed bottom-4 right-4 w-80 h-96 z-50'}
          />
        )}
      </section>
    </div>
  );
}