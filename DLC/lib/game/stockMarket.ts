"use client";

export interface Stock {
  id: string;
  symbol: string;
  name: string;
  price: number;
  previousPrice: number;
  volume: number;
  marketCap: number;
  change: number;
  changePercent: number;
  highPrice: number;
  lowPrice: number;
  openPrice: number;
  volatility: number;
  beta: number;
  orderBook: {
    buy: OrderBookEntry[];
    sell: OrderBookEntry[];
  };
}

export interface OrderBookEntry {
  price: number;
  quantity: number;
  timestamp: number;
}

export interface MarketOrder {
  id: string;
  companyId: string;
  stockId: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  orderType: 'market' | 'limit' | 'stop';
  timestamp: number;
  status: 'pending' | 'filled' | 'cancelled';
  manipulationType?: MarketManipulationType;
}

export type MarketManipulationType = 
  | 'rumor_spread'           // 虚假信息操纵
  | 'wash_trading'           // 对倒交易
  | 'price_manipulation'     // 连续买卖操纵
  | 'insider_trading'        // 内幕交易
  | 'limit_up_manipulation'  // 涨停板操纵
  | 'closing_manipulation'   // 尾盘操纵
  | 'algo_manipulation';     // 程序化交易操纵

export interface MarketNews {
  id: string;
  stockId: string;
  type: 'positive' | 'negative' | 'neutral';
  headline: string;
  content: string;
  impact: number; // -1 to 1
  timestamp: number;
  isFake: boolean;
  sourceCompany?: string;
}

export interface MarketManipulationAction {
  type: MarketManipulationType;
  description: string;
  cost: number;
  successRate: number;
  impact: number;
  duration: number; // in turns
  riskLevel: 'low' | 'medium' | 'high';
  detectionRisk: number; // 0-1
}

export class StockMarket {
  private stocks: Map<string, Stock> = new Map();
  private orders: MarketOrder[] = [];
  private news: MarketNews[] = [];
  private manipulationActions: Map<MarketManipulationType, MarketManipulationAction> = new Map();
  private activeManipulations: Map<string, { type: MarketManipulationType; endTime: number; companyId: string }> = new Map();

  constructor() {
    this.initializeManipulationActions();
    this.initializeStocks();
  }

  private initializeManipulationActions() {
    const actions: [MarketManipulationType, MarketManipulationAction][] = [
      ['rumor_spread', {
        type: 'rumor_spread',
        description: '散布虚假消息操纵市场情绪',
        cost: 50000,
        successRate: 0.8,
        impact: 0.15,
        duration: 3,
        riskLevel: 'medium',
        detectionRisk: 0.3
      }],
      ['wash_trading', {
        type: 'wash_trading',
        description: '自买自卖制造虚假交易量',
        cost: 100000,
        successRate: 0.9,
        impact: 0.1,
        duration: 2,
        riskLevel: 'high',
        detectionRisk: 0.6
      }],
      ['price_manipulation', {
        type: 'price_manipulation',
        description: '集中资金拉抬或打压股价',
        cost: 500000,
        successRate: 0.7,
        impact: 0.25,
        duration: 1,
        riskLevel: 'high',
        detectionRisk: 0.4
      }],
      ['insider_trading', {
        type: 'insider_trading',
        description: '利用内幕信息提前交易',
        cost: 20000,
        successRate: 0.95,
        impact: 0.3,
        duration: 1,
        riskLevel: 'high',
        detectionRisk: 0.8
      }],
      ['limit_up_manipulation', {
        type: 'limit_up_manipulation',
        description: '封涨停板吸引跟风盘',
        cost: 1000000,
        successRate: 0.6,
        impact: 0.1,
        duration: 1,
        riskLevel: 'high',
        detectionRisk: 0.5
      }],
      ['closing_manipulation', {
        type: 'closing_manipulation',
        description: '尾盘操纵影响收盘价',
        cost: 200000,
        successRate: 0.85,
        impact: 0.08,
        duration: 1,
        riskLevel: 'medium',
        detectionRisk: 0.4
      }],
      ['algo_manipulation', {
        type: 'algo_manipulation',
        description: '程序化交易制造虚假市场深度',
        cost: 300000,
        successRate: 0.75,
        impact: 0.12,
        duration: 2,
        riskLevel: 'medium',
        detectionRisk: 0.7
      }]
    ];

    actions.forEach(([type, action]) => {
      this.manipulationActions.set(type, action);
    });
  }

