import { getMoonshotClient } from './moonshotClient';
import { Company, GameState, Building, Agent } from '../game/useGameState';

export interface AIDecision {
  action: 'purchase_building' | 'recruit_employee' | 'stock_manipulation' | 'attack' | 'intelligence' | 'wait';
  target?: string | number;
  reasoning: string;
  priority: number;
  cost: number;
}

export class AIDecisionEngine {
  private moonshotClient = getMoonshotClient();
  private decisionHistory: Map<string, any[]> = new Map();

  async makeDecision(
    company: Company,
    gameState: GameState,
    options: {
      availableBuildings: Building[];
      enemies: Company[];
      marketConditions: any;
    }
  ): Promise<AIDecision> {
    // 构建上下文信息
    const context = this.buildGameContext(company, gameState, options);
    
    // 构建决策提示
    const prompt = this.buildDecisionPrompt(context);
    
    try {
      // 调用 AI API 获取决策
      console.log(`🤖 AI Decision for ${company.name}: Making API call to Moonshot...`);
      const aiResponse = await this.moonshotClient.chat(prompt);
      console.log(`✅ AI Decision for ${company.name}: Received response`, aiResponse.substring(0, 200) + '...');
      
      // 解析 AI 回应
      const decision = this.parseAIResponse(aiResponse, context);
      
      // 记录决策历史
      this.recordDecision(company.id, decision);
      
      return decision;
    } catch (error) {
      console.error(`❌ AI decision error for ${company.name}:`, error);
      console.log(`🔄 Using fallback decision for ${company.name}`);
      // 返回备用决策
      return this.getFallbackDecision(company, gameState, options);
    }
  }

  private buildGameContext(
    company: Company,
    gameState: GameState,
    options: any
  ): any {
    const playerCompany = gameState.companies.find(c => c.isPlayer);
    const totalAssets = gameState.companies.reduce((sum, c) => sum + c.assets, 0);
    
    return {
      company: {
        name: company.name,
        assets: company.assets,
        employees: company.employees,
        buildings: company.buildings.length,
        marketShare: ((company.assets / totalAssets) * 100).toFixed(1)
      },
      competitors: gameState.companies
        .filter(c => c.id !== company.id && c.status === 'active')
        .map(c => ({
          name: c.name,
          assets: c.assets,
          buildings: c.buildings.length,
          isPlayer: c.isPlayer
        })),
      market: {
        availableBuildings: options.availableBuildings.map((b: any) => ({
          id: b.id,
          name: b.name,
          type: b.type,
          cost: b.level * 100000,
          income: b.income
        })),
        stockPrices: gameState.stockMarket.getAllStocks().map(s => ({
          symbol: s.symbol,
          price: s.price,
          change: s.changePercent
        }))
      },
      gameStatus: {
        turn: gameState.currentTurn,
        totalCompanies: gameState.companies.filter(c => c.status === 'active').length,
        playerAssets: playerCompany?.assets || 0
      }
    };
  }

  private buildDecisionPrompt(context: any): string {
    return `
作为商业模拟游戏中的AI公司${context.company.name}，请根据以下信息做出最优决策：

【当前状态】
- 公司资产：￥${context.company.assets.toLocaleString()}
- 员工数量：${context.company.employees}人
- 建筑数量：${context.company.buildings}栋
- 市场份额：${context.company.marketShare}%

【竞争对手】
${context.competitors.map((c: any) => `- ${c.name}: 资产￥${c.assets.toLocaleString()}, 建筑${c.buildings}栋${c.isPlayer ? '（玩家）' : ''}`).join('\n')}

【可购买建筑】
${context.market.availableBuildings.map((b: any) => `- ${b.name}(${b.type}): 成本￥${b.cost.toLocaleString()}, 收益￥${b.income.toLocaleString()}/回合`).join('\n')}

【股票市场】
${context.market.stockPrices.map((s: any) => `- ${s.symbol}: ￥${s.price.toFixed(2)} (${s.change >= 0 ? '+' : ''}${s.change.toFixed(2)}%)`).join('\n')}

【游戏状态】
- 当前回合：${context.gameStatus.turn}
- 活跃公司：${context.gameStatus.totalCompanies}家
- 玩家资产：￥${context.gameStatus.playerAssets.toLocaleString()}

请选择一个行动并说明理由。可选行动：
1. purchase_building:[建筑ID] - 购买建筑
2. recruit_employee - 招聘员工（成本￥50,000）
3. stock_manipulation:[股票代码] - 股票操纵
4. attack:[目标公司] - 攻击竞争对手
5. intelligence:[目标公司] - 收集情报
6. wait - 等待观望

请按以下格式回复：
行动：[具体行动]
理由：[决策理由]
优先级：[1-10分]
`;
  }

