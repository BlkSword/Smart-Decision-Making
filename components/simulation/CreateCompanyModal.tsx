'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, DollarSign, Users, Loader2 } from 'lucide-react';

interface EmployeeConfig {
  role: string;
  level: number;
  experience: number;
  aiPersonality: string;
  decisionStyle: string;
}

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// 预定义的AI性格和决策风格选项
const AI_PERSONALITIES = [
  "分析型、喜欢深入分析数据、重视逻辑思考",
  "创新型、富有创造力、善于提出新想法",
  "实用型、注重实际效果、偏好可行方案",
  "合作型、善于团队合作、重视沟通协调",
  "领导型、具有领导才能、善于激励他人",
  "谨慎型、工作认真负责、具有专业精神"
];

const DECISION_STYLES = [
  "数据驱动",
  "直觉导向",
  "合作导向",
  "结果导向",
  "风险偏好",
  "稳健优先",
  "创新导向",
  "传统导向"
];

export const CreateCompanyModal: React.FC<CreateCompanyModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'centralized',
    initial_funding: 50000,
    size: 25
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmployeeConfig, setShowEmployeeConfig] = useState(false);
  const [employeeConfigs, setEmployeeConfigs] = useState<EmployeeConfig[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const requestData: any = {
        name: formData.name,
        type: formData.type,
        initial_funding: formData.initial_funding,
        size: formData.size
      };

      // 如果配置了员工信息，则添加到请求中
      if (showEmployeeConfig && employeeConfigs.length > 0) {
        requestData.employees = employeeConfigs.map(config => ({
          role: config.role,
          level: config.level,
          experience: config.experience,
          ai_personality: config.aiPersonality,
          decision_style: config.decisionStyle
        }));
      }

      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        onSuccess();
        onClose();
        // 重置表单
        setFormData({
          name: '',
          type: 'centralized',
          initial_funding: 50000,
          size: 25
        });
        setEmployeeConfigs([]);
        setShowEmployeeConfig(false);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || '创建公司失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('Error creating company:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setError(null);
    }
  };

  // 初始化员工配置
  const initializeEmployeeConfigs = () => {
    const configs: EmployeeConfig[] = [];
    const size = formData.size;
    
    if (formData.type === 'centralized') {
      // 集权公司结构: 1个CEO + 3个经理 + 其余员工
      configs.push({
        role: 'ceo',
        level: 3,
        experience: Math.floor(Math.random() * 20) + 80, // 80-100
        aiPersonality: AI_PERSONALITIES[Math.floor(Math.random() * AI_PERSONALITIES.length)],
        decisionStyle: DECISION_STYLES[Math.floor(Math.random() * DECISION_STYLES.length)]
      });
      
      for (let i = 0; i < 3; i++) {
        configs.push({
          role: 'manager',
          level: 2,
          experience: Math.floor(Math.random() * 30) + 50, // 50-80
          aiPersonality: AI_PERSONALITIES[Math.floor(Math.random() * AI_PERSONALITIES.length)],
          decisionStyle: DECISION_STYLES[Math.floor(Math.random() * DECISION_STYLES.length)]
        });
      }
      
      const remainingEmployees = Math.max(0, size - 4);
      for (let i = 0; i < remainingEmployees; i++) {
        configs.push({
          role: 'employee',
          level: 1,
          experience: Math.floor(Math.random() * 30) + 20, // 20-50
          aiPersonality: AI_PERSONALITIES[Math.floor(Math.random() * AI_PERSONALITIES.length)],
          decisionStyle: DECISION_STYLES[Math.floor(Math.random() * DECISION_STYLES.length)]
        });
      }
    } else {
      // 去中心化公司: 全部为员工
      for (let i = 0; i < size; i++) {
        configs.push({
          role: 'employee',
          level: 2,
          experience: Math.floor(Math.random() * 40) + 30, // 30-70
          aiPersonality: AI_PERSONALITIES[Math.floor(Math.random() * AI_PERSONALITIES.length)],
          decisionStyle: DECISION_STYLES[Math.floor(Math.random() * DECISION_STYLES.length)]
        });
      }
    }
    
    setEmployeeConfigs(configs);
    setShowEmployeeConfig(true);
  };

  // 更新员工配置
  const updateEmployeeConfig = (index: number, field: keyof EmployeeConfig, value: string | number) => {
    const updatedConfigs = [...employeeConfigs];
    (updatedConfigs[index][field] as any) = value;
    setEmployeeConfigs(updatedConfigs);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            创建新公司
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 公司名称 */}
          <div className="space-y-2">
            <Label htmlFor="name">公司名称</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="输入公司名称"
              required
              disabled={loading}
            />
          </div>

          {/* 公司类型 */}
          <div className="space-y-3">
            <Label>公司类型</Label>
            <RadioGroup
              value={formData.type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
              disabled={loading}
            >
              <div className="space-y-2">
                <Card className="p-3">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="centralized" id="centralized" />
                    <Label htmlFor="centralized" className="flex-1 cursor-pointer">
                      <div className="font-medium">集权型公司</div>
                      <div className="text-sm text-muted-foreground">
                        CEO → 经理 → 员工的层级决策结构
                      </div>
                    </Label>
                  </div>
                </Card>

                <Card className="p-3">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="decentralized" id="decentralized" />
                    <Label htmlFor="decentralized" className="flex-1 cursor-pointer">
                      <div className="font-medium">去中心化公司</div>
                      <div className="text-sm text-muted-foreground">
                        扁平化协作决策结构
                      </div>
                    </Label>
                  </div>
                </Card>
              </div>
            </RadioGroup>
          </div>

          {/* 公司规模 */}
          <div className="space-y-2">
            <Label htmlFor="size">公司规模 (员工数量)</Label>
            <div className="flex items-center gap-2">
              <Users className="text-gray-400 w-4 h-4" />
              <Input
                id="size"
                type="number"
                value={formData.size}
                onChange={(e) => setFormData(prev => ({ ...prev, size: parseInt(e.target.value) || 1 }))}
                placeholder="25"
                min="1"
                max="100"
                className="flex-1"
                required
                disabled={loading}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {formData.type === 'centralized' 
                ? '集权型公司至少需要4名员工 (1名CEO + 3名经理)' 
                : '去中心化公司至少需要1名员工'}
            </p>
          </div>

          {/* 初始资金 */}
          <div className="space-y-2">
            <Label htmlFor="funding">初始资金</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="funding"
                type="number"
                value={formData.initial_funding}
                onChange={(e) => setFormData(prev => ({ ...prev, initial_funding: parseInt(e.target.value) }))}
                placeholder="50000"
                min="10000"
                max="1000000"
                step="1000"
                className="pl-10"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* 员工配置 */}
          {!showEmployeeConfig ? (
            <div className="space-y-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={initializeEmployeeConfigs}
                disabled={loading || formData.size < (formData.type === 'centralized' ? 4 : 1)}
                className="w-full"
              >
                配置员工角色和性格特点
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                可以自定义员工的角色、等级、经验、性格特点和决策风格
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>员工配置</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowEmployeeConfig(false)}
                >
                  重新配置
                </Button>
              </div>
              
              <div className="space-y-4 max-h-60 overflow-y-auto p-2">
                {employeeConfigs.map((config, index) => (
                  <Card key={index} className="p-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm">角色</Label>
                        <div className="font-medium capitalize">{config.role}</div>
                      </div>
                      
                      <div>
                        <Label className="text-sm">等级</Label>
                        <select
                          value={config.level}
                          onChange={(e) => updateEmployeeConfig(index, 'level', parseInt(e.target.value))}
                          className="w-full p-2 border rounded"
                          disabled={loading}
                        >
                          {[1, 2, 3].map(level => (
                            <option key={level} value={level}>等级 {level}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <Label className="text-sm">工作经验</Label>
                        <Input
                          type="number"
                          value={config.experience}
                          onChange={(e) => updateEmployeeConfig(index, 'experience', parseInt(e.target.value) || 0)}
                          min="0"
                          max="100"
                          disabled={loading}
                        />
                      </div>
                      
                      <div>
                        <Label className="text-sm">AI性格</Label>
                        <select
                          value={config.aiPersonality}
                          onChange={(e) => updateEmployeeConfig(index, 'aiPersonality', e.target.value)}
                          className="w-full p-2 border rounded"
                          disabled={loading}
                        >
                          {AI_PERSONALITIES.map(personality => (
                            <option key={personality} value={personality}>{personality.split('、')[0]}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="md:col-span-2">
                        <Label className="text-sm">决策风格</Label>
                        <select
                          value={config.decisionStyle}
                          onChange={(e) => updateEmployeeConfig(index, 'decisionStyle', e.target.value)}
                          className="w-full p-2 border rounded"
                          disabled={loading}
                        >
                          {DECISION_STYLES.map(style => (
                            <option key={style} value={style}>{style}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* 错误信息 */}
          {error && (
            <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
              {error}
            </div>
          )}

          {/* 操作按钮 */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              取消
            </Button>
            <Button type="submit" disabled={loading || (showEmployeeConfig && employeeConfigs.length === 0)}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  创建中...
                </>
              ) : (
                '创建公司'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};