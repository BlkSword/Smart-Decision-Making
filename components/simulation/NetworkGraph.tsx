'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface Node {
  id: string;
  name: string;
  type: 'company' | 'employee' | 'decision';
  role?: 'ceo' | 'manager' | 'employee';
  company_id?: string;
  status: 'active' | 'thinking' | 'deciding' | 'idle';
  company_type?: 'centralized' | 'decentralized';
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface Link {
  source: string | Node;
  target: string | Node;
  type: 'hierarchy' | 'decision' | 'communication' | 'feedback';
  strength: number;
  status: 'active' | 'inactive';
}

interface NetworkGraphProps {
  nodes: Node[];
  links: Link[];
  width?: number;
  height?: number;
  onNodeClick?: (node: Node) => void;
  onNodeHover?: (node: Node | null) => void;
  maxNodes?: number;  // 最大节点数量
  enableClustering?: boolean;  // 是否启用聚类
  performanceMode?: boolean;  // 高性能模式
}

const NetworkGraph: React.FC<NetworkGraphProps> = ({
  nodes,
  links,
  width = 1200,
  height = 800,
  onNodeClick,
  onNodeHover,
  maxNodes = 100,
  enableClustering = false,
  performanceMode = false
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [visibleNodes, setVisibleNodes] = useState<Node[]>([]);
  const [visibleLinks, setVisibleLinks] = useState<Link[]>([]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isRendering, setIsRendering] = useState(false);

  // 数据分层和过滤
  const optimizeData = React.useCallback(() => {
    let processedNodes = [...nodes];
    let processedLinks = [...links];
    
    // 首先验证和清理数据
    const nodeIds = new Set(processedNodes.map(n => n.id));
    processedLinks = processedLinks.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      
      // 确保source和target都存在
      if (!sourceId || !targetId) {
        console.warn('Link missing source or target:', link);
        return false;
      }
      
      // 确保引用的节点存在
      if (!nodeIds.has(sourceId) || !nodeIds.has(targetId)) {
        console.warn('Link references non-existent node:', { sourceId, targetId, availableNodes: Array.from(nodeIds) });
        return false;
      }
      
      return true;
    });
    
    // 如果节点数量超过限制，实现分层
    if (nodes.length > maxNodes) {
      // 优先级排序：公司 > CEO > 经理 > 员工
      const priorityMap = {
        'company': 1000,
        'employee': (node: Node) => {
          switch (node.role) {
            case 'ceo': return 900;
            case 'manager': return 700;
            case 'employee': return 500;
            default: return 300;
          }
        },
        'decision': 400
      };
      
      processedNodes = nodes
        .map(node => ({
          ...node,
          priority: node.type === 'employee' ? priorityMap.employee(node) : priorityMap[node.type] || 100
        }))
        .sort((a, b) => (b as any).priority - (a as any).priority)
        .slice(0, maxNodes);
      
      // 重新过滤相关连接
      const visibleNodeIds = new Set(processedNodes.map(n => n.id));
      processedLinks = processedLinks.filter(link => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;
        return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
      });
    }
    
    // 根据缩放级别调整细节层次
    if (performanceMode && zoomLevel < 0.5) {
      // 低缩放级别时只显示重要节点
      processedNodes = processedNodes.filter(node => 
        node.type === 'company' || 
        (node.type === 'employee' && (node.role === 'ceo' || node.role === 'manager'))
      );
      
      const importantNodeIds = new Set(processedNodes.map(n => n.id));
      processedLinks = processedLinks.filter(link => 
        importantNodeIds.has(typeof link.source === 'string' ? link.source : link.source.id) &&
        importantNodeIds.has(typeof link.target === 'string' ? link.target : link.target.id)
      );
    }
    
    setVisibleNodes(processedNodes);
    setVisibleLinks(processedLinks);
  }, [nodes, links, maxNodes, performanceMode, zoomLevel]);
  
  // 数据变化时重新优化
  useEffect(() => {
    optimizeData();
  }, [optimizeData]);

  useEffect(() => {
    if (!svgRef.current || visibleNodes.length === 0 || visibleLinks.length === 0) {
      setIsRendering(false);
      return;
    }
    
    setIsRendering(true);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // 创建容器组
    const container = svg.append('g').attr('class', 'container');

    // 设置缩放行为
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
        // 更新缩放级别用于性能优化
        const newZoomLevel = event.transform.k;
        if (Math.abs(newZoomLevel - zoomLevel) > 0.1) {
          setZoomLevel(newZoomLevel);
        }
      });

    svg.call(zoom);

    // 创建力导向图模拟 - 使用优化后的数据
    const simulation = d3.forceSimulation<Node>(visibleNodes)
      .force('link', d3.forceLink<Node, Link>(visibleLinks)
        .id(d => d.id)
        .distance(d => {
          switch (d.type) {
            case 'hierarchy': return 100;
            case 'decision': return 150;
            case 'communication': return 80;
            case 'feedback': return 120;
            default: return 100;
          }
        })
        .strength(d => d.strength)
      )
      .force('charge', d3.forceManyBody().strength(performanceMode ? -200 : -300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(performanceMode ? 20 : 30));

    // 添加箭头标记
    const defs = svg.append('defs');
    
    const arrowTypes = [
      { id: 'hierarchy', color: '#3b82f6' },
      { id: 'decision', color: '#ef4444' },
      { id: 'communication', color: '#10b981' },
      { id: 'feedback', color: '#f59e0b' }
    ];

    arrowTypes.forEach(arrow => {
      defs.append('marker')
        .attr('id', `arrow-${arrow.id}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', arrow.color);
    });

    // 绘制连接线 - 使用优化后的数据
    const linkElements = container.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(visibleLinks)
      .enter().append('line')
      .attr('class', 'link')
      .attr('stroke', d => {
        switch (d.type) {
          case 'hierarchy': return '#3b82f6';
          case 'decision': return '#ef4444';
          case 'communication': return '#10b981';
          case 'feedback': return '#f59e0b';
          default: return '#6b7280';
        }
      })
      .attr('stroke-width', d => Math.max(1, d.strength * 3))
      .attr('stroke-opacity', d => d.status === 'active' ? 0.8 : 0.3)
      .attr('stroke-dasharray', d => d.status === 'active' ? 'none' : '5,5')
      .attr('marker-end', d => `url(#arrow-${d.type})`);

    // 绘制节点 - 使用优化后的数据
    const nodeElements = container.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(visibleNodes)
      .enter().append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, Node>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // 添加节点圆圈
    nodeElements.append('circle')
      .attr('r', d => {
        switch (d.type) {
          case 'company': return 25;
          case 'employee': return d.role === 'ceo' ? 20 : d.role === 'manager' ? 15 : 12;
          case 'decision': return 10;
          default: return 15;
        }
      })
      .attr('fill', d => {
        if (d.type === 'company') {
          return d.company_type === 'centralized' ? '#3b82f6' : '#10b981';
        } else if (d.type === 'employee') {
          switch (d.role) {
            case 'ceo': return '#ef4444';
            case 'manager': return '#f59e0b';
            case 'employee': return '#6b7280';
            default: return '#6b7280';
          }
        } else {
          return '#8b5cf6';
        }
      })
      .attr('stroke', d => {
        switch (d.status) {
          case 'active': return '#22c55e';
          case 'thinking': return '#f59e0b';
          case 'deciding': return '#ef4444';
          default: return '#6b7280';
        }
      })
      .attr('stroke-width', d => d.status === 'idle' ? 1 : 3)
      .attr('class', d => {
        switch (d.status) {
          case 'active': return 'node-active';
          case 'thinking': return 'node-thinking';
          case 'deciding': return 'node-deciding';
          default: return '';
        }
      });

    // 添加状态指示器（动画效果）
    nodeElements
      .filter(d => d.status === 'thinking' || d.status === 'deciding')
      .append('circle')
      .attr('class', 'network-pulse')
      .attr('r', d => {
        switch (d.type) {
          case 'company': return 30;
          case 'employee': return d.role === 'ceo' ? 25 : d.role === 'manager' ? 20 : 17;
          case 'decision': return 15;
          default: return 20;
        }
      })
      .attr('fill', 'none')
      .attr('stroke', d => d.status === 'thinking' ? '#f59e0b' : '#ef4444')
      .attr('stroke-width', 2)
      .attr('opacity', 0.7);

    // 添加数据流动效果
    linkElements
      .filter(d => d.status === 'active' && d.type === 'decision')
      .attr('class', 'network-flow')
      .attr('stroke-dasharray', '5,5');

    // 添加节点标签
    nodeElements.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', d => {
        switch (d.type) {
          case 'company': return 35;
          case 'employee': return d.role === 'ceo' ? 30 : d.role === 'manager' ? 25 : 22;
          case 'decision': return 20;
          default: return 25;
        }
      })
      .attr('font-size', d => d.type === 'company' ? '12px' : '10px')
      .attr('font-weight', d => d.type === 'company' || d.role === 'ceo' ? 'bold' : 'normal')
      .attr('fill', '#374151')
      .text(d => d.name);

    // 添加角色标签
    nodeElements
      .filter(d => d.type === 'employee' && d.role)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', d => {
        switch (d.role) {
          case 'ceo': return 5;
          case 'manager': return 3;
          case 'employee': return 2;
          default: return 3;
        }
      })
      .attr('font-size', '8px')
      .attr('font-weight', 'bold')
      .attr('fill', 'white')
      .text(d => d.role?.toUpperCase());

    // 节点交互事件
    nodeElements
      .on('click', (event, d) => {
        setSelectedNode(d);
        onNodeClick?.(d);
      })
      .on('mouseenter', (event, d) => {
        setHoveredNode(d);
        onNodeHover?.(d);
        
        // 高亮相关连接 - 使用优化后的数据
        linkElements
          .attr('stroke-opacity', link => {
            return (link.source === d || link.target === d) ? 1 : 0.1;
          });
        
        // 高亮相关节点
        nodeElements
          .select('circle')
          .attr('opacity', node => {
            if (node === d) return 1;
            const isConnected = visibleLinks.some(link => 
              (link.source === node && link.target === d) ||
              (link.source === d && link.target === node)
            );
            return isConnected ? 1 : 0.3;
          });
      })
      .on('mouseleave', () => {
        setHoveredNode(null);
        onNodeHover?.(null);
        
        // 恢复所有连接的透明度
        linkElements.attr('stroke-opacity', d => d.status === 'active' ? 0.8 : 0.3);
        
        // 恢复所有节点的透明度
        nodeElements.select('circle').attr('opacity', 1);
      });

    // 力导向图更新
    simulation.on('tick', () => {
      linkElements
        .attr('x1', d => (d.source as Node).x!)
        .attr('y1', d => (d.source as Node).y!)
        .attr('x2', d => (d.target as Node).x!)
        .attr('y2', d => (d.target as Node).y!);

      nodeElements
        .attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // 清理函数
    return () => {
      simulation.stop();
      setIsRendering(false);
    };

  }, [visibleNodes, visibleLinks, width, height, onNodeClick, onNodeHover, performanceMode]);

  return (
    <div className="relative w-full h-full">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="border border-gray-200 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100"
      >
      </svg>
      
      {/* 加载指示器 */}
      {isRendering && (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg shadow-lg flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-gray-600">渲染网络图...</span>
          </div>
        </div>
      )}
      
      {/* 性能统计 */}
      {performanceMode && (
        <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs p-2 rounded">
          <div>节点: {visibleNodes.length}/{nodes.length}</div>
          <div>连接: {visibleLinks.length}/{links.length}</div>
          <div>缩放: {(zoomLevel * 100).toFixed(0)}%</div>
        </div>
      )}
      
      {/* 图例 */}
      <div className="absolute top-4 left-4 bg-white p-4 rounded-lg shadow-lg border z-10">
        <h3 className="font-semibold text-sm mb-3">图例</h3>
        
        <div className="space-y-2 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-blue-500"></div>
            <span>集权公司</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span>去中心化公司</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <span>CEO</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>经理</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-gray-500"></div>
            <span>员工</span>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t space-y-1 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-1 bg-blue-500"></div>
            <span>层级关系</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-1 bg-red-500"></div>
            <span>决策流</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-1 bg-green-500"></div>
            <span>沟通</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-1 bg-yellow-500"></div>
            <span>反馈</span>
          </div>
        </div>
      </div>

      {/* 节点信息面板 */}
      {(hoveredNode || selectedNode) && (
        <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg border max-w-xs z-10">
          <h3 className="font-semibold text-sm mb-2">
            {(hoveredNode || selectedNode)?.name}
          </h3>
          <div className="space-y-1 text-xs text-gray-600">
            <div>类型: {(hoveredNode || selectedNode)?.type}</div>
            {(hoveredNode || selectedNode)?.role && (
              <div>角色: {(hoveredNode || selectedNode)?.role}</div>
            )}
            <div>状态: {(hoveredNode || selectedNode)?.status}</div>
            {(hoveredNode || selectedNode)?.company_type && (
              <div>公司类型: {(hoveredNode || selectedNode)?.company_type}</div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
};

export default NetworkGraph;