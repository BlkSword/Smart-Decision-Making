export type Language = 'zh' | 'en';

export interface Translation {
  // 通用
  common: {
    confirm: string;
    cancel: string;
    save: string;
    loading: string;
    error: string;
    success: string;
    warning: string;
    info: string;
  };
  
  // 游戏基础
  game: {
    title: string;
    subtitle: string;
    description: string;
    company: string;
    assets: string;
    employees: string;
    buildings: string;
    turn: string;
    status: string;
    actions: string;
  };
  
  // 公司相关
  company: {
    myCompany: string;
    competitor: string;
    active: string;
    bankrupt: string;
    centralizedManagement: string;
    decentralizedManagement: string;
    neuralWorkforce: string;
    aeroVitaEnterprise: string;
  };
  
  // 建筑相关
  buildings: {
    tradeCenter: string;
    hospital: string;
    company: string;
    realEstate: string;
    hotel: string;
    apartment: string;
    purchase: string;
    recruit: string;
    upgrade: string;
    income: string;
    level: string;
    owned: string;
    available: string;
  };
  
  // 智能体和动作
  agents: {
    idle: string;
    moving: string;
    working: string;
    attacking: string;
    selectAgent: string;
    moveAgent: string;
    purchaseBuilding: string;
    recruitEmployee: string;
    attack: string;
    intelligence: string;
    move: string;
    negotiation: string;
    espionage: string;
    management: string;
  };
  
  // 股票市场
  stockMarket: {
    title: string;
    manipulation: string;
    priceManipulation: string;
    volumeManipulation: string;
    newsManipulation: string;
    algorithmicTrading: string;
    shortSelling: string;
    pumpAndDump: string;
    spoofing: string;
    execute: string;
    cost: string;
    success: string;
    failure: string;
  };
  
  // 竞争系统
  competition: {
    title: string;
    ranking: string;
    marketShare: string;
    buildingControl: string;
    totalTransactions: string;
    averageAssetGrowth: string;
    competitionIntensity: string;
    riskLevel: string;
    hostileTakeover: string;
    eliminationMechanism: string;
    activated: string;
    gracePeriod: string;
    timeRemaining: string;
    safetyPeriod: string;
    preparingElimination: string;
    aboutToActivate: string;
    eliminationActivated: string;
    assetsZeroEliminated: string;
    competitionIntensified: string;
  };
  
  // AI系统
  ai: {
    decision: string;
    countdown: string;
    thinking: string;
    ready: string;
    nextDecision: string;
    aiOpponent: string;
    strategy: string;
    reasoning: string;
  };
  
  // 胜利条件
  victory: {
    victory: string;
    defeat: string;
    winner: string;
    reason: string;
    eliminatedAllCompetitors: string;
    controlledAssets: string;
    playerBankrupt: string;
    marketDominance: string;
  };
  
  // 启动屏幕
  startup: {
    title: string;
    subtitle: string;
    description: string;
    poweredBy: string;
    initializing: string;
    copyright: string;
    platform: string;
  };
  
