'use client';

import { useState } from 'react';
import GameChat from '@/components/GameChat';
import { Button } from '@/components/ui/button';

export default function TestChatPage() {
  const [roomId, setRoomId] = useState('single-player');
  const [chatMinimized, setChatMinimized] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black-900 to-slate-800 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
          Chat System Test
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Test Controls */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-blue-500/30">
              <h2 className="text-xl font-semibold text-blue-300 mb-4">Test Controls</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Room ID
                  </label>
                  <input
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-blue-500/30 rounded text-white"
                    placeholder="Enter room ID"
                  />
                </div>
                
                <Button
                  onClick={() => setChatMinimized(!chatMinimized)}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {chatMinimized ? 'Show Chat' : 'Hide Chat'}
                </Button>
                
                <div className="text-sm text-gray-400">
                  <p>• Use "single-player" for single-player mode</p>
                  <p>• Use a valid room UUID for multiplayer</p>
                  <p>• Chat messages appear in real-time</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Chat System */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-blue-500/30">
              <GameChat
                roomId={roomId}
                isMinimized={chatMinimized}
                onToggleMinimize={() => setChatMinimized(!chatMinimized)}
                className="h-96"
              />
            </div>
          </div>
        </div>
        
        {/* Instructions */}
        <div className="mt-8 bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-blue-500/30">
          <h2 className="text-xl font-semibold text-blue-300 mb-4">How to Test</h2>
          <div className="text-gray-300 space-y-2">
            <p>1. <strong>Single-player mode:</strong> Leave the room ID as "single-player" and test typing messages</p>
            <p>2. <strong>Multiplayer mode:</strong> Open multiple browser tabs/windows and use the same room UUID</p>
            <p>3. <strong>Real-time testing:</strong> Messages should appear instantly across all connected clients</p>
            <p>4. <strong>System messages:</strong> Join/leave events will appear as system messages</p>
          </div>
        </div>
      </div>
    </div>
  );
}