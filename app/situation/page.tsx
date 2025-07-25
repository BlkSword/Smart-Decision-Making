'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
// 动态导入组件避免SSR问题
const SituationScreen = dynamic(() => import('@/components/simulation/SituationScreen'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">加载态势屏幕组件...</p>
      </div>
    </div>
  )
});
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Company {
  id: string;
  name: string;
  type: 'centralized' | 'decentralized';
  funds: number;
  employees: Employee[];
  status: 'active' | 'inactive';
}

interface Employee {
  id: string;
  name: string;
  role: 'ceo' | 'manager' | 'employee';
  company_id: string;
  status: 'active' | 'thinking' | 'deciding' | 'idle';
}

interface Decision {
  id: string;
  company_id: string;
  employee_id: string;
  type: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
}

export default function SituationPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [wsEvents, setWsEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // 确保在客户端运行
  useEffect(() => {
    setIsClient(true);
    setIsMounted(true);
  }, []);

  // 获取初始数据 - 仅在客户端挂载后运行
  useEffect(() => {
    if (!isMounted) return;
    
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        
        // 使用相对路径API调用，避免CORS问题
        const response = await fetch('/api/situation/full-data', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) {
          throw new Error('Failed to fetch situation data');
        }
        
        const data = await response.json();
        
        // 转换数据格式以适配前端组件
        const transformedCompanies = data.topology?.nodes
          ?.filter((node: any) => node.type === 'company')
          ?.map((node: any) => ({
            id: node.id,
            name: node.name,
            type: node.company_type,
            funds: node.funds || 100000,
            employees: data.topology?.nodes
              ?.filter((n: any) => n.type === 'employee' && n.company_id === node.id)
              ?.map((emp: any) => ({
                id: emp.id,
                name: emp.name,
                role: emp.role,
                company_id: emp.company_id,
                status: emp.status
              })) || [],
            status: node.status
          })) || [];
        
        const transformedDecisions = data.topology?.nodes
          ?.filter((node: any) => node.type === 'decision')
          ?.map((node: any) => {
            // 从连接中找到此决策的发起者
            const decisionLink = data.topology?.links?.find((link: any) => 
              link.target === node.id && link.type === 'decision'
            );
            const employeeId = decisionLink ? decisionLink.source : '';
            
            // 从员工ID推导公司ID
            const employee = data.topology?.nodes?.find((n: any) => n.id === employeeId);
            const companyId = employee ? employee.company_id : '';
            
            return {
              id: node.id.replace('decision_', ''),
              company_id: companyId,
              employee_id: employeeId,
              type: node.name.replace('决策: ', ''),
              content: node.description || '',
              status: 'pending',
              timestamp: new Date().toISOString()
            };
          }) || [];
        
        setCompanies(transformedCompanies);
        setDecisions(transformedDecisions);
        
        // 设置初始活动数据
        if (data.activities) {
          setWsEvents(data.activities);
        }
        
      } catch (err) {
        console.error('Error fetching situation data:', err);
        setError('无法连接到后端服务，请确保后端服务正在运行');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [isMounted]);

  // WebSocket连接 - 仅在客户端执行
  useEffect(() => {
    if (!isClient) return;
    
    const connectWebSocket = () => {
      try {
        // 直接连接到后端WebSocket服务
        const wsUrl = `ws://localhost:8000/ws/situation_${Date.now()}`;
        const websocket = new WebSocket(wsUrl);
        
        websocket.onopen = () => {
          console.log('WebSocket connected');
          setWs(websocket);
        };
        
        websocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setWsEvents(prev => [...prev.slice(-49), data]); // 保持最近50条事件
            
            // 根据事件类型更新相应数据
            if (data.type === 'company_update' && data.company) {
              setCompanies(prev => 
                prev.map(c => c.id === data.company.id ? data.company : c)
              );
            }
            
            if (data.type === 'decision_update' && data.decision) {
              setDecisions(prev => {
                const existing = prev.find(d => d.id === data.decision.id);
                if (existing) {
                  return prev.map(d => d.id === data.decision.id ? data.decision : d);
                } else {
                  return [...prev, data.decision];
                }
              });
            }
            
            if (data.type === 'employee_update' && data.employee) {
              setCompanies(prev => 
                prev.map(company => ({
                  ...company,
                  employees: company.employees.map(emp => 
                    emp.id === data.employee.id ? data.employee : emp
                  )
                }))
              );
            }
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
          }
        };
        
        websocket.onclose = () => {
          console.log('WebSocket disconnected');
          setWs(null);
          // 尝试重连
          setTimeout(() => {
            if (!websocket || websocket.readyState === WebSocket.CLOSED) {
              connectWebSocket();
            }
          }, 5000);
        };
        
        websocket.onerror = (error) => {
          console.error('WebSocket error:', error);
        };
        
      } catch (err) {
        console.error('Failed to connect WebSocket:', err);
        // 尝试重连
        setTimeout(connectWebSocket, 5000);
      }
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [isClient]);

  // 防止服务端渲染不匹配 - 在所有hooks之后检查
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">初始化系统...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">加载态势屏幕</h2>
          <p className="text-gray-600">正在获取AI商战数据...</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.958-.833-2.728 0L4.086 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2">加载失败</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-2">
            <Button onClick={() => window.location.reload()}>
              重试
            </Button>
            <div>
              <Link href="/simulation">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  返回模拟页面
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="bg-white border-b px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/simulation">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回模拟
              </Button>
            </Link>
            <div className="h-6 border-l border-gray-300"></div>
            <h1 className="text-xl font-bold">AI商战态势屏幕</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${ws ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {ws ? '实时连接' : '连接断开'}
            </span>
          </div>
        </div>
      </div>

      {/* 态势屏幕主体 */}
      <div className="h-[calc(100vh-73px)]">
        {isClient ? (
          <SituationScreen
            companies={companies}
            decisions={decisions}
            wsEvents={wsEvents}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-lg text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">初始化态势屏幕...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}