  // 多人游戏
  multiplayer: {
    gameTitle: string;
    multiplayerLobby: string;
    connected: string;
    connecting: string;
    disconnected: string;
    availableRooms: string;
    createRoom: string;
    createNewRoom: string;
    roomName: string;
    enterRoomName: string;
    maxPlayers: string;
    players: string;
    host: string;
    join: string;
    full: string;
    create: string;
    refresh: string;
    leaveRoom: string;
    startGame: string;
    needMorePlayers: string;
    waitingForHost: string;
    gameWillStart: string;
    noRoomsAvailable: string;
    online: string;
    offline: string;
    dismiss: string;
    roomJoined: string;
    roomLeft: string;
    gameStarted: string;
    playerJoined: string;
    playerLeft: string;
    chat: string;
    sendMessage: string;
    typeMessage: string;
    spectatorMode: string;
    watchGame: string;
    playerActions: string;
    gameEvents: string;
    gameHistory: string;
    leaderboard: string;
    statistics: string;
    wins: string;
    losses: string;
    ranking: string;
    totalGames: string;
    winRate: string;
    avgGameTime: string;
    achievements: string;
    profile: string;
    settings: string;
    logout: string;
    roomSettings: string;
    gameSettings: string;
    startingAssets: string;
    gracePeriodLength: string;
    aiOpponents: string;
    enableAI: string;
    aiDifficulty: string;
    easy: string;
    medium: string;
    hard: string;
    expert: string;
    customGame: string;
    quickMatch: string;
    findGame: string;
    joinAnyRoom: string;
    createPrivateRoom: string;
    roomCode: string;
    copyRoomCode: string;
    shareRoom: string;
    inviteFriends: string;
    gameMode: string;
    competitive: string;
    casual: string;
    practice: string;
    tournament: string;
    spectate: string;
    replay: string;
    download: string;
    share: string;
    report: string;
    block: string;
    mute: string;
    unmute: string;
    kick: string;
    ban: string;
    promote: string;
    demote: string;
    transferHost: string;
    roomFull: string;
    roomNotFound: string;
    gameInProgress: string;
    connectionLost: string;
    reconnecting: string;
    reconnected: string;
    serverError: string;
    networkError: string;
    timeout: string;
    playerDisconnected: string;
    playerReconnected: string;
    gameAborted: string;
    gamePaused: string;
    gameResumed: string;
    turnTimer: string;
    yourTurn: string;
    waitingForPlayer: string;
    actionRequired: string;
    decisionPending: string;
    moveCompleted: string;
    invalidMove: string;
    gameEnded: string;
    congratulations: string;
    betterLuckNextTime: string;
    playAgain: string;
    backToLobby: string;
    exitGame: string;
    saveGame: string;
    loadGame: string;
    gameHistory: string;
    recentGames: string;
  };
  
  // 通知消息
  notifications: {
    purchaseSuccess: string;
    purchaseFailure: string;
    recruitmentSuccess: string;
    recruitmentFailure: string;
    buildingUpgraded: string;
    insufficientFunds: string;
    actionCompleted: string;
    aiDecision: string;
    marketManipulation: string;
    companyEliminated: string;
    hostileTakeoverSuccess: string;
    hostileTakeoverFailure: string;
  };
  
  // 动作图例
  actionLegend: {
    title: string;
    purchase: string;
    recruit: string;
    attack: string;
    intelligence: string;
    move: string;
  };
}

