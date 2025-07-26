'use client';

import { useState, useEffect, useRef } from 'react';
import { getSocketClient } from '@/lib/websocket/client';
import { Send, Users, X, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  messageType: 'chat' | 'system' | 'action';
  timestamp: Date;
}

interface GameChatProps {
  roomId: string;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  className?: string;
}

export default function GameChat({ 
  roomId, 
  isMinimized = false, 
  onToggleMinimize,
  className = ''
}: GameChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [socketClient] = useState(() => getSocketClient());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Set up socket callbacks for chat
    socketClient.setCallbacks({
      onChatMessage: (message: ChatMessage) => {
        setMessages(prev => [...prev, {
          ...message,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          timestamp: new Date(message.timestamp)
        }]);
      },
      onRoomJoined: (room) => {
        // Add system message when someone joins
        const systemMessage: ChatMessage = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          playerId: 'system',
          playerName: 'System',
          message: `${room.players?.find(p => p.id === socketClient.getSocketId())?.name || 'Player'} joined the game`,
          messageType: 'system',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, systemMessage]);
      },
      onPlayerLeft: (playerId: string, playerName: string) => {
        const systemMessage: ChatMessage = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          playerId: 'system',
          playerName: 'System',
          message: `${playerName} left the game`,
          messageType: 'system',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, systemMessage]);
      },
      onGameStarted: (gameState) => {
        const systemMessage: ChatMessage = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          playerId: 'system',
          playerName: 'System',
          message: 'Game started! Good luck everyone!',
          messageType: 'system',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, systemMessage]);
      }
    });

    // Check connection status
    const checkConnection = () => {
      setIsConnected(socketClient.isConnected());
    };

    checkConnection();
    const interval = setInterval(checkConnection, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [socketClient, roomId]);

  const sendMessage = () => {
    if (currentMessage.trim() && isConnected && roomId) {
      socketClient.sendMessage(roomId, currentMessage.trim());
      setCurrentMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getMessageStyle = (messageType: string) => {
    switch (messageType) {
      case 'system':
        return 'text-yellow-300 italic text-sm';
      case 'action':
        return 'text-blue-300 italic text-sm';
      default:
        return 'text-white';
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date);
  };

  if (isMinimized) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <Button
          onClick={onToggleMinimize}
          className="bg-blue-600/90 hover:bg-blue-700/90 backdrop-blur-sm text-white p-3 rounded-full shadow-lg"
          size="sm"
        >
          <MessageCircle className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className={`bg-slate-800/95 backdrop-blur-sm rounded-lg border border-blue-500/30 flex flex-col ${className}`}>
      {/* Chat Header */}
      <div className="flex items-center justify-between p-3 border-b border-blue-500/30">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-400" />
          <span className="text-blue-300 font-medium">游戏聊天</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-xs text-gray-400">
            {isConnected ? '已连接' : '连接中...'}
          </span>
          {onToggleMinimize && (
            <Button
              onClick={onToggleMinimize}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 max-h-64">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">还没有消息...</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {formatTime(msg.timestamp)}
                </span>
                {msg.messageType === 'chat' && (
                  <span className="text-xs font-medium text-blue-300">
                    {msg.playerName}:
                    {isSpectator && msg.playerId === socketClient.getSocketId() && (
                      <span className="text-gray-400 ml-1">(spectator)</span>
                    )}
                  </span>
                )}
              </div>
              <div className={`pl-2 ${getMessageStyle(msg.messageType)}`}>
                {msg.message}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-3 border-t border-blue-500/30">
        <div className="flex gap-2">
          <Input
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入消息..."
            className="flex-1 bg-slate-700/50 border-blue-500/30 text-white placeholder-gray-400 focus:border-blue-400"
            disabled={!isConnected}
            maxLength={500}
          />
          <Button
            onClick={sendMessage}
            disabled={!currentMessage.trim() || !isConnected}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3"
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          按 Enter 发送消息
        </div>
      </div>
    </div>
  );
}