  private initializeStocks() {
    const initialStocks: Omit<Stock, 'change' | 'changePercent' | 'orderBook'>[] = [
      {
        id: 'BIZCOM',
        symbol: 'BIZCOM',
        name: '商业通讯集团',
        price: 45.67,
        previousPrice: 44.32,
        volume: 1250000,
        marketCap: 2300000000,
        highPrice: 47.89,
        lowPrice: 43.21,
        openPrice: 44.55,
        volatility: 0.15,
        beta: 1.2
      },
      {
        id: 'TECHNO',
        symbol: 'TECHNO',
        name: '科技创新公司',
        price: 128.45,
        previousPrice: 125.67,
        volume: 890000,
        marketCap: 5600000000,
        highPrice: 132.10,
        lowPrice: 124.30,
        openPrice: 126.80,
        volatility: 0.22,
        beta: 1.8
      },
      {
        id: 'ESTATE',
        symbol: 'ESTATE',
        name: '地产开发集团',
        price: 78.90,
        previousPrice: 82.15,
        volume: 2100000,
        marketCap: 3400000000,
        highPrice: 84.50,
        lowPrice: 77.20,
        openPrice: 81.30,
        volatility: 0.18,
        beta: 1.5
      },
      {
        id: 'MEDIC',
        symbol: 'MEDIC',
        name: '医疗健康公司',
        price: 156.78,
        previousPrice: 159.23,
        volume: 650000,
        marketCap: 4100000000,
        highPrice: 162.45,
        lowPrice: 154.12,
        openPrice: 158.90,
        volatility: 0.12,
        beta: 0.8
      },
      {
        id: 'HOTEL',
        symbol: 'HOTEL',
        name: '酒店服务集团',
        price: 34.56,
        previousPrice: 36.12,
        volume: 1800000,
        marketCap: 1200000000,
        highPrice: 37.80,
        lowPrice: 33.45,
        openPrice: 35.90,
        volatility: 0.20,
        beta: 1.3
      }
    ];

    initialStocks.forEach(stock => {
      const fullStock: Stock = {
        ...stock,
        change: stock.price - stock.previousPrice,
        changePercent: ((stock.price - stock.previousPrice) / stock.previousPrice) * 100,
        orderBook: {
          buy: this.generateOrderBook('buy', stock.price),
          sell: this.generateOrderBook('sell', stock.price)
        }
      };
      this.stocks.set(stock.id, fullStock);
    });
  }

  private generateOrderBook(type: 'buy' | 'sell', basePrice: number): OrderBookEntry[] {
    const entries: OrderBookEntry[] = [];
    const priceStep = basePrice * 0.001; // 0.1% price step
    
    for (let i = 0; i < 10; i++) {
      const priceOffset = (i + 1) * priceStep;
      const price = type === 'buy' ? basePrice - priceOffset : basePrice + priceOffset;
      const quantity = Math.floor(Math.random() * 10000) + 1000;
      
      entries.push({
        price: Math.max(0.01, price),
        quantity,
        timestamp: Date.now() - Math.random() * 60000
      });
    }
    
    return entries.sort((a, b) => type === 'buy' ? b.price - a.price : a.price - b.price);
  }

  // 执行市场操纵策略
  executeManipulation(companyId: string, stockId: string, type: MarketManipulationType): {
    success: boolean;
    message: string;
    cost: number;
    impact?: number;
  } {
    const action = this.manipulationActions.get(type);
    const stock = this.stocks.get(stockId);
    
    if (!action || !stock) {
      return { success: false, message: '无效的操纵类型或股票', cost: 0 };
    }

    const success = Math.random() < action.successRate;
    const detected = Math.random() < action.detectionRisk;
    
    if (success && !detected) {
      // 应用操纵效果
      const impact = action.impact * (type.includes('negative') ? -1 : 1);
      this.applyManipulationEffect(stockId, type, impact);
      
      // 记录活跃操纵
      this.activeManipulations.set(`${companyId}-${stockId}-${type}`, {
        type,
        endTime: Date.now() + action.duration * 60000, // duration in minutes
        companyId
      });

      return {
        success: true,
        message: `成功执行${action.description}`,
        cost: action.cost,
        impact
      };
    } else if (detected) {
      return {
        success: false,
        message: `操纵被监管发现！面临罚款和声誉损失`,
        cost: action.cost * 2 // 罚款
      };
    } else {
      return {
        success: false,
        message: `${action.description}执行失败`,
        cost: action.cost * 0.5 // 部分损失
      };
    }
  }