export const translations: Record<Language, Translation> = {
  zh: {
    common: {
      confirm: '确认',
      cancel: '取消',
      save: '保存',
      loading: '加载中...',
      error: '错误',
      success: '成功',
      warning: '警告',
      info: '信息',
    },
    game: {
      title: '多智能体商业模拟器',
      subtitle: '征服商业世界',
      description: '一款类似群星风格的2D商业竞争游戏，通过多智能体系统建立商业帝国，消灭竞争对手！',
      company: '公司',
      assets: '资产',
      employees: '员工',
      buildings: '建筑',
      turn: '回合',
      status: '状态',
      actions: '操作',
    },
    company: {
      myCompany: '我的企业',
      competitor: '竞争对手',
      active: '活跃',
      bankrupt: '破产',
      centralizedManagement: '集权管理',
      decentralizedManagement: '去中心化管理',
      neuralWorkforce: '神经网络员工',
      aeroVitaEnterprise: '天翼企业',
    },
    buildings: {
      tradeCenter: '国际贸易中心',
      hospital: '中心医院',
      company: '公司总部',
      realEstate: '房地产交易所',
      hotel: '豪华酒店',
      apartment: '高档公寓',
      purchase: '购买',
      recruit: '招聘',
      upgrade: '升级',
      income: '收入',
      level: '等级',
      owned: '已拥有',
      available: '可用',
    },
    agents: {
      idle: '闲置',
      moving: '移动中',
      working: '工作中',
      attacking: '攻击中',
      selectAgent: '选择智能体',
      moveAgent: '移动智能体',
      purchaseBuilding: '购买建筑',
      recruitEmployee: '招聘员工',
      attack: '攻击',
      intelligence: '情报',
      move: '移动',
      negotiation: '谈判',
      espionage: '间谍',
      management: '管理',
    },
    stockMarket: {
      title: '股票市场',
      manipulation: '市场操纵',
      priceManipulation: '价格操纵',
      volumeManipulation: '成交量操纵',
      newsManipulation: '新闻操纵',
      algorithmicTrading: '算法交易',
      shortSelling: '卖空',
      pumpAndDump: '拉高出货',
      spoofing: '虚假报价',
      execute: '执行',
      cost: '成本',
      success: '成功',
      failure: '失败',
    },
    competition: {
      title: '竞争分析',
      ranking: '排行榜',
      marketShare: '市场份额',
      buildingControl: '建筑控制',
      totalTransactions: '总交易数',
      averageAssetGrowth: '平均资产增长',
      competitionIntensity: '竞争激烈程度',
      riskLevel: '风险级别',
      hostileTakeover: '敌对收购',
      eliminationMechanism: '淘汰机制',
      activated: '已激活',
      gracePeriod: '宽限期',
      timeRemaining: '剩余时间',
      safetyPeriod: '安全期',
      preparingElimination: '淘汰机制准备中',
      aboutToActivate: '即将启动淘汰机制',
      eliminationActivated: '淘汰机制已启用',
      assetsZeroEliminated: '资产为0的公司将被淘汰',
      competitionIntensified: '竞争激化',
    },
    ai: {
      decision: 'AI决策',
      countdown: '倒计时',
      thinking: '思考中',
      ready: '准备就绪',
      nextDecision: '下次决策',
      aiOpponent: 'AI对手',
      strategy: '策略',
      reasoning: '推理',
    },
    victory: {
      victory: '胜利',
      defeat: '失败',
      winner: '获胜者',
      reason: '原因',
      eliminatedAllCompetitors: '消灭了所有竞争对手',
      controlledAssets: '控制了市场资产',
      playerBankrupt: '玩家公司破产',
      marketDominance: '市场主导地位',
    },
    startup: {
      title: 'RESP-X',
      subtitle: 'AeroVita Labs',
      description: '高级多智能体商业模拟',
      poweredBy: '基于AI和分子智能技术',
      initializing: '正在初始化神经网络...',
      copyright: '© 2024 AeroVita Labs. 版权所有.',
      platform: '下一代商业智能平台',
    },
    multiplayer: {
      gameTitle: '多智能体商业模拟器',
      multiplayerLobby: '多人游戏大厅',
      connected: '已连接',
      connecting: '连接中',
      disconnected: '已断线',
      availableRooms: '可用房间',
      createRoom: '创建房间',
      createNewRoom: '创建新房间',
      roomName: '房间名称',
      enterRoomName: '请输入房间名称',
      maxPlayers: '最大玩家数',
      players: '玩家',
      host: '房主',
      join: '加入',
      full: '已满',
      create: '创建',
      refresh: '刷新',
      leaveRoom: '离开房间',
      startGame: '开始游戏',
      needMorePlayers: '需要更多玩家',
      waitingForHost: '等待房主开始游戏',
      gameWillStart: '游戏即将开始，准备好征服商业世界！',
      noRoomsAvailable: '暂无可用房间',
      online: '在线',
      offline: '离线',
      dismiss: '关闭',
      roomJoined: '已加入房间',
      roomLeft: '已离开房间',
      gameStarted: '游戏开始',
      playerJoined: '玩家加入',
      playerLeft: '玩家离开',
      chat: '聊天',
      sendMessage: '发送消息',
      typeMessage: '输入消息...',
      spectatorMode: '观战模式',
      watchGame: '观看游戏',
      playerActions: '玩家操作',
      gameEvents: '游戏事件',
      gameHistory: '游戏历史',
      leaderboard: '排行榜',
      statistics: '统计数据',
      wins: '胜场',
      losses: '败场',
      ranking: '排名',
      totalGames: '总游戏数',
      winRate: '胜率',
      avgGameTime: '平均游戏时间',
      achievements: '成就',
      profile: '个人资料',
      settings: '设置',
      logout: '退出登录',
      roomSettings: '房间设置',
      gameSettings: '游戏设置',
      startingAssets: '初始资产',
      gracePeriodLength: '宽限期时长',
      aiOpponents: 'AI对手',
      enableAI: '启用AI',
      aiDifficulty: 'AI难度',
      easy: '简单',
      medium: '中等',
      hard: '困难',
      expert: '专家',
      customGame: '自定义游戏',
      quickMatch: '快速匹配',
      findGame: '寻找游戏',
      joinAnyRoom: '加入任意房间',
      createPrivateRoom: '创建私人房间',
      roomCode: '房间代码',
      copyRoomCode: '复制房间代码',
      shareRoom: '分享房间',
      inviteFriends: '邀请朋友',
      gameMode: '游戏模式',
      competitive: '竞技',
      casual: '休闲',
      practice: '练习',
      tournament: '锦标赛',
      spectate: '观看',
      replay: '回放',
      download: '下载',
      share: '分享',
      report: '举报',
      block: '屏蔽',
      mute: '静音',
      unmute: '取消静音',
      kick: '踢出',
      ban: '封禁',
      promote: '提升',
      demote: '降级',
      transferHost: '转让房主',
      roomFull: '房间已满',
      roomNotFound: '房间不存在',
      gameInProgress: '游戏进行中',
      connectionLost: '连接丢失',
      reconnecting: '重新连接中',
      reconnected: '已重新连接',
      serverError: '服务器错误',
      networkError: '网络错误',
      timeout: '连接超时',
      playerDisconnected: '玩家断线',
      playerReconnected: '玩家重新连接',
      gameAborted: '游戏中止',
      gamePaused: '游戏暂停',
      gameResumed: '游戏继续',
      turnTimer: '回合计时器',
      yourTurn: '你的回合',
      waitingForPlayer: '等待玩家',
      actionRequired: '需要操作',
      decisionPending: '决策待定',
      moveCompleted: '移动完成',
      invalidMove: '无效移动',
      gameEnded: '游戏结束',
      congratulations: '恭喜',
      betterLuckNextTime: '下次加油',
      playAgain: '再玩一局',
      backToLobby: '返回大厅',
      exitGame: '退出游戏',
      saveGame: '保存游戏',
      loadGame: '加载游戏',
      gameHistory: '游戏历史',
      recentGames: '最近游戏',
    },
    notifications: {
      purchaseSuccess: '成功购买建筑',
      purchaseFailure: '购买失败，资金不足',
      recruitmentSuccess: '成功招聘员工',
      recruitmentFailure: '招聘失败，资金不足',
      buildingUpgraded: '建筑升级完成',
      insufficientFunds: '资金不足',
      actionCompleted: '操作完成',
      aiDecision: 'AI决策',
      marketManipulation: '市场操纵',
      companyEliminated: '公司被淘汰',
      hostileTakeoverSuccess: '敌对收购成功',
      hostileTakeoverFailure: '敌对收购失败',
    },
    actionLegend: {
      title: '操作图例',
      purchase: '购买建筑',
      recruit: '招聘员工',
      attack: '攻击行动',
      intelligence: '情报收集',
      move: '移动',
    },
  },
  en: {
    common: {
      confirm: 'Confirm',
      cancel: 'Cancel',
      save: 'Save',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      warning: 'Warning',
      info: 'Info',
    },
    game: {
      title: 'Multi-Agent Business Simulator',
      subtitle: 'Conquer the Business World',
      description: 'A Stellaris-style 2D business competition game where you build your business empire through multi-agent systems and eliminate competitors!',
      company: 'Company',
      assets: 'Assets',
      employees: 'Employees',
      buildings: 'Buildings',
      turn: 'Turn',
      status: 'Status',
      actions: 'Actions',
    },
    company: {
      myCompany: 'My Company',
      competitor: 'Competitor',
      active: 'Active',
      bankrupt: 'Bankrupt',
      centralizedManagement: 'Centralized Management',
      decentralizedManagement: 'Decentralized Management',
      neuralWorkforce: 'Neural Workforce',
      aeroVitaEnterprise: 'AeroVita Enterprise',
    },
    buildings: {
      tradeCenter: 'International Trade Center',
      hospital: 'Central Hospital',
      company: 'Company Headquarters',
      realEstate: 'Real Estate Exchange',
      hotel: 'Luxury Hotel',
      apartment: 'Premium Apartment',
      purchase: 'Purchase',
      recruit: 'Recruit',
      upgrade: 'Upgrade',
      income: 'Income',
      level: 'Level',
      owned: 'Owned',
      available: 'Available',
    },
    agents: {
      idle: 'Idle',
      moving: 'Moving',
      working: 'Working',
      attacking: 'Attacking',
      selectAgent: 'Select Agent',
      moveAgent: 'Move Agent',
      purchaseBuilding: 'Purchase Building',
      recruitEmployee: 'Recruit Employee',
      attack: 'Attack',
      intelligence: 'Intelligence',
      move: 'Move',
      negotiation: 'Negotiation',
      espionage: 'Espionage',
      management: 'Management',
    },
    stockMarket: {
      title: 'Stock Market',
      manipulation: 'Market Manipulation',
      priceManipulation: 'Price Manipulation',
      volumeManipulation: 'Volume Manipulation',
      newsManipulation: 'News Manipulation',
      algorithmicTrading: 'Algorithmic Trading',
      shortSelling: 'Short Selling',
      pumpAndDump: 'Pump and Dump',
      spoofing: 'Spoofing',
      execute: 'Execute',
      cost: 'Cost',
      success: 'Success',
      failure: 'Failure',
    },
    competition: {
      title: 'Competition Analysis',
      ranking: 'Ranking',
      marketShare: 'Market Share',
      buildingControl: 'Building Control',
      totalTransactions: 'Total Transactions',
      averageAssetGrowth: 'Average Asset Growth',
      competitionIntensity: 'Competition Intensity',
      riskLevel: 'Risk Level',
      hostileTakeover: 'Hostile Takeover',
      eliminationMechanism: 'Elimination Mechanism',
      activated: 'Activated',
      gracePeriod: 'Grace Period',
      timeRemaining: 'Time Remaining',
      safetyPeriod: 'Safety Period',
      preparingElimination: 'Preparing Elimination',
      aboutToActivate: 'About to Activate Elimination',
      eliminationActivated: 'Elimination Mechanism Activated',
      assetsZeroEliminated: 'Companies with zero assets will be eliminated',
      competitionIntensified: 'Competition Intensified',
    },
    ai: {
      decision: 'AI Decision',
      countdown: 'Countdown',
      thinking: 'Thinking',
      ready: 'Ready',
      nextDecision: 'Next Decision',
      aiOpponent: 'AI Opponent',
      strategy: 'Strategy',
      reasoning: 'Reasoning',
    },
    victory: {
      victory: 'Victory',
      defeat: 'Defeat',
      winner: 'Winner',
      reason: 'Reason',
      eliminatedAllCompetitors: 'Eliminated all competitors',
      controlledAssets: 'Controlled market assets',
      playerBankrupt: 'Player company bankrupt',
      marketDominance: 'Market dominance',
    },
    startup: {
      title: 'RESP-X',
      subtitle: 'AeroVita Labs',
      description: 'Advanced Multi-Agent Business Simulation',
      poweredBy: 'Powered by AI & Molecular Intelligence',
      initializing: 'Initializing Neural Networks...',
      copyright: '© 2024 AeroVita Labs. All rights reserved.',
      platform: 'Next-Gen Business Intelligence Platform',
    },
    multiplayer: {
      gameTitle: 'Multi-Agent Business Simulator',
      multiplayerLobby: 'Multiplayer Lobby',
      connected: 'Connected',
      connecting: 'Connecting',
      disconnected: 'Disconnected',
      availableRooms: 'Available Rooms',
      createRoom: 'Create Room',
      createNewRoom: 'Create New Room',
      roomName: 'Room Name',
      enterRoomName: 'Enter room name',
      maxPlayers: 'Max Players',
      players: 'Players',
      host: 'Host',
      join: 'Join',
      full: 'Full',
      create: 'Create',
      refresh: 'Refresh',
      leaveRoom: 'Leave Room',
      startGame: 'Start Game',
      needMorePlayers: 'Need More Players',
      waitingForHost: 'Waiting for host to start',
      gameWillStart: 'Game will start soon, prepare to conquer the business world!',
      noRoomsAvailable: 'No rooms available',
      online: 'Online',
      offline: 'Offline',
      dismiss: 'Dismiss',
      roomJoined: 'Room joined',
      roomLeft: 'Room left',
      gameStarted: 'Game started',
      playerJoined: 'Player joined',
      playerLeft: 'Player left',
      chat: 'Chat',
      sendMessage: 'Send Message',
      typeMessage: 'Type a message...',
      spectatorMode: 'Spectator Mode',
      watchGame: 'Watch Game',
      playerActions: 'Player Actions',
      gameEvents: 'Game Events',
      gameHistory: 'Game History',
      leaderboard: 'Leaderboard',
      statistics: 'Statistics',
      wins: 'Wins',
      losses: 'Losses',
      ranking: 'Ranking',
      totalGames: 'Total Games',
      winRate: 'Win Rate',
      avgGameTime: 'Avg Game Time',
      achievements: 'Achievements',
      profile: 'Profile',
      settings: 'Settings',
      logout: 'Logout',
      roomSettings: 'Room Settings',
      gameSettings: 'Game Settings',
      startingAssets: 'Starting Assets',
      gracePeriodLength: 'Grace Period Length',
      aiOpponents: 'AI Opponents',
      enableAI: 'Enable AI',
      aiDifficulty: 'AI Difficulty',
      easy: 'Easy',
      medium: 'Medium',
      hard: 'Hard',
      expert: 'Expert',
      customGame: 'Custom Game',
      quickMatch: 'Quick Match',
      findGame: 'Find Game',
      joinAnyRoom: 'Join Any Room',
      createPrivateRoom: 'Create Private Room',
      roomCode: 'Room Code',
      copyRoomCode: 'Copy Room Code',
      shareRoom: 'Share Room',
      inviteFriends: 'Invite Friends',
      gameMode: 'Game Mode',
      competitive: 'Competitive',
      casual: 'Casual',
      practice: 'Practice',
      tournament: 'Tournament',
      spectate: 'Spectate',
      replay: 'Replay',
      download: 'Download',
      share: 'Share',
      report: 'Report',
      block: 'Block',
      mute: 'Mute',
      unmute: 'Unmute',
      kick: 'Kick',
      ban: 'Ban',
      promote: 'Promote',
      demote: 'Demote',
      transferHost: 'Transfer Host',
      roomFull: 'Room Full',
      roomNotFound: 'Room Not Found',
      gameInProgress: 'Game In Progress',
      connectionLost: 'Connection Lost',
      reconnecting: 'Reconnecting',
      reconnected: 'Reconnected',
      serverError: 'Server Error',
      networkError: 'Network Error',
      timeout: 'Timeout',
      playerDisconnected: 'Player Disconnected',
      playerReconnected: 'Player Reconnected',
      gameAborted: 'Game Aborted',
      gamePaused: 'Game Paused',
      gameResumed: 'Game Resumed',
      turnTimer: 'Turn Timer',
      yourTurn: 'Your Turn',
      waitingForPlayer: 'Waiting for Player',
      actionRequired: 'Action Required',
      decisionPending: 'Decision Pending',
      moveCompleted: 'Move Completed',
      invalidMove: 'Invalid Move',
      gameEnded: 'Game Ended',
      congratulations: 'Congratulations',
      betterLuckNextTime: 'Better Luck Next Time',
      playAgain: 'Play Again',
      backToLobby: 'Back to Lobby',
      exitGame: 'Exit Game',
      saveGame: 'Save Game',
      loadGame: 'Load Game',
      gameHistory: 'Game History',
      recentGames: 'Recent Games',
    },
    notifications: {
      purchaseSuccess: 'Successfully purchased building',
      purchaseFailure: 'Purchase failed, insufficient funds',
      recruitmentSuccess: 'Successfully recruited employee',
      recruitmentFailure: 'Recruitment failed, insufficient funds',
      buildingUpgraded: 'Building upgraded successfully',
      insufficientFunds: 'Insufficient funds',
      actionCompleted: 'Action completed',
      aiDecision: 'AI Decision',
      marketManipulation: 'Market Manipulation',
      companyEliminated: 'Company eliminated',
      hostileTakeoverSuccess: 'Hostile takeover successful',
      hostileTakeoverFailure: 'Hostile takeover failed',
    },
    actionLegend: {
      title: 'Action Legend',
      purchase: 'Purchase Building',
      recruit: 'Recruit Employee',
      attack: 'Attack Action',
      intelligence: 'Intelligence Gathering',
      move: 'Move',
    },
  },
};