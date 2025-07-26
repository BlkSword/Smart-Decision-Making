"use client";

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface EliminationCountdownProps {
  gameStartTime: number | null;
  gracePeriod: number;
  eliminationEnabled: boolean;
}

export const EliminationCountdown: React.FC<EliminationCountdownProps> = ({
  gameStartTime,
  gracePeriod,
  eliminationEnabled
}) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const { t } = useLanguage();

  useEffect(() => {
    if (eliminationEnabled || !gameStartTime) return;

    const updateCountdown = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - gameStartTime;
      const remaining = Math.max(0, gracePeriod - elapsed);
      setTimeLeft(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [gameStartTime, gracePeriod, eliminationEnabled]);

  const formatTime = (milliseconds: number): string => {
    const minutes = Math.floor(milliseconds / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = (): number => {
    if (!gameStartTime) return 0;
    const elapsed = Date.now() - gameStartTime;
    return Math.min(100, (elapsed / gracePeriod) * 100);
  };

  if (eliminationEnabled) {
    return (
      <div className="bg-gradient-to-r from-red-900/30 via-red-800/20 to-red-900/30 backdrop-blur-sm border border-red-500/30 rounded-lg p-3">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse shadow-lg shadow-red-400/50"></div>
          <span className="text-red-300 font-medium text-sm">
            ⚠️ {t.competition.eliminationActivated}
          </span>
        </div>
        <div className="mt-1 text-xs text-red-400/80">
          {t.competition.assetsZeroEliminated}
        </div>
      </div>
    );
  }
  
  if (!gameStartTime) {
    return (
      <div className="bg-gradient-to-r from-blue-900/30 via-blue-800/20 to-blue-900/30 backdrop-blur-sm border border-blue-500/30 rounded-lg p-3">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse shadow-lg shadow-blue-400/50"></div>
          <span className="text-blue-300 font-medium text-sm">
            🛡️ {t.competition.safetyPeriod}
          </span>
        </div>
        <div className="mt-1 text-xs text-blue-400/80">
          准备中...
        </div>
      </div>
    );
  }

  const progressPercentage = getProgressPercentage();
  const isWarning = progressPercentage > 70;
  const isCritical = progressPercentage > 90;

  return (
    <div className={`
      bg-gradient-to-r backdrop-blur-sm border rounded-lg p-3 transition-colors duration-500
      ${isCritical 
        ? 'from-red-900/40 via-red-800/30 to-red-900/40 border-red-500/40' 
        : isWarning 
        ? 'from-yellow-900/40 via-amber-800/30 to-yellow-900/40 border-yellow-500/40'
        : 'from-blue-900/30 via-blue-800/20 to-blue-900/30 border-blue-500/30'
      }
    `}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className={`
            w-3 h-3 rounded-full shadow-lg animate-pulse
            ${isCritical 
              ? 'bg-red-400 shadow-red-400/50' 
              : isWarning 
              ? 'bg-yellow-400 shadow-yellow-400/50'
              : 'bg-blue-400 shadow-blue-400/50'
            }
          `}></div>
          <span className={`
            font-medium text-sm
            ${isCritical ? 'text-red-300' : isWarning ? 'text-yellow-300' : 'text-blue-300'}
          `}>
            {isCritical ? `⚠️ ${t.competition.aboutToActivate}` : isWarning ? `🔸 ${t.competition.preparingElimination}` : `🛡️ ${t.competition.safetyPeriod}`}
          </span>
        </div>
        <div className={`
          text-sm font-mono font-bold
          ${isCritical ? 'text-red-200' : isWarning ? 'text-yellow-200' : 'text-blue-200'}
        `}>
          {formatTime(timeLeft)}
        </div>
      </div>
      
      {/* 进度条 */}
      <div className="relative w-full h-2 bg-gray-800/50 rounded-full overflow-hidden">
        <div 
          className={`
            h-full transition-all duration-1000 ease-out
            ${isCritical 
              ? 'bg-gradient-to-r from-red-500 to-red-400' 
              : isWarning 
              ? 'bg-gradient-to-r from-yellow-500 to-amber-400'
              : 'bg-gradient-to-r from-blue-500 to-cyan-400'
            }
          `}
          style={{ width: `${progressPercentage}%` }}
        >
          <div className="h-full w-full bg-white/20 animate-shimmer"></div>
        </div>
      </div>
      
      <div className="mt-2 text-xs opacity-70 space-y-1">
        <div className={isCritical ? 'text-red-400/80' : isWarning ? 'text-yellow-400/80' : 'text-blue-400/80'}>
          {timeLeft > 0 ? t.competition.timeRemaining : t.competition.aboutToActivate}
        </div>
        <div className="text-orange-400/80 font-medium">
          ⚠️ 注意：资产为0的公司会立即被淘汰（不受保护期限制）
        </div>
      </div>
    </div>
  );
};

export default EliminationCountdown;