  private applyManipulationEffect(stockId: string, type: MarketManipulationType, impact: number) {
    const stock = this.stocks.get(stockId);
    if (!stock) return;

    let priceChange = 0;
    let volumeChange = 0;

    switch (type) {
      case 'rumor_spread':
        priceChange = stock.price * impact;
        volumeChange = stock.volume * 0.3;
        this.addFakeNews(stockId, impact > 0 ? 'positive' : 'negative');
        break;
      
      case 'wash_trading':
        volumeChange = stock.volume * 0.5;
        priceChange = stock.price * impact * 0.5;
        break;
      
      case 'price_manipulation':
        priceChange = stock.price * impact;
        volumeChange = stock.volume * 0.2;
        break;
      
      case 'insider_trading':
        priceChange = stock.price * impact;
        break;
      
      case 'limit_up_manipulation':
        priceChange = stock.price * 0.1; // 涨停
        volumeChange = stock.volume * 0.4;
        break;
      
      case 'closing_manipulation':
        priceChange = stock.price * impact;
        break;
      
      case 'algo_manipulation':
        volumeChange = stock.volume * 0.3;
        priceChange = stock.price * impact * 0.7;
        break;
    }

    // 应用变化
    const newPrice = Math.max(0.01, stock.price + priceChange);
    const newVolume = Math.max(0, stock.volume + volumeChange);

    this.updateStock(stockId, {
      price: newPrice,
      volume: newVolume,
      change: newPrice - stock.previousPrice,
      changePercent: ((newPrice - stock.previousPrice) / stock.previousPrice) * 100,
      highPrice: Math.max(stock.highPrice, newPrice),
      lowPrice: Math.min(stock.lowPrice, newPrice)
    });
  }

  private addFakeNews(stockId: string, type: 'positive' | 'negative') {
    const stock = this.stocks.get(stockId);
    if (!stock) return;

    const headlines = {
      positive: [
        `${stock.name}宣布重大技术突破`,
        `${stock.name}获得大额政府补贴`,
        `${stock.name}签署战略合作协议`,
        `${stock.name}业绩预增超预期`
      ],
      negative: [
        `${stock.name}面临监管调查`,
        `${stock.name}核心技术存在缺陷`,
        `${stock.name}大股东减持套现`,
        `${stock.name}业绩不及预期`
      ]
    };

    const headline = headlines[type][Math.floor(Math.random() * headlines[type].length)];
    
    this.news.push({
      id: `news-${Date.now()}`,
      stockId,
      type,
      headline,
      content: `市场传言：${headline}，消息尚未得到官方确认。`,
      impact: type === 'positive' ? 0.05 : -0.05,
      timestamp: Date.now(),
      isFake: true
    });
  }

  private updateStock(stockId: string, updates: Partial<Stock>) {
    const stock = this.stocks.get(stockId);
    if (stock) {
      Object.assign(stock, updates);
      // 更新订单簿
      stock.orderBook = {
        buy: this.generateOrderBook('buy', stock.price),
        sell: this.generateOrderBook('sell', stock.price)
      };
    }
  }

  // 获取所有股票
  getAllStocks(): Stock[] {
    return Array.from(this.stocks.values());
  }

  // 获取特定股票
  getStock(stockId: string): Stock | undefined {
    return this.stocks.get(stockId);
  }

  // 获取操纵策略
  getManipulationActions(): MarketManipulationAction[] {
    return Array.from(this.manipulationActions.values());
  }

  // 获取市场新闻
  getMarketNews(): MarketNews[] {
    return this.news.slice(-20); // 只返回最近20条新闻
  }

  // 执行市场订单
  executeOrder(order: MarketOrder): { success: boolean; message: string; executedPrice?: number } {
    const stock = this.stocks.get(order.stockId);
    if (!stock) {
      return { success: false, message: '股票不存在' };
    }

    // 简化的订单执行逻辑
    const executedPrice = order.type === 'buy' ? 
      stock.price * (1 + Math.random() * 0.001) : 
      stock.price * (1 - Math.random() * 0.001);

    this.orders.push({
      ...order,
      status: 'filled',
      price: executedPrice
    });

    // 更新股票价格和成交量
    const priceImpact = (order.quantity / stock.volume) * 0.01;
    const newPrice = order.type === 'buy' ? 
      stock.price + (stock.price * priceImpact) : 
      stock.price - (stock.price * priceImpact);

    this.updateStock(order.stockId, {
      price: Math.max(0.01, newPrice),
      volume: stock.volume + order.quantity,
      change: newPrice - stock.previousPrice,
      changePercent: ((newPrice - stock.previousPrice) / stock.previousPrice) * 100
    });

    return { 
      success: true, 
      message: '订单执行成功', 
      executedPrice 
    };
  }

  // 市场更新循环
  updateMarket() {
    this.stocks.forEach((stock, stockId) => {
      // 随机价格波动
      const volatility = stock.volatility;
      const randomChange = (Math.random() - 0.5) * volatility * 0.1;
      const newPrice = Math.max(0.01, stock.price * (1 + randomChange));
      
      this.updateStock(stockId, {
        previousPrice: stock.price,
        price: newPrice,
        change: newPrice - stock.price,
        changePercent: ((newPrice - stock.price) / stock.price) * 100,
        highPrice: Math.max(stock.highPrice, newPrice),
        lowPrice: Math.min(stock.lowPrice, newPrice)
      });
    });

    // 清理过期的操纵效果
    const now = Date.now();
    this.activeManipulations.forEach((manipulation, key) => {
      if (now > manipulation.endTime) {
        this.activeManipulations.delete(key);
      }
    });
  }
}