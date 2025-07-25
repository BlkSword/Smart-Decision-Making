'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface DecisionEvent {
  id: string;
  type: 'initiate' | 'approve' | 'reject' | 'feedback' | 'escalate';
  from_node: string;
  to_node: string;
  timestamp: number;
  description: string;
  decision_id: string;
}

interface DecisionFlowVisualizerProps {
  width: number;
  height: number;
  nodes: any[];
  links: any[];
  decisionEvents: DecisionEvent[];
  onEventClick?: (event: DecisionEvent) => void;
}

const DecisionFlowVisualizer: React.FC<DecisionFlowVisualizerProps> = ({
  width,
  height,
  nodes,
  links,
  decisionEvents,
  onEventClick
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeEvents, setActiveEvents] = useState<DecisionEvent[]>([]);
  const [flowParticles, setFlowParticles] = useState<any[]>([]);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    
    // 清除现有内容
    svg.selectAll('.flow-layer').remove();
    
    // 创建流动效果层
    const flowLayer = svg.append('g').attr('class', 'flow-layer');
    
    // 创建决策流动路径
    const createDecisionFlowPath = (fromNode: any, toNode: any) => {
      const dx = toNode.x - fromNode.x;
      const dy = toNode.y - fromNode.y;
      const dr = Math.sqrt(dx * dx + dy * dy) * 0.3; // 曲线控制
      
      return `M ${fromNode.x},${fromNode.y} A ${dr},${dr} 0 0,1 ${toNode.x},${toNode.y}`;
    };

    // 绘制决策流动路径
    const drawDecisionFlows = () => {
      const flowPaths = flowLayer.selectAll('.flow-path')
        .data(activeEvents)
        .enter()
        .append('path')
        .attr('class', 'flow-path')
        .attr('d', (d: DecisionEvent) => {
          const fromNode = nodes.find(n => n.id === d.from_node);
          const toNode = nodes.find(n => n.id === d.to_node);
          if (!fromNode || !toNode) return '';
          return createDecisionFlowPath(fromNode, toNode);
        })
        .attr('stroke', (d: DecisionEvent) => {
          switch (d.type) {
            case 'initiate': return '#3b82f6';
            case 'approve': return '#10b981';
            case 'reject': return '#ef4444';
            case 'feedback': return '#f59e0b';
            case 'escalate': return '#8b5cf6';
            default: return '#6b7280';
          }
        })
        .attr('stroke-width', 3)
        .attr('fill', 'none')
        .attr('opacity', 0.7)
        .attr('stroke-dasharray', '8,4');

      // 添加流动动画
      flowPaths.style('stroke-dashoffset', 20)
        .transition()
        .duration(2000)
        .ease(d3.easeLinear)
        .style('stroke-dashoffset', 0)
        .on('end', function() {
          d3.select(this).remove();
        });

      return flowPaths;
    };

    // 创建决策粒子动画
    const createDecisionParticles = () => {
      activeEvents.forEach((event, index) => {
        const fromNode = nodes.find(n => n.id === event.from_node);
        const toNode = nodes.find(n => n.id === event.to_node);
        
        if (!fromNode || !toNode) return;

        // 创建粒子
        const particle = flowLayer.append('circle')
          .attr('class', 'decision-particle')
          .attr('r', 4)
          .attr('cx', fromNode.x)
          .attr('cy', fromNode.y)
          .attr('fill', (d) => {
            switch (event.type) {
              case 'initiate': return '#3b82f6';
              case 'approve': return '#10b981';
              case 'reject': return '#ef4444';
              case 'feedback': return '#f59e0b';
              case 'escalate': return '#8b5cf6';
              default: return '#6b7280';
            }
          })
          .attr('opacity', 0.9)
          .style('filter', 'drop-shadow(0 0 4px rgba(255,255,255,0.8))');

        // 粒子移动动画
        particle.transition()
          .duration(1500)
          .ease(d3.easeCubicInOut)
          .attr('cx', toNode.x)
          .attr('cy', toNode.y)
          .on('end', function() {
            // 到达目标时创建爆炸效果
            const explosion = flowLayer.append('circle')
              .attr('cx', toNode.x)
              .attr('cy', toNode.y)
              .attr('r', 0)
              .attr('fill', 'none')
              .attr('stroke', particle.attr('fill'))
              .attr('stroke-width', 2)
              .attr('opacity', 0.8);

            explosion.transition()
              .duration(500)
              .attr('r', 20)
              .attr('opacity', 0)
              .on('end', function() {
                d3.select(this).remove();
              });

            d3.select(this).remove();
          });

        // 延迟启动以错开粒子
        setTimeout(() => {
          particle.node() && particle.transition();
        }, index * 200);
      });
    };

    // 绘制状态变化指示器
    const drawStatusIndicators = () => {
      const statusNodes = nodes.filter(n => n.status === 'thinking' || n.status === 'deciding');
      
      statusNodes.forEach(node => {
        // 创建脉冲圆环
        const pulseRing = flowLayer.append('circle')
          .attr('class', 'status-pulse')
          .attr('cx', node.x)
          .attr('cy', node.y)
          .attr('r', 15)
          .attr('fill', 'none')
          .attr('stroke', node.status === 'thinking' ? '#f59e0b' : '#ef4444')
          .attr('stroke-width', 2)
          .attr('opacity', 0.8);

        // 脉冲动画
        const pulseAnimation = () => {
          pulseRing.transition()
            .duration(1000)
            .attr('r', 25)
            .attr('opacity', 0)
            .on('end', () => {
              pulseRing.attr('r', 15).attr('opacity', 0.8);
              if (node.status === 'thinking' || node.status === 'deciding') {
                pulseAnimation();
              } else {
                pulseRing.remove();
              }
            });
        };
        
        pulseAnimation();
      });
    };

    // 绘制决策链
    const drawDecisionChains = () => {
      const decisionChains = new Map();
      
      // 分组决策事件构建决策链
      decisionEvents.forEach(event => {
        if (!decisionChains.has(event.decision_id)) {
          decisionChains.set(event.decision_id, []);
        }
        decisionChains.get(event.decision_id).push(event);
      });

      decisionChains.forEach((chain, decisionId) => {
        // 按时间排序
        chain.sort((a: DecisionEvent, b: DecisionEvent) => a.timestamp - b.timestamp);
        
        // 绘制决策链路径
        if (chain.length > 1) {
          const chainPath = flowLayer.append('path')
            .attr('class', 'decision-chain')
            .attr('stroke', '#8b5cf6')
            .attr('stroke-width', 2)
            .attr('fill', 'none')
            .attr('opacity', 0.3)
            .attr('stroke-dasharray', '10,5');

          const pathData = chain.map((event: DecisionEvent, index: number) => {
            const fromNode = nodes.find(n => n.id === event.from_node);
            const toNode = nodes.find(n => n.id === event.to_node);
            
            if (!fromNode || !toNode) return null;
            
            return index === 0 ? 
              `M ${fromNode.x},${fromNode.y} L ${toNode.x},${toNode.y}` :
              `L ${toNode.x},${toNode.y}`;
          }).filter(Boolean).join(' ');

          chainPath.attr('d', pathData);
        }
      });
    };

    // 执行绘制
    drawDecisionFlows();
    createDecisionParticles();
    drawStatusIndicators();
    drawDecisionChains();

  }, [nodes, activeEvents]);

  // 处理决策事件
  useEffect(() => {
    if (!decisionEvents.length) return;

    // 模拟实时事件流
    const eventQueue = [...decisionEvents].sort((a, b) => a.timestamp - b.timestamp);
    let currentTime = Date.now();

    const processEvents = () => {
      const recentEvents = eventQueue.filter(event => 
        event.timestamp > currentTime - 5000 && event.timestamp <= currentTime
      );

      setActiveEvents(recentEvents);
      currentTime += 1000; // 每秒推进

      // 继续处理下一批事件
      if (eventQueue.some(event => event.timestamp > currentTime - 5000)) {
        setTimeout(processEvents, 1000);
      }
    };

    processEvents();
  }, [decisionEvents]);

  return (
    <div className="decision-flow-visualizer">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 10 }}
      >
      </svg>
      
      {/* 决策事件面板 */}
      {activeEvents.length > 0 && (
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg max-w-sm">
          <h3 className="font-semibold text-sm mb-2">实时决策流</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {activeEvents.map(event => (
              <div 
                key={event.id}
                className="text-xs p-2 rounded border-l-4 cursor-pointer hover:bg-gray-50"
                style={{
                  borderLeftColor: {
                    'initiate': '#3b82f6',
                    'approve': '#10b981',
                    'reject': '#ef4444',
                    'feedback': '#f59e0b',
                    'escalate': '#8b5cf6'
                  }[event.type] || '#6b7280'
                }}
                onClick={() => onEventClick?.(event)}
              >
                <div className="font-medium">
                  {event.type === 'initiate' && '发起决策'}
                  {event.type === 'approve' && '批准决策'}
                  {event.type === 'reject' && '拒绝决策'}
                  {event.type === 'feedback' && '反馈意见'}
                  {event.type === 'escalate' && '升级决策'}
                </div>
                <div className="text-gray-600">{event.description}</div>
                <div className="text-gray-400">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 图例 */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
        <h4 className="font-semibold text-xs mb-2">决策流图例</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-1 bg-blue-500"></div>
            <span>发起</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-1 bg-green-500"></div>
            <span>批准</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-1 bg-red-500"></div>
            <span>拒绝</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-1 bg-yellow-500"></div>
            <span>反馈</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-1 bg-purple-500"></div>
            <span>升级</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DecisionFlowVisualizer;