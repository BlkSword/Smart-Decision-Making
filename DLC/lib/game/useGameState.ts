"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { StockMarket } from './stockMarket';
import { CompetitionEngine, CompetitionEvent, CompetitionAnalytics } from './competitionEngine';

// Re-export types for external components
export type { CompetitionEvent, CompetitionAnalytics };
import { ToastManager } from '@/components/NewsToast';
import { getAIDecisionEngine, AIDecision } from '@/lib/ai/aiDecisionEngine';
import { StatisticsManager } from './statistics';

export interface Building {
  id: number;
  type: 'trade_center' | 'hospital' | 'company' | 'real_estate' | 'hotel' | 'apartment';
  x: number;
  y: number;
  name: string;
  owner?: string;
  level: number;
  income: number;
}

export interface Agent {
  id: number;
  x: number;
  y: number;
  status: 'idle' | 'moving' | 'working' | 'attacking';
  target: { x: number; y: number } | null;
  company: string;
  skills: {
    negotiation: number;
    espionage: number;
    management: number;
  };
  actionType?: 'purchase_building' | 'recruit_employee' | 'attack' | 'intelligence' | 'move';
  targetBuildingId?: number;
}

export interface Company {
  id: string;
  name: string;
  assets: number;
  employees: number;
  buildings: number[];
  type: 'centralized' | 'decentralized';
  isPlayer: boolean;
  status: 'active' | 'bankrupt';
}

export interface GameState {
  companies: Company[];
  buildings: Building[];
  agents: Agent[];
  currentTurn: number;
  gameStatus: 'playing' | 'victory' | 'defeat';
  selectedAgent: Agent | null;
  selectedBuilding: Building | null;
  stockMarket: StockMarket;
  winner: Company | null;
  victoryReason: string;
  recentEvents: CompetitionEvent[];
  analytics: CompetitionAnalytics;
}

interface GameModeConfig {
  startingAssets: number;
  gracePeriod: number;
  gameSpeed: number;
  aiCount: number;
  aiAggressiveness: number;
  aiDecisionDelay: number;
  economicVolatility: number;
  stockMarketVariability: number;
  allowSpectators: boolean;
  maxPlayers: number;
  enablePowerUps: boolean;
  specialRules?: { type: string; value: any }[];
}

