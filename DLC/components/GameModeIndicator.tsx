'use client';

import { GameModeConfig, getDifficultyColor, getDifficultyLabel } from '@/lib/game/gameModes';

interface GameModeIndicatorProps {
  gameMode: GameModeConfig;
  className?: string;
}

export function GameModeIndicator({ gameMode, className = '' }: GameModeIndicatorProps) {
  return (
    <div className={`bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-blue-500/30 ${className}`}>
      <div className="flex items-center space-x-3">
        <div className="text-2xl">{gameMode.icon}</div>
        <div>
          <h3 className="text-lg font-semibold text-white">{gameMode.name}</h3>
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-gray-400">难度:</span>
            <span className={`font-semibold ${getDifficultyColor(gameMode.difficulty)}`}>
              {getDifficultyLabel(gameMode.difficulty)}
            </span>
          </div>
        </div>
      </div>
      
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-900/50 rounded p-2">
          <div className="text-gray-400">初始资产</div>
          <div className="text-blue-400 font-semibold">
            ${gameMode.config.startingAssets.toLocaleString()}
          </div>
        </div>
        <div className="bg-slate-900/50 rounded p-2">
          <div className="text-gray-400">保护期</div>
          <div className="text-green-400 font-semibold">
            {gameMode.config.gracePeriod >= 60 
              ? `${Math.floor(gameMode.config.gracePeriod / 60)}分钟` 
              : `${gameMode.config.gracePeriod}秒`}
          </div>
        </div>
        <div className="bg-slate-900/50 rounded p-2">
          <div className="text-gray-400">AI数量</div>
          <div className="text-orange-400 font-semibold">
            {gameMode.config.aiCount}个
          </div>
        </div>
        <div className="bg-slate-900/50 rounded p-2">
          <div className="text-gray-400">AI攻击性</div>
          <div className="text-red-400 font-semibold">
            {gameMode.config.aiAggressiveness}%
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameModeIndicator;