interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletion {
  choices: {
    message: {
      content: string;
    };
  }[];
}

export class MoonshotClient {
  private apiKey: string;
  private baseUrl: string;
  private defaultHistory: ChatMessage[];

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = "https://api.moonshot.cn/v1";
    this.defaultHistory = [
      {
        role: "system",
        content: "你是一个商业模拟游戏中的AI助手，专门负责为AI公司做出智能决策。你需要基于当前的游戏状态（公司资产、市场情况、竞争对手信息等）来制定最优策略。你的回答应该简洁明了，并且包含具体的行动建议。"
      }
    ];
  }

  async chat(query: string, history: ChatMessage[] = []): Promise<string> {
    const messages = [...this.defaultHistory, ...history, { role: 'user' as const, content: query }];

    try {
      console.log('🚀 Making Moonshot API call...');
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: "kimi-k2-0711-preview",
          messages,
          temperature: 0.6,
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data: ChatCompletion = await response.json();
      console.log('✅ Moonshot API call successful');
      return data.choices[0].message.content;
    } catch (error) {
      console.error('❌ Moonshot API error:', error);
      console.log('🔄 Using fallback decision');
      // 返回备用决策
      return this.getFallbackDecision(query);
    }
  }

  private getFallbackDecision(query: string): string {
    // 简单的备用决策逻辑
    if (query.includes('建筑')) {
      return '建议购买收益最高的建筑';
    } else if (query.includes('股票')) {
      return '建议操纵价格最低的股票';
    } else if (query.includes('攻击')) {
      return '建议攻击最弱的竞争对手';
    } else {
      return '建议保持当前策略';
    }
  }
}

// 单例模式
let moonshotClient: MoonshotClient | null = null;

export function getMoonshotClient(): MoonshotClient {
  if (!moonshotClient) {
    const apiKey = process.env.MOONSHOT_API_KEY || "sk-KzqY8VGmeN4zcW92qOBgImTeRTyGDxTchk19tnuCJPZPjcSD";
    moonshotClient = new MoonshotClient(apiKey);
  }
  return moonshotClient;
}