  private parseAIResponse(aiResponse: string, context: any): AIDecision {
    try {
      const lines = aiResponse.split('\n');
      let action = 'wait';
      let target: string | number | undefined;
      let reasoning = '等待更好的时机';
      let priority = 5;
      let cost = 0;

      // 解析 AI 回应
      for (const line of lines) {
        if (line.startsWith('行动：')) {
          const actionText = line.replace('行动：', '').trim();
          if (actionText.includes('purchase_building:')) {
            action = 'purchase_building';
            target = parseInt(actionText.split(':')[1]);
            const building = context.market.availableBuildings.find((b: any) => b.id === target);
            cost = building ? building.cost : 100000;
          } else if (actionText.includes('recruit_employee')) {
            action = 'recruit_employee';
            cost = 50000;
          } else if (actionText.includes('stock_manipulation:')) {
            action = 'stock_manipulation';
            target = actionText.split(':')[1];
            cost = 200000;
          } else if (actionText.includes('attack:')) {
            action = 'attack';
            target = actionText.split(':')[1];
            cost = 100000;
          } else if (actionText.includes('intelligence:')) {
            action = 'intelligence';
            target = actionText.split(':')[1];
            cost = 30000;
          }
        } else if (line.startsWith('理由：')) {
          reasoning = line.replace('理由：', '').trim();
        } else if (line.startsWith('优先级：')) {
          const priorityText = line.replace('优先级：', '').trim();
          priority = parseInt(priorityText) || 5;
        }
      }

      return {
        action: action as AIDecision['action'],
        target,
        reasoning,
        priority,
        cost
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return this.getFallbackDecision(context.company, null, null);
    }
  }

  private getFallbackDecision(
    company: Company,
    gameState: GameState | null,
    options: any
  ): AIDecision {
    // 简单的备用决策逻辑
    if (company.assets > 200000) {
      return {
        action: 'purchase_building',
        target: 1,
        reasoning: '资产充足，购买建筑增加收益',
        priority: 7,
        cost: 100000
      };
    } else if (company.assets > 50000) {
      return {
        action: 'recruit_employee',
        reasoning: '招聘员工提升竞争力',
        priority: 6,
        cost: 50000
      };
    } else {
      return {
        action: 'wait',
        reasoning: '资产不足，等待更好时机',
        priority: 3,
        cost: 0
      };
    }
  }

  private recordDecision(companyId: string, decision: AIDecision): void {
    if (!this.decisionHistory.has(companyId)) {
      this.decisionHistory.set(companyId, []);
    }
    
    const history = this.decisionHistory.get(companyId)!;
    history.push({
      timestamp: Date.now(),
      decision,
    });
    
    // 保持最近20个决策记录
    if (history.length > 20) {
      history.shift();
    }
  }

  getDecisionHistory(companyId: string): any[] {
    return this.decisionHistory.get(companyId) || [];
  }
}

// 单例模式
let aiDecisionEngine: AIDecisionEngine | null = null;

export function getAIDecisionEngine(): AIDecisionEngine {
  if (!aiDecisionEngine) {
    aiDecisionEngine = new AIDecisionEngine();
  }
  return aiDecisionEngine;
}