export const useGameState = (gameModeConfig?: GameModeConfig) => {
  const [stockMarket] = useState(() => new StockMarket());
  const competitionEngine = useRef(new CompetitionEngine());
  const previousGameState = useRef<GameState | null>(null);
  const aiDecisionEngine = useRef(getAIDecisionEngine());
  // 使用游戏模式配置或默认值
  const initialAiDecisionDelay = gameModeConfig ? gameModeConfig.aiDecisionDelay / 100 : 100; // 增加AI决策延迟，让玩家有更多时间
  const gracePeriod = gameModeConfig ? gameModeConfig.gracePeriod * 1000 : 10 * 60 * 1000;
  const startingAssets = gameModeConfig ? gameModeConfig.startingAssets : 1000000;
  const aiCount = gameModeConfig ? gameModeConfig.aiCount : 2;
  const aiAggressiveness = gameModeConfig ? gameModeConfig.aiAggressiveness : 50;
  
  const [aiDecisionCooldown, setAiDecisionCooldown] = useState(initialAiDecisionDelay);
  const [gameStartTime, setGameStartTime] = useState<number | null>(null); // 游戏开始时间
  
  // Set game start time on client-side only to avoid hydration issues
  useEffect(() => {
    setGameStartTime(Date.now());
  }, []);
  const [gameEndTime, setGameEndTime] = useState<number | null>(null);
  const [eliminationEnabled, setEliminationEnabled] = useState(false); // 淘汰机制是否启用
  const ELIMINATION_GRACE_PERIOD = gracePeriod;
  
  // 动态生成初始游戏状态
  const generateInitialGameState = (): GameState => {
    const playerCompany = {
      id: 'player',
      name: '我的企业',
      assets: startingAssets,
      employees: 10,
      buildings: [],
      type: 'centralized' as const,
      isPlayer: true,
      status: 'active' as const
    };
    
    // Create stable initial AI companies to avoid hydration issues
    const aiCompanies = [];
    for (let i = 0; i < aiCount; i++) {
      aiCompanies.push({
        id: `ai_${i + 1}`,
        name: `竞争对手${String.fromCharCode(65 + i)}`,
        assets: startingAssets, // Will be randomized on client-side
        employees: 10, // Will be randomized on client-side
        buildings: i === 0 ? [3] : [], // 第一个AI拥有一个建筑
        type: 'centralized' as const, // Will be randomized on client-side
        isPlayer: false,
        status: 'active' as const
      });
    }
    
    return {
      companies: [playerCompany, ...aiCompanies],
      buildings: [
        { id: 1, type: 'trade_center', x: 100, y: 100, name: '国际贸易中心', level: 1, income: 10000 },
        { id: 2, type: 'hospital', x: 200, y: 150, name: '中心医院', level: 1, income: 5000 },
        { id: 3, type: 'company', x: 300, y: 200, name: '竞争对手A总部', owner: 'ai_1', level: 1, income: 8000 },
        { id: 4, type: 'real_estate', x: 400, y: 250, name: '房地产交易所', level: 1, income: 15000 },
        { id: 5, type: 'hotel', x: 500, y: 300, name: '豪华酒店', level: 1, income: 12000 },
        { id: 6, type: 'apartment', x: 150, y: 350, name: '高档公寓', level: 1, income: 7000 }
      ],
      agents: [
        { 
          id: 1, 
          x: 150, 
          y: 150, 
          status: 'idle', 
          target: null, 
          company: 'player',
          skills: { negotiation: 70, espionage: 50, management: 80 }
        },
        ...aiCompanies.map((company, index) => ({
          id: index + 2,
          x: 250 + index * 100,
          y: 200 + index * 100,
          status: 'idle' as const,
          target: null,
          company: company.id,
          skills: {
            negotiation: 70, // Will be randomized on client-side
            espionage: 50, // Will be randomized on client-side
            management: 80 // Will be randomized on client-side
          }
        }))
      ],
      currentTurn: 1,
      gameStatus: 'playing',
      selectedAgent: null,
      selectedBuilding: null,
      stockMarket,
      winner: null,
      victoryReason: '',
      recentEvents: [],
      analytics: {
        totalTransactions: 0,
        averageAssetGrowth: 0,
        competitionIntensity: 0,
        marketShare: {},
        buildingControl: {},
        riskLevel: 0
      }
    };
  };
  
  const [gameState, setGameState] = useState<GameState>(() => generateInitialGameState());
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Initialize random values on client-side only to prevent hydration issues
  useEffect(() => {
    if (!isInitialized) {
      setGameState(prev => {
        const newState = { ...prev };
        
        // Randomize AI companies
        newState.companies = newState.companies.map(company => {
          if (!company.isPlayer) {
            return {
              ...company,
              assets: Math.floor(startingAssets * (0.7 + Math.random() * 0.3)), // 70%-100% 玩家资产 - 降低AI初始资产
              employees: 6 + Math.floor(Math.random() * 6), // 6-12 员工 - 降低AI初始员工
              type: Math.random() > 0.5 ? 'centralized' as const : 'decentralized' as const,
            };
          }
          return company;
        });
        
        // Randomize AI agent skills
        newState.agents = newState.agents.map(agent => {
          if (agent.company !== 'player') {
            return {
              ...agent,
              skills: {
                negotiation: 40 + Math.floor(Math.random() * 30), // 降低AI谈判能力
                espionage: 30 + Math.floor(Math.random() * 40), // 降低AI间谍能力
                management: 50 + Math.floor(Math.random() * 25) // 降低AI管理能力
              }
            };
          }
          return agent;
        });
        
        return newState;
      });
      setIsInitialized(true);
    }
  }, [isInitialized, startingAssets]);

  // 移动智能体
  const moveAgent = useCallback((agentId: number, targetX: number, targetY: number, actionType: 'purchase_building' | 'recruit_employee' | 'attack' | 'intelligence' | 'move' = 'move', targetBuildingId?: number) => {
    setGameState(prev => ({
      ...prev,
      agents: prev.agents.map(agent => 
        agent.id === agentId 
          ? { ...agent, status: 'moving', target: { x: targetX, y: targetY }, actionType, targetBuildingId }
          : agent
      )
    }));
  }, []);

  // 购买建筑
  const purchaseBuilding = useCallback((buildingId: number, companyId: string) => {
    setGameState(prev => {
      const building = prev.buildings.find(b => b.id === buildingId);
      const company = prev.companies.find(c => c.id === companyId);
      
      if (!building || !company || building.owner) return prev;
      
      const cost = building.level * 100000;
      if (company.assets < cost) return prev;

      return {
        ...prev,
        buildings: prev.buildings.map(b => 
          b.id === buildingId ? { ...b, owner: companyId } : b
        ),
        companies: prev.companies.map(c => 
          c.id === companyId 
            ? { 
                ...c, 
                assets: c.assets - cost,
                buildings: [...c.buildings, buildingId]
              }
            : c
        )
      };
    });
  }, []);

  // 移动到建筑并购买
  const purchaseBuildingWithMovement = useCallback((buildingId: number, companyId: string) => {
    const building = gameState.buildings.find(b => b.id === buildingId);
    const playerAgent = gameState.agents.find(a => a.company === companyId);
    
    if (building && playerAgent) {
      // 移动到建筑
      moveAgent(playerAgent.id, building.x, building.y, 'purchase_building', buildingId);
    }
  }, [gameState.buildings, gameState.agents, moveAgent]);

  // 移动到建筑招聘员工
  const recruitEmployeeWithMovement = useCallback((buildingId: number, companyId: string) => {
    const building = gameState.buildings.find(b => b.id === buildingId);
    const playerAgent = gameState.agents.find(a => a.company === companyId);
    
    if (building && playerAgent) {
      // 移动到建筑
      moveAgent(playerAgent.id, building.x, building.y, 'recruit_employee', buildingId);
    }
  }, [gameState.buildings, gameState.agents, moveAgent]);

  // 选择智能体
  const selectAgent = useCallback((agent: Agent | null) => {
    setGameState(prev => ({ ...prev, selectedAgent: agent }));
  }, []);

  // 选择建筑
  const selectBuilding = useCallback((building: Building | null) => {
    setGameState(prev => ({ ...prev, selectedBuilding: building }));
  }, []);

  // 股市操纵回调
  const onManipulationExecuted = useCallback((cost: number, message: string) => {
    setGameState(prev => ({
      ...prev,
      companies: prev.companies.map(company => 
        company.id === 'player' 
          ? { ...company, assets: company.assets - cost }
          : company
      )
    }));
    
    // 显示 Toast 通知
    const toastManager = ToastManager.getInstance();
    if (message.includes('成功')) {
      toastManager.success('市场操纵', message, 4000);
    } else if (message.includes('失败')) {
      toastManager.error('市场操纵', message, 4000);
    } else {
      toastManager.info('市场操纵', message, 4000);
    }
  }, []);

  // 游戏循环 - 包含竞争机制
  useEffect(() => {
    const gameLoop = setInterval(() => {
      // 更新股市
      stockMarket.updateMarket();
      setGameState(prev => {
        // 如果游戏已结束，不继续更新
        if (prev.gameStatus !== 'playing') {
          return prev;
        }

        let newState = { ...prev };
        
        // 移动智能体
        newState.agents = newState.agents.map(agent => {
          if (agent.status === 'moving' && agent.target) {
            const dx = agent.target.x - agent.x;
            const dy = agent.target.y - agent.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 5) {
              // 到达目标，执行对应行动
              if (agent.actionType === 'purchase_building' && agent.targetBuildingId) {
                // 购买建筑
                const building = newState.buildings.find(b => b.id === agent.targetBuildingId);
                const company = newState.companies.find(c => c.id === agent.company);
                
                if (building && company && !building.owner) {
                  const cost = building.level * 100000;
                  if (company.assets >= cost) {
                    newState.buildings = newState.buildings.map(b => 
                      b.id === agent.targetBuildingId ? { ...b, owner: agent.company } : b
                    );
                    newState.companies = newState.companies.map(c => 
                      c.id === agent.company 
                        ? { 
                            ...c, 
                            assets: c.assets - cost,
                            buildings: [...c.buildings, agent.targetBuildingId!]
                          }
                        : c
                    );
                    
                    // 显示成功通知
                    if (agent.company === 'player') {
                      const toastManager = ToastManager.getInstance();
                      toastManager.success('建筑购买', `成功购买${building.name}，成本￥${cost.toLocaleString()}`, 3000);
                    }
                  } else {
                    // 资金不足
                    if (agent.company === 'player') {
                      const toastManager = ToastManager.getInstance();
                      toastManager.error('建筑购买', `资金不足，无法购买${building.name}`, 3000);
                    }
                  }
                }
              } else if (agent.actionType === 'recruit_employee' && agent.targetBuildingId) {
                // 招聘员工
                const company = newState.companies.find(c => c.id === agent.company);
                const cost = 50000; // 招聘成本
                
                if (company && company.assets >= cost) {
                  newState.companies = newState.companies.map(c => 
                    c.id === agent.company 
                      ? { 
                          ...c, 
                          assets: c.assets - cost,
                          employees: c.employees + 1
                        }
                      : c
                  );
                  
                  // 显示成功通知
                  if (agent.company === 'player') {
                    const toastManager = ToastManager.getInstance();
                    toastManager.success('人员招聘', `成功招聘一名员工，成本￥${cost.toLocaleString()}`, 3000);
                  }
                } else {
                  // 资金不足
                  if (agent.company === 'player') {
                    const toastManager = ToastManager.getInstance();
                    toastManager.error('人员招聘', `资金不足，无法招聘员工`, 3000);
                  }
                }
              } else if (agent.actionType === 'attack' && agent.targetBuildingId) {
                // 攻击敌方建筑
                const targetBuilding = newState.buildings.find(b => b.id === agent.targetBuildingId);
                const attackerCompany = newState.companies.find(c => c.id === agent.company);
                const defenderCompany = targetBuilding?.owner ? newState.companies.find(c => c.id === targetBuilding.owner) : null;
                
                if (targetBuilding && attackerCompany && defenderCompany && targetBuilding.owner !== agent.company) {
                  const attackPower = agent.skills.management + agent.skills.negotiation;
                  const defensePower = 50; // 基本防御力
                  const cost = 100000; // 攻击成本
                  
                  if (attackerCompany.assets >= cost && Math.random() * 100 < attackPower - defensePower + 30) {
                    // 攻击成功，夺取建筑
                    newState.buildings = newState.buildings.map(b => 
                      b.id === agent.targetBuildingId ? { ...b, owner: agent.company } : b
                    );
                    
                    // 更新公司建筑列表
                    newState.companies = newState.companies.map(c => {
                      if (c.id === agent.company) {
                        return {
                          ...c,
                          assets: c.assets - cost,
                          buildings: [...c.buildings, agent.targetBuildingId!]
                        };
                      } else if (c.id === targetBuilding.owner) {
                        return {
                          ...c,
                          assets: c.assets - 50000, // 被攻击损失
                          buildings: c.buildings.filter(bid => bid !== agent.targetBuildingId)
                        };
                      }
                      return c;
                    });
                    
                    // 显示成功通知
                    if (agent.company === 'player') {
                      const toastManager = ToastManager.getInstance();
                      toastManager.success('敌对行动', `成功攻击并夺取${targetBuilding.name}！`, 4000);
                    }
                  } else {
                    // 攻击失败，只扣除成本
                    newState.companies = newState.companies.map(c => 
                      c.id === agent.company 
                        ? { ...c, assets: c.assets - cost }
                        : c
                    );
                    
                    // 显示失败通知
                    if (agent.company === 'player') {
                      const toastManager = ToastManager.getInstance();
                      toastManager.error('敌对行动', `攻击${targetBuilding.name}失败，损失￥${cost.toLocaleString()}`, 4000);
                    }
                  }
                }
              } else if (agent.actionType === 'intelligence' && agent.targetBuildingId) {
                // 收集情报
                const targetBuilding = newState.buildings.find(b => b.id === agent.targetBuildingId);
                const spyCompany = newState.companies.find(c => c.id === agent.company);
                const targetCompany = targetBuilding?.owner ? newState.companies.find(c => c.id === targetBuilding.owner) : null;
                
                if (targetBuilding && spyCompany && targetCompany && targetBuilding.owner !== agent.company) {
                  const spyPower = agent.skills.espionage + agent.skills.negotiation;
                  const cost = 30000; // 情报成本
                  
                  if (spyCompany.assets >= cost && Math.random() * 100 < spyPower) {
                    // 情报收集成功，获得对手资产信息并窃取部分资产
                    const stolenAmount = Math.floor(targetCompany.assets * 0.05); // 窃取5%资产
                    
                    newState.companies = newState.companies.map(c => {
                      if (c.id === agent.company) {
                        return {
                          ...c,
                          assets: c.assets - cost + stolenAmount
                        };
                      } else if (c.id === targetCompany.id) {
                        return {
                          ...c,
                          assets: c.assets - stolenAmount
                        };
                      }
                      return c;
                    });
                    
                    // 显示成功通知
                    if (agent.company === 'player') {
                      const toastManager = ToastManager.getInstance();
                      toastManager.success('情报收集', `成功窃取${targetCompany.name}资产￥${stolenAmount.toLocaleString()}`, 4000);
                    }
                  } else {
                    // 情报收集失败，只扣除成本
                    newState.companies = newState.companies.map(c => 
                      c.id === agent.company 
                        ? { ...c, assets: c.assets - cost }
                        : c
                    );
                    
                    // 显示失败通知
                    if (agent.company === 'player') {
                      const toastManager = ToastManager.getInstance();
                      toastManager.error('情报收集', `情报收集失败，损失￥${cost.toLocaleString()}`, 4000);
                    }
                  }
                }
              }
              
              return { ...agent, status: 'idle', target: null, actionType: undefined, targetBuildingId: undefined };
            } else {
              // 继续移动
              const speed = 2;
              return {
                ...agent,
                x: agent.x + (dx / distance) * speed,
                y: agent.y + (dy / distance) * speed
              };
            }
          }
          return agent;
        });

        // 简单AI逻辑
        newState.agents = newState.agents.map(agent => {
          if (agent.company !== 'player' && agent.status === 'idle') {
            // AI智能体随机移动到建筑
            const randomBuilding = newState.buildings[Math.floor(Math.random() * newState.buildings.length)];
            if (Math.random() < 0.1) { // 10%概率移动
              return {
                ...agent,
                status: 'moving',
                target: { x: randomBuilding.x, y: randomBuilding.y }
              };
            }
          }
          return agent;
        });

        // 收入计算
        newState.companies = newState.companies.map(company => {
          if (company.status === 'active') {
            const ownedBuildings = newState.buildings.filter(b => b.owner === company.id);
            const totalIncome = ownedBuildings.reduce((sum, building) => sum + building.income, 0);
            return {
              ...company,
              assets: company.assets + totalIncome
            };
          }
          return company;
        });

        // AI竞争行为（使用真实AI决策）
        if (aiDecisionCooldown <= 0) {
          // 每15秒执行一次AI决策 - 降低AI决策频率
          console.log('🔄 AI Decision Cooldown Complete - Starting AI Actions');
          setAiDecisionCooldown(150); // 15秒冷却时间 - 给玩家更多时间
          
          // 为每个非玩家公司执行决策
          const aiCompanies = newState.companies.filter(c => !c.isPlayer && c.status === 'active');
          console.log(`🤖 Processing AI decisions for ${aiCompanies.length} companies:`, aiCompanies.map(c => c.name));
          
          // 在第一次AI决策时显示通知
          const toastManager = ToastManager.getInstance();
          if (newState.currentTurn === 1) {
            toastManager.success('游戏状态', 'AI竞争对手开始行动！', 3000);
          }
          
          aiCompanies.forEach(async (company) => {
            try {
              const availableBuildings = newState.buildings.filter(b => !b.owner);
              const enemies = newState.companies.filter(c => c.id !== company.id && c.status === 'active');
              const marketConditions = {
                stocks: stockMarket.getAllStocks(),
                news: stockMarket.getMarketNews()
              };
              
              console.log(`🤖 Making decision for ${company.name} (Assets: ¥${company.assets.toLocaleString()})`);
              const decision = await aiDecisionEngine.current.makeDecision(company, newState, {
                availableBuildings,
                enemies,
                marketConditions
              });
              console.log(`🎯 Decision made for ${company.name}:`, decision.action, decision.reasoning);
              
              // 在下一次游戏循环中执行决策
              setTimeout(() => {
                setGameState(currentState => {
                  return executeAIDecision(currentState, company.id, decision);
                });
              }, Math.random() * 4000 + 2000); // 2-6秒后执行 - 给玩家更多反应时间
              
            } catch (error) {
              console.error(`❌ AI decision error for company ${company.name}:`, error);
              // 使用简单的备用逻辑
              if (Math.random() < 0.01) { // 进一步降低AI备用行动概率至1%
                const availableBuildings = newState.buildings.filter(b => !b.owner && company.assets >= b.level * 100000);
                if (availableBuildings.length > 0) {
                  const targetBuilding = availableBuildings[Math.floor(Math.random() * availableBuildings.length)];
                  const cost = targetBuilding.level * 100000;
                  
                  newState.buildings = newState.buildings.map(b => 
                    b.id === targetBuilding.id ? { ...b, owner: company.id } : b
                  );
                  
                  newState.companies = newState.companies.map(c => 
                    c.id === company.id 
                      ? {
                          ...c,
                          assets: c.assets - cost,
                          buildings: [...c.buildings, targetBuilding.id]
                        }
                      : c
                  );
                }
              }
            }
          });
        } else {
          setAiDecisionCooldown(prev => {
            const newCooldown = prev - 1;
            // 在即将开始时显示提示
            if (newCooldown === 10) { // 剩你1秒时提示
              console.log('⏰ AI Decision cooldown almost complete - 1 second remaining');
              const toastManager = ToastManager.getInstance();
              toastManager.info('游戏状态', 'AI竞争对手即将开始行动...', 2000);
            }
            if (newCooldown % 10 === 0) { // 每秒显示一次日志
              console.log(`⏳ AI Decision cooldown: ${Math.ceil(newCooldown / 10)} seconds remaining`);
            }
            return newCooldown;
          });
        }

        // 竞争引擎处理
        if (previousGameState.current) {
          // 检查资产变化
          const assetEvents = competitionEngine.current.checkAssetChanges(previousGameState.current, newState);
          competitionEngine.current.addEvents(assetEvents);
          
          // 检查建筑收购
          const buildingEvents = competitionEngine.current.checkBuildingAcquisitions(previousGameState.current, newState);
          competitionEngine.current.addEvents(buildingEvents);
        }

        // 检查是否到了启用淘汰机制的时间
        const currentTime = Date.now();
        const timeSinceStart = gameStartTime ? currentTime - gameStartTime : 0;
        
        if (gameStartTime && timeSinceStart >= ELIMINATION_GRACE_PERIOD && !eliminationEnabled) {
          setEliminationEnabled(true);
          // 显示淘汰机制启用通知
          const toastManager = ToastManager.getInstance();
          toastManager.warning('竞争激化', '⚠️ 淘汰机制已启用！资产为0的公司将被淘汰！', 8000);
        }
        
        // 无论是否在保护期内，资产为0的公司都会被淘汰
        const { eliminatedCompanies, updatedState, events } = competitionEngine.current.checkEliminations(newState);
        competitionEngine.current.addEvents(events);
        newState = updatedState;

        // 检查胜利条件 - 修复：胜利条件检查不受淘汰机制宽限期限制
        const { isGameOver, winner, reason, victoryType } = competitionEngine.current.checkVictoryConditions(newState);
        
        if (isGameOver) {
          newState.gameStatus = winner?.isPlayer ? 'victory' : 'defeat';
          newState.winner = winner;
          newState.victoryReason = reason;
          
          // 触发游戏结束处理
          competitionEngine.current.triggerGameEnd(newState, winner, reason);
          
          // 显示胜利通知
          const toastManager = ToastManager.getInstance();
          if (winner?.isPlayer) {
            toastManager.success('🏆 胜利！', reason, 8000);
          } else {
            toastManager.error('😔 失败', reason, 8000);
          }
          
          // Record game end time and update statistics
          if (!gameEndTime) {
            const endTime = Date.now();
            setGameEndTime(endTime);
            
            // Update statistics for the player
            const playerCompany = newState.companies.find(c => c.isPlayer);
            if (playerCompany) {
              const gameResult = StatisticsManager.calculateGameResult(
                playerCompany,
                newState.companies,
                new Date(gameStartTime || Date.now()),
                new Date(endTime)
              );
              
              // TODO: Get actual user ID when authentication is implemented
              // For now, we'll just log the game result
              console.log('Game result for statistics:', gameResult);
              // StatisticsManager.updatePlayerStatistics(userId, gameResult);
            }
          }
        } else if (eliminationEnabled) {
          // 只有在淘汰机制启用后才检查接近胜利条件的警告
          const { isNearVictory, warningMessage } = competitionEngine.current.checkNearVictoryConditions(newState);
          if (isNearVictory && Math.random() < 0.1) { // 10%概率显示警告
            const toastManager = ToastManager.getInstance();
            toastManager.warning('⚠️ 胜利警告', warningMessage, 5000);
          }
        }

        // 更新分析数据
        newState.analytics = competitionEngine.current.calculateAnalytics(newState);
        newState.recentEvents = competitionEngine.current.getRecentEvents(5);

        // 保存当前状态用于下次比较
        previousGameState.current = newState;

        return newState;
      });
    }, 100);

    return () => clearInterval(gameLoop);
  }, [stockMarket]);

  const playerCompany = gameState.companies.find(c => c.isPlayer);
  const aiCompanies = gameState.companies.filter(c => !c.isPlayer && c.status === 'active');

  // 敌对收购功能
  const executeHostileTakeover = useCallback((targetCompanyId: string) => {
    const playerCompany = gameState.companies.find(c => c.isPlayer);
    const targetCompany = gameState.companies.find(c => c.id === targetCompanyId);
    
    if (!playerCompany || !targetCompany) return;
    
    const { success, cost, updatedState, event } = competitionEngine.current.executeHostileTakeover(
      playerCompany,
      targetCompany,
      gameState
    );
    
    competitionEngine.current.addEvent(event);
    
    if (success) {
      setGameState(updatedState);
      
      // 检查是否在收购后立即达到胜利条件 - 修复：移除淘汰机制限制
      const { isGameOver, winner, reason } = competitionEngine.current.checkVictoryConditions(updatedState);
      if (isGameOver) {
        // 更新游戏状态
        setGameState(prev => ({
          ...updatedState,
          gameStatus: winner?.isPlayer ? 'victory' : 'defeat',
          winner,
          victoryReason: reason
        }));
        
        const toastManager = ToastManager.getInstance();
        if (winner?.isPlayer) {
          toastManager.success('🏆 立即胜利！', reason, 10000);
        } else {
          toastManager.error('😱 游戏结束', reason, 8000);
        }
      }
    }
    
    return { success, cost, message: event.description };
  }, [gameState]);

  // 执行AI决策
  const executeAIDecision = (currentState: GameState, companyId: string, decision: AIDecision): GameState => {
    const company = currentState.companies.find(c => c.id === companyId);
    if (!company || company.status !== 'active') {
      return currentState;
    }

    const toastManager = ToastManager.getInstance();
    let newState = { ...currentState };

    switch (decision.action) {
      case 'purchase_building':
        if (typeof decision.target === 'number') {
          const building = newState.buildings.find(b => b.id === decision.target);
          if (building && !building.owner && company.assets >= decision.cost) {
            newState.buildings = newState.buildings.map(b => 
              b.id === decision.target ? { ...b, owner: companyId } : b
            );
            newState.companies = newState.companies.map(c => 
              c.id === companyId 
                ? {
                    ...c,
                    assets: c.assets - decision.cost,
                    buildings: [...c.buildings, decision.target as number]
                  }
                : c
            );
            toastManager.info('AI决策', `${company.name}: ${decision.reasoning}`, 3000);
          }
        }
        break;

      case 'recruit_employee':
        // 降低AI招聘效率
        if (company.assets >= decision.cost && Math.random() < 0.7) { // 70%成功率
          newState.companies = newState.companies.map(c => 
            c.id === companyId 
              ? {
                  ...c,
                  assets: c.assets - decision.cost,
                  employees: c.employees + 1
                }
              : c
          );
          toastManager.info('AI决策', `${company.name}: ${decision.reasoning}`, 3000);
        }
        break;

      case 'stock_manipulation':
        if (typeof decision.target === 'string' && company.assets >= decision.cost) {
          try {
            const result = stockMarket.executeManipulation(companyId, decision.target, 'price_manipulation');
            newState.companies = newState.companies.map(c => 
              c.id === companyId 
                ? { ...c, assets: c.assets - result.cost }
                : c
            );
            toastManager.info('AI决策', `${company.name}: ${decision.reasoning}`, 3000);
          } catch (error) {
            console.error('AI stock manipulation error:', error);
          }
        }
        break;

      case 'wait':
        // 无操作
        break;

      default:
        console.log(`AI决策 ${company.name}: ${decision.reasoning}`);
    }

    return newState;
  };

  return {
    gameState,
    playerCompany,
    aiCompanies,
    moveAgent,
    purchaseBuilding,
    purchaseBuildingWithMovement,
    recruitEmployeeWithMovement,
    selectAgent,
    selectBuilding,
    onManipulationExecuted,
    executeHostileTakeover,
    competitionEngine: competitionEngine.current,
    aiDecisionCooldown,
    eliminationEnabled,
    gameStartTime,
    ELIMINATION_GRACE_PERIOD
  };
};