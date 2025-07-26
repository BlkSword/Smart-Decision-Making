'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { gameModes, GameModeConfig, getDifficultyColor, getDifficultyLabel } from '@/lib/game/gameModes';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function GameModePage() {
  const [selectedMode, setSelectedMode] = useState<GameModeConfig | null>(null);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [customConfig, setCustomConfig] = useState({
    startingAssets: 1000000,
    gracePeriod: 300,
    aiCount: 3,
    aiAggressiveness: 50,
    aiDecisionDelay: 50,
    economicVolatility: 50,
    stockMarketVariability: 50,
    allowSpectators: false,
    maxPlayers: 4,
    enablePowerUps: false,
    specialRules: []
  });
  const router = useRouter();
  const { t } = useLanguage();

  const handleModeSelect = (mode: GameModeConfig) => {
    setSelectedMode(mode);
    
    if (mode.id === 'custom') {
      setIsCustomizing(true);
    } else {
      // 保存选择的模式到localStorage
      localStorage.setItem('selectedGameMode', JSON.stringify(mode));
      // 跳转到游戏页面
      router.push('/game');
    }
  };

  const handleCustomStart = () => {
    if (selectedMode) {
      // 创建自定义模式配置
      const customMode = {
        ...selectedMode,
        config: customConfig
      };
      localStorage.setItem('selectedGameMode', JSON.stringify(customMode));
      router.push('/game');
    }
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  const handleBackToModes = () => {
    setIsCustomizing(false);
    setSelectedMode(null);
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* 科技感网格背景 */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:50px_50px] opacity-20"></div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] opacity-30"></div>
      
      {/* 主要内容 */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* 头部 */}
        <div className="text-center mb-12">
          <div className="absolute top-4 left-4 flex space-x-2">
            <button
              onClick={handleBackToHome}
              className="px-4 py-2 bg-gray-900/50 hover:bg-gray-800/50 border border-gray-600 hover:border-gray-500 transition-colors text-white font-mono text-sm"
            >
              [← HOME]
            </button>
            <button
              onClick={() => router.push('/multiplayer')}
              className="px-4 py-2 bg-gray-900/50 hover:bg-gray-800/50 border border-gray-600 hover:border-gray-500 transition-colors text-white font-mono text-sm"
            >
              [MULTIPLAYER]
            </button>
          </div>
          
          <h1 className="text-5xl font-bold text-white font-mono tracking-wider mb-4">
            <span className="border-l-4 border-white pl-4">SELECT GAME MODE</span>
          </h1>
          <p className="text-gray-300 text-lg font-mono">
            [ CHOOSE YOUR EXPERIENCE ]
          </p>
        </div>

        {!isCustomizing ? (
          // 模式选择界面
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {gameModes.map((mode) => (
              <div
                key={mode.id}
                onClick={() => handleModeSelect(mode)}
                className="relative group cursor-pointer transition-all duration-300 hover:scale-105"
              >
                <div 
                  className="bg-gray-900/50 border border-gray-600 hover:border-gray-400 p-8 transition-all duration-300 group-hover:bg-gray-800/50"
                  style={{
                    clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))'
                  }}
                >
                  {/* 模式图标和标题 */}
                  <div className="flex items-center mb-6">
                    <div className="text-6xl mr-4 filter grayscale">{mode.icon}</div>
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-2 font-mono tracking-wider">{mode.name}</h3>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-400 font-mono text-sm">DIFFICULTY:</span>
                        <span className="font-semibold text-white font-mono text-sm border border-gray-500 px-2 py-1">
                          [{getDifficultyLabel(mode.difficulty).toUpperCase()}]
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 模式描述 */}
                  <p className="text-gray-400 mb-6 text-base leading-relaxed font-mono">
                    {mode.description}
                  </p>

                  {/* 游戏设置预览 */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-800/50 border border-gray-700 p-3">
                      <div className="text-sm text-gray-500 font-mono">STARTING_ASSETS</div>
                      <div className="text-lg font-bold text-white font-mono">
                        ${mode.config.startingAssets.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-gray-800/50 border border-gray-700 p-3">
                      <div className="text-sm text-gray-500 font-mono">GRACE_PERIOD</div>
                      <div className="text-lg font-bold text-white font-mono">
                        {mode.config.gracePeriod >= 60 
                          ? `${Math.floor(mode.config.gracePeriod / 60)}MIN` 
                          : `${mode.config.gracePeriod}SEC`}
                      </div>
                    </div>
                    <div className="bg-gray-800/50 border border-gray-700 p-3">
                      <div className="text-sm text-gray-500 font-mono">AI_COUNT</div>
                      <div className="text-lg font-bold text-white font-mono">
                        {mode.config.aiCount}
                      </div>
                    </div>
                    <div className="bg-gray-800/50 border border-gray-700 p-3">
                      <div className="text-sm text-gray-500 font-mono">AI_AGGRESSION</div>
                      <div className="text-lg font-bold text-white font-mono">
                        {mode.config.aiAggressiveness}%
                      </div>
                    </div>
                  </div>

                  {/* 特殊规则 */}
                  {mode.config.specialRules && mode.config.specialRules.length > 0 && (
                    <div className="mb-6">
                      <div className="text-sm text-gray-500 font-mono mb-2">SPECIAL_RULES:</div>
                      <div className="flex flex-wrap gap-2">
                        {mode.config.specialRules.map((rule, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-700/50 border border-gray-600 text-xs font-mono text-gray-300"
                          >
                            [{rule.type.toUpperCase()}]
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex justify-center">
                    <button className="px-6 py-3 bg-white text-black font-mono tracking-wider hover:bg-gray-200 transition-colors">
                      [SELECT]
                    </button>
                  </div>

                  {/* 科技感装饰 */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-gray-600 group-hover:border-gray-400 transition-colors"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-gray-600 group-hover:border-gray-400 transition-colors"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-gray-600 group-hover:border-gray-400 transition-colors"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-gray-600 group-hover:border-gray-400 transition-colors"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // 自定义模式界面
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <button
                onClick={handleBackToModes}
                className="px-4 py-2 bg-gray-900/50 hover:bg-gray-800/50 border border-gray-600 hover:border-gray-500 transition-colors text-white font-mono text-sm"
              >
                [← BACK_TO_MODES]
              </button>
            </div>
            
            <div 
              className="bg-gray-900/50 border border-gray-600 p-8 mb-8"
              style={{
                clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))'
              }}
            >
              <h3 className="text-2xl font-bold text-white mb-6 font-mono tracking-wider">
                <span className="border-l-4 border-white pl-4">[CUSTOM_CONFIGURATION]</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                    STARTING_ASSETS: ${customConfig.startingAssets.toLocaleString()}
                  </label>
                  <input
                    type="range"
                    min="500000"
                    max="5000000"
                    step="100000"
                    value={customConfig.startingAssets}
                    onChange={(e) => setCustomConfig({...customConfig, startingAssets: parseInt(e.target.value)})}
                    className="w-full h-1 bg-gray-700 appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1 font-mono">
                    <span>500K</span>
                    <span>5M</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                    GRACE_PERIOD: {customConfig.gracePeriod}s
                  </label>
                  <input
                    type="range"
                    min="30"
                    max="600"
                    step="30"
                    value={customConfig.gracePeriod}
                    onChange={(e) => setCustomConfig({...customConfig, gracePeriod: parseInt(e.target.value)})}
                    className="w-full h-1 bg-gray-700 appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1 font-mono">
                    <span>30s</span>
                    <span>600s</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                    AI_COUNT: {customConfig.aiCount}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={customConfig.aiCount}
                    onChange={(e) => setCustomConfig({...customConfig, aiCount: parseInt(e.target.value)})}
                    className="w-full h-1 bg-gray-700 appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1 font-mono">
                    <span>1</span>
                    <span>20</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                    AI_AGGRESSION: {customConfig.aiAggressiveness}%
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={customConfig.aiAggressiveness}
                    onChange={(e) => setCustomConfig({...customConfig, aiAggressiveness: parseInt(e.target.value)})}
                    className="w-full h-1 bg-gray-700 appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1 font-mono">
                    <span>10%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 p-4 bg-gray-800/50 border border-gray-700">
                <h4 className="font-semibold text-white mb-2 font-mono">[CONFIGURATION_PREVIEW]</h4>
                <div className="text-gray-300 text-sm font-mono leading-relaxed">
                  <div>> STARTING_ASSETS: ${customConfig.startingAssets.toLocaleString()}</div>
                  <div>> GRACE_PERIOD: {customConfig.gracePeriod}s</div>
                  <div>> AI_OPPONENTS: {customConfig.aiCount}</div>
                  <div>> THREAT_LEVEL: {customConfig.aiAggressiveness}%</div>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleCustomStart}
                className="px-8 py-3 bg-white text-black font-mono tracking-wider hover:bg-gray-200 transition-colors text-lg"
              >
                [START_CUSTOM_GAME]
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}