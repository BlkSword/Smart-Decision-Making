'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, DollarSign, Users, Loader2 } from 'lucide-react';

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
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
          
          {/* 公司规模 */}
          <div className="space-y-2">
            <Label htmlFor="size">公司规模 (员工数)</Label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="size"
                type="number"
                value={formData.size}
                onChange={(e) => setFormData(prev => ({ ...prev, size: parseInt(e.target.value) }))}
                placeholder="25"
                min={formData.type === 'centralized' ? "4" : "1"}
                max="100"
                className="pl-10"
                required
                disabled={loading}
              />
            </div>
            {formData.type === 'centralized' && (
              <p className="text-xs text-muted-foreground">
                集权公司至少需要4名员工（1名CEO + 3名经理）
              </p>
            )}
          </div>
          
          {/* 错误信息 */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={loading}
            >
              取消
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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