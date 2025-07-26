"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  Users, 
  Sword, 
  Eye, 
  Move,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle
} from 'lucide-react';

interface ActionLegendProps {
  className?: string;
}

export const ActionLegend: React.FC<ActionLegendProps> = ({ className = "" }) => {
  const actions = [
    {
      type: 'purchase_building',
      name: '购买建筑',
      color: '#ffffff',
      icon: <ShoppingCart className="w-4 h-4" />,
      description: '移动到建筑并购买',
      cost: '建筑等级 × ¥100,000',
      effect: '获得建筑所有权和收益',
      lineStyle: 'solid white line'
    },
    {
      type: 'recruit_employee',
      name: '招聘员工',
      color: '#3b82f6',
      icon: <Users className="w-4 h-4" />,
      description: '前往贸易中心招聘',
      cost: '¥50,000',
      effect: '增加1名员工',
      lineStyle: 'solid blue line'
    },
    {
      type: 'attack',
      name: '敌对行动',
      color: '#ef4444',
      icon: <Sword className="w-4 h-4" />,
      description: '攻击敌方建筑',
      cost: '¥100,000',
      effect: '成功时夺取建筑，失败时造成损失',
      lineStyle: 'solid red line'
    },
    {
      type: 'intelligence',
      name: '情报收集',
      color: '#f59e0b',
      icon: <Eye className="w-4 h-4" />,
      description: '渗透敌方公司',
      cost: '¥30,000',
      effect: '成功时窃取5%资产',
      lineStyle: 'solid yellow line'
    },
    {
      type: 'move',
      name: '普通移动',
      color: '#6b7280',
      icon: <Move className="w-4 h-4" />,
      description: '移动到指定位置',
      cost: '免费',
      effect: '无特殊效果',
      lineStyle: 'solid gray line'
    }
  ];

  return (
    <Card className={`bg-gray-800 border-gray-600 ${className}`}>
      <CardHeader>
        <CardTitle className="text-white text-sm">智能体行动指南</CardTitle>
        <CardDescription className="text-gray-400 text-xs">
          不同颜色的虚线表示不同的行动类型
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action) => (
          <div key={action.type} className="flex items-start gap-3 p-2 bg-gray-700 rounded-sm">
            {/* 颜色指示器 */}
            <div className="flex items-center gap-2 min-w-0">
              <div 
                className="w-4 h-1 rounded"
                style={{ backgroundColor: action.color }}
              />
              <div className="text-white" style={{ color: action.color }}>
                {action.icon}
              </div>
            </div>
            
            {/* 行动信息 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white text-sm font-medium">{action.name}</span>
                <Badge 
                  variant="outline" 
                  className="text-xs"
                  style={{ borderColor: action.color, color: action.color }}
                >
                  {action.cost}
                </Badge>
              </div>
              <div className="text-gray-300 text-xs mb-1">{action.description}</div>
              <div className="text-gray-400 text-xs">{action.effect}</div>
            </div>
          </div>
        ))}
        
        {/* 成功/失败指示器 */}
        <div className="mt-4 pt-3 border-t border-gray-600">
          <div className="text-white text-sm font-medium mb-2">行动结果</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <TrendingUp className="w-3 h-3 text-green-400" />
              <span className="text-green-400">成功：获得预期效果</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <TrendingDown className="w-3 h-3 text-red-400" />
              <span className="text-red-400">失败：仅扣除成本</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <AlertTriangle className="w-3 h-3 text-yellow-400" />
              <span className="text-yellow-400">风险：技能影响成功率</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};