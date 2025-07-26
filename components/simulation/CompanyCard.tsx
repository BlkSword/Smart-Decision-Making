'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, DollarSign, Users, TrendingUp, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedCurrency } from '@/components/ui/animated-number';
import { AnimatedCounter } from '@/components/ui/animated-number';
import { AnimatedPercentage } from '@/components/ui/animated-number';

interface Company {
  id: string;
  name: string;
  company_type: 'centralized' | 'decentralized';
  funds: number;
  size: number;
  is_active: boolean;
  productivity?: number;
  innovation?: number;
  efficiency?: number;
}

interface CompanyCardProps {
  company: Company;
  isSelected?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onDelete?: (companyId: string) => void;
}

export function CompanyCard({ company, isSelected = false, onClick, onDoubleClick, onDelete }: CompanyCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 防止事件冒泡
    onClick?.();
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 防止事件冒泡
    onDoubleClick?.();
  };
  
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发卡片点击事件
    if (onDelete && !isDeleting) {
      if (confirm(`确定要删除公司 "${company.name}" 吗？此操作不可撤销。`)) {
        setIsDeleting(true);
        try {
          await onDelete(company.id);
        } finally {
          setIsDeleting(false);
        }
      }
    }
  };

  const getCompanyTypeLabel = (type: string) => {
    return type === 'centralized' ? '集权制' : '去中心化';
  };

  const getCompanyTypeColor = (type: string) => {
    return type === 'centralized' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        isSelected && "ring-2 ring-primary ring-offset-2",
        !company.is_active && "opacity-60"
      )}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">{company.name}</CardTitle>
          </div>
          <Badge 
            variant="secondary" 
            className={getCompanyTypeColor(company.company_type)}
          >
            {getCompanyTypeLabel(company.company_type)}
          </Badge>
        </div>
        <CardDescription>
          {company.company_type === 'centralized' 
            ? 'CEO-经理-员工三级决策架构' 
            : '扁平化协作决策架构'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4">
          {/* 资金 */}
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-sm font-medium">
                <AnimatedCurrency value={company.funds} />
              </p>
              <p className="text-xs text-muted-foreground">资金</p>
            </div>
          </div>
          
          {/* 规模 */}
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-sm font-medium">
                <AnimatedCounter value={company.size} suffix=" 人" />
              </p>
              <p className="text-xs text-muted-foreground">团队规模</p>
            </div>
          </div>
        </div>
        
        {/* 公司指标 */}
        {(company.productivity || company.innovation || company.efficiency) && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center space-x-4 text-xs">
              {company.productivity && (
                <div className="flex items-center space-x-1">
                  <TrendingUp className="h-3 w-3 text-orange-500" />
                  <span>生产力: <AnimatedPercentage value={company.productivity} /></span>
                </div>
              )}
              {company.innovation && (
                <div className="flex items-center space-x-1">
                  <TrendingUp className="h-3 w-3 text-purple-500" />
                  <span>创新: <AnimatedPercentage value={company.innovation} /></span>
                </div>
              )}
              {company.efficiency && (
                <div className="flex items-center space-x-1">
                  <TrendingUp className="h-3 w-3 text-blue-500" />
                  <span>效率: <AnimatedPercentage value={company.efficiency} /></span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* 状态指示器 */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              company.is_active ? "bg-green-500" : "bg-gray-400"
            )} />
            <span className="text-sm text-muted-foreground">
              {company.is_active ? '运营中' : '已停止'}
            </span>
          </div>
          
          {isSelected && (
            <Badge variant="outline" className="text-xs">
              已选中
            </Badge>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}