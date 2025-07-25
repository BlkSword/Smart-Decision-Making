"""
Redis性能报告生成器
生成详细的性能分析报告和建议
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
import statistics

from core.redis_monitor import redis_monitor

logger = logging.getLogger(__name__)

@dataclass
class PerformanceRecommendation:
    """性能优化建议"""
    category: str
    priority: str  # 'high', 'medium', 'low'
    title: str
    description: str
    impact: str
    action_required: str

class PerformanceReportGenerator:
    """性能报告生成器"""
    
    def __init__(self):
        self.report_templates = {
            'memory': self._analyze_memory_performance,
            'connections': self._analyze_connection_performance,
            'operations': self._analyze_operation_performance,
            'cache': self._analyze_cache_performance,
            'response_time': self._analyze_response_time_performance,
            'cluster': self._analyze_cluster_performance
        }
    
    async def generate_performance_report(self, hours: int = 24) -> Dict[str, Any]:
        """生成完整的性能报告"""
        try:
            # 获取当前指标
            current_metrics = await redis_monitor.collect_metrics()
            
            # 获取历史摘要
            metrics_summary = redis_monitor.get_metrics_summary(hours=hours)
            
            # 获取预警历史
            alert_history = redis_monitor.get_alert_history(hours=hours)
            
            # 分析各个性能维度
            analyses = {}
            recommendations = []
            
            for category, analyzer in self.report_templates.items():
                analysis_result = analyzer(current_metrics, metrics_summary, alert_history)
                analyses[category] = analysis_result['analysis']
                recommendations.extend(analysis_result['recommendations'])
            
            # 计算总体健康评分
            overall_score = self._calculate_overall_score(current_metrics, alert_history)
            
            # 生成执行摘要
            executive_summary = self._generate_executive_summary(
                overall_score, current_metrics, alert_history, recommendations
            )
            
            report = {
                "report_metadata": {
                    "generated_at": datetime.now().isoformat(),
                    "time_range_hours": hours,
                    "report_version": "1.0",
                    "redis_mode": "cluster" if current_metrics else "unknown"
                },
                "executive_summary": executive_summary,
                "overall_health_score": overall_score,
                "current_metrics": current_metrics,
                "performance_analysis": analyses,
                "recommendations": self._prioritize_recommendations(recommendations),
                "alert_summary": {
                    "total_alerts": len(alert_history),
                    "critical_alerts": len([a for a in alert_history if a['severity'] == 'critical']),
                    "warning_alerts": len([a for a in alert_history if a['severity'] == 'warning']),
                    "info_alerts": len([a for a in alert_history if a['severity'] == 'info']),
                    "recent_alerts": alert_history[:5]  # 最近5个预警
                },
                "metrics_trends": self._analyze_trends(metrics_summary),
                "capacity_planning": self._generate_capacity_planning(current_metrics, metrics_summary)
            }
            
            return report
            
        except Exception as e:
            logger.error(f"Error generating performance report: {e}")
            return {
                "error": "Failed to generate performance report",
                "details": str(e)
            }
    
    def _analyze_memory_performance(self, current: Dict, summary: Dict, alerts: List) -> Dict[str, Any]:
        """分析内存性能"""
        analysis = {
            "status": "healthy",
            "issues": [],
            "observations": []
        }
        recommendations = []
        
        if not current:
            return {"analysis": analysis, "recommendations": recommendations}
        
        memory_usage = current.get('memory_usage', 0)
        fragmentation_ratio = current.get('memory_fragmentation_ratio', 1.0)
        
        # 内存使用率分析
        if memory_usage > 90:
            analysis["status"] = "critical"
            analysis["issues"].append("内存使用率过高")
            recommendations.append(PerformanceRecommendation(
                category="memory",
                priority="high",
                title="内存使用率过高",
                description=f"当前内存使用率为{memory_usage:.1f}%，超过90%阈值",
                impact="可能导致性能下降和OOM错误",
                action_required="立即增加内存或清理无用数据"
            ))
        elif memory_usage > 80:
            analysis["status"] = "warning"
            analysis["issues"].append("内存使用率较高")
            recommendations.append(PerformanceRecommendation(
                category="memory",
                priority="medium",
                title="内存使用率较高",
                description=f"当前内存使用率为{memory_usage:.1f}%，接近80%阈值",
                impact="可能影响系统稳定性",
                action_required="考虑扩容或优化内存使用"
            ))
        
        # 内存碎片分析
        if fragmentation_ratio > 1.5:
            analysis["issues"].append("内存碎片过多")
            recommendations.append(PerformanceRecommendation(
                category="memory",
                priority="medium",
                title="内存碎片率过高",
                description=f"内存碎片率为{fragmentation_ratio:.2f}，建议值小于1.5",
                impact="降低内存使用效率",
                action_required="考虑重启Redis或调整内存分配策略"
            ))
        elif fragmentation_ratio < 1.0:
            analysis["observations"].append("内存碎片率正常")
        
        return {"analysis": analysis, "recommendations": recommendations}
    
    def _analyze_connection_performance(self, current: Dict, summary: Dict, alerts: List) -> Dict[str, Any]:
        """分析连接性能"""
        analysis = {
            "status": "healthy",
            "issues": [],
            "observations": []
        }
        recommendations = []
        
        if not current:
            return {"analysis": analysis, "recommendations": recommendations}
        
        connected_clients = current.get('connected_clients', 0)
        blocked_clients = current.get('blocked_clients', 0)
        
        # 连接数分析
        if connected_clients > 1000:
            analysis["status"] = "warning"
            analysis["issues"].append("连接数过多")
            recommendations.append(PerformanceRecommendation(
                category="connections",
                priority="medium",
                title="客户端连接数过多",
                description=f"当前连接数为{connected_clients}，超过1000",
                impact="可能影响服务器性能",
                action_required="检查连接池配置和连接泄漏"
            ))
        
        # 阻塞连接分析
        if blocked_clients > 0:
            block_ratio = (blocked_clients / max(connected_clients, 1)) * 100
            if block_ratio > 20:
                analysis["status"] = "warning"
                analysis["issues"].append("阻塞连接过多")
                recommendations.append(PerformanceRecommendation(
                    category="connections",
                    priority="medium",
                    title="阻塞连接比例过高",
                    description=f"阻塞连接占比{block_ratio:.1f}%",
                    impact="可能存在慢查询或死锁",
                    action_required="检查慢查询日志和阻塞操作"
                ))
        
        return {"analysis": analysis, "recommendations": recommendations}
    
    def _analyze_operation_performance(self, current: Dict, summary: Dict, alerts: List) -> Dict[str, Any]:
        """分析操作性能"""
        analysis = {
            "status": "healthy",
            "issues": [],
            "observations": []
        }
        recommendations = []
        
        if not current:
            return {"analysis": analysis, "recommendations": recommendations}
        
        ops_per_sec = current.get('ops_per_sec', 0)
        
        # 操作频率分析
        if ops_per_sec > 10000:
            analysis["observations"].append("高并发操作")
            recommendations.append(PerformanceRecommendation(
                category="operations",
                priority="low",
                title="高并发场景",
                description=f"每秒操作数为{ops_per_sec:.0f}，属于高并发场景",
                impact="系统负载较高，需要监控性能",
                action_required="持续监控并考虑集群扩容"
            ))
        elif ops_per_sec < 1:
            analysis["observations"].append("低活跃度")
        
        return {"analysis": analysis, "recommendations": recommendations}
    
    def _analyze_cache_performance(self, current: Dict, summary: Dict, alerts: List) -> Dict[str, Any]:
        """分析缓存性能"""
        analysis = {
            "status": "healthy",
            "issues": [],
            "observations": []
        }
        recommendations = []
        
        if not current:
            return {"analysis": analysis, "recommendations": recommendations}
        
        hit_rate = current.get('hit_rate', 100)
        evicted_keys = current.get('evicted_keys', 0)
        expired_keys = current.get('expired_keys', 0)
        
        # 缓存命中率分析
        if hit_rate < 70:
            analysis["status"] = "warning"
            analysis["issues"].append("缓存命中率低")
            recommendations.append(PerformanceRecommendation(
                category="cache",
                priority="high",
                title="缓存命中率过低",
                description=f"缓存命中率为{hit_rate:.1f}%，低于70%阈值",
                impact="影响应用性能，增加数据库负载",
                action_required="优化缓存策略或增加缓存容量"
            ))
        elif hit_rate < 80:
            analysis["status"] = "warning"
            analysis["issues"].append("缓存命中率偏低")
        
        # 键驱逐分析
        if evicted_keys > 0:
            analysis["issues"].append("键被驱逐")
            recommendations.append(PerformanceRecommendation(
                category="cache",
                priority="medium",
                title="键被频繁驱逐",
                description=f"已驱逐{evicted_keys}个键",
                impact="缓存容量不足，影响命中率",
                action_required="增加内存容量或优化数据TTL策略"
            ))
        
        return {"analysis": analysis, "recommendations": recommendations}
    
    def _analyze_response_time_performance(self, current: Dict, summary: Dict, alerts: List) -> Dict[str, Any]:
        """分析响应时间性能"""
        analysis = {
            "status": "healthy",
            "issues": [],
            "observations": []
        }
        recommendations = []
        
        if not current:
            return {"analysis": analysis, "recommendations": recommendations}
        
        response_time = current.get('response_time', 0)
        
        # 响应时间分析
        if response_time > 100:
            analysis["status"] = "warning"
            analysis["issues"].append("响应时间过长")
            recommendations.append(PerformanceRecommendation(
                category="response_time",
                priority="high",
                title="响应时间过长",
                description=f"平均响应时间为{response_time:.2f}ms，超过100ms阈值",
                impact="影响用户体验和应用性能",
                action_required="检查网络延迟、服务器负载和慢查询"
            ))
        elif response_time > 50:
            analysis["status"] = "warning"
            analysis["issues"].append("响应时间偏高")
        
        return {"analysis": analysis, "recommendations": recommendations}
    
    def _analyze_cluster_performance(self, current: Dict, summary: Dict, alerts: List) -> Dict[str, Any]:
        """分析集群性能"""
        analysis = {
            "status": "healthy",
            "issues": [],
            "observations": []
        }
        recommendations = []
        
        if not current:
            return {"analysis": analysis, "recommendations": recommendations}
        
        # 检查集群相关指标
        cluster_health_ratio = current.get('cluster_health_ratio', 100)
        cluster_success_rate = current.get('cluster_success_rate', 100)
        
        if cluster_health_ratio < 100:
            analysis["status"] = "warning"
            analysis["issues"].append("集群节点异常")
            recommendations.append(PerformanceRecommendation(
                category="cluster",
                priority="high",
                title="集群节点健康度低",
                description=f"集群健康度为{cluster_health_ratio:.1f}%",
                impact="影响系统可用性和性能",
                action_required="检查异常节点并进行故障恢复"
            ))
        
        if cluster_success_rate < 95:
            analysis["status"] = "warning"
            analysis["issues"].append("集群操作失败率高")
            recommendations.append(PerformanceRecommendation(
                category="cluster",
                priority="high",
                title="集群操作成功率低",
                description=f"集群操作成功率为{cluster_success_rate:.1f}%",
                impact="影响数据一致性和系统稳定性",
                action_required="检查集群网络和节点状态"
            ))
        
        return {"analysis": analysis, "recommendations": recommendations}
    
    def _calculate_overall_score(self, current: Dict, alerts: List) -> float:
        """计算总体健康评分"""
        if not current:
            return 0.0
            
        score = 100.0
        
        # 基于当前指标调整评分
        memory_usage = current.get('memory_usage', 0)
        if memory_usage > 90:
            score -= 25
        elif memory_usage > 80:
            score -= 15
        
        response_time = current.get('response_time', 0)
        if response_time > 100:
            score -= 20
        elif response_time > 50:
            score -= 10
        
        hit_rate = current.get('hit_rate', 100)
        if hit_rate < 70:
            score -= 20
        elif hit_rate < 80:
            score -= 10
        
        # 基于预警调整评分
        for alert in alerts:
            if alert['severity'] == 'critical':
                score -= 15
            elif alert['severity'] == 'warning':
                score -= 8
            else:
                score -= 3
        
        return max(0, min(100, round(score, 1)))
    
    def _generate_executive_summary(self, score: float, current: Dict, alerts: List, recommendations: List) -> Dict[str, Any]:
        """生成执行摘要"""
        status = "healthy"
        if score < 60:
            status = "critical"
        elif score < 80:
            status = "warning"
        
        critical_issues = len([r for r in recommendations if r.priority == 'high'])
        
        summary = {
            "overall_status": status,
            "health_score": score,
            "critical_issues_count": critical_issues,
            "total_recommendations": len(recommendations),
            "key_metrics": {
                "memory_usage": f"{current.get('memory_usage', 0):.1f}%",
                "response_time": f"{current.get('response_time', 0):.2f}ms",
                "hit_rate": f"{current.get('hit_rate', 100):.1f}%",
                "connected_clients": current.get('connected_clients', 0)
            },
            "immediate_actions": [
                r.title for r in recommendations 
                if r.priority == 'high'
            ][:3]  # 最多3个紧急行动项
        }
        
        return summary
    
    def _prioritize_recommendations(self, recommendations: List[PerformanceRecommendation]) -> Dict[str, List[Dict]]:
        """按优先级整理建议"""
        prioritized = {
            "high": [],
            "medium": [],
            "low": []
        }
        
        for rec in recommendations:
            prioritized[rec.priority].append({
                "category": rec.category,
                "title": rec.title,
                "description": rec.description,
                "impact": rec.impact,
                "action_required": rec.action_required
            })
        
        return prioritized
    
    def _analyze_trends(self, summary: Dict) -> Dict[str, Any]:
        """分析指标趋势"""
        trends = {}
        
        for metric_name, data in summary.items():
            if isinstance(data, dict) and 'current' in data and 'average' in data:
                current = data['current']
                average = data['average']
                
                if current > average * 1.1:
                    trend = "increasing"
                elif current < average * 0.9:
                    trend = "decreasing"
                else:
                    trend = "stable"
                
                trends[metric_name] = {
                    "trend": trend,
                    "current": current,
                    "average": average,
                    "change_percentage": ((current - average) / max(average, 0.001)) * 100
                }
        
        return trends
    
    def _generate_capacity_planning(self, current: Dict, summary: Dict) -> Dict[str, Any]:
        """生成容量规划建议"""
        if not current:
            return {}
        
        planning = {
            "memory": {
                "current_usage_mb": current.get('used_memory_mb', 0),
                "usage_percentage": current.get('memory_usage', 0),
                "recommendation": "stable"
            },
            "connections": {
                "current_connections": current.get('connected_clients', 0),
                "recommendation": "stable"
            },
            "operations": {
                "current_ops_per_sec": current.get('ops_per_sec', 0),
                "recommendation": "stable"
            }
        }
        
        # 内存容量规划
        memory_usage = current.get('memory_usage', 0)
        if memory_usage > 80:
            planning["memory"]["recommendation"] = "scale_up"
            planning["memory"]["suggested_action"] = "建议增加50%内存容量"
        elif memory_usage < 30:
            planning["memory"]["recommendation"] = "over_provisioned"
            planning["memory"]["suggested_action"] = "当前内存配置可能过高"
        
        # 连接容量规划
        connections = current.get('connected_clients', 0)
        if connections > 800:
            planning["connections"]["recommendation"] = "scale_up"
            planning["connections"]["suggested_action"] = "考虑增加连接池或负载均衡"
        
        # 操作容量规划
        ops_per_sec = current.get('ops_per_sec', 0)
        if ops_per_sec > 8000:
            planning["operations"]["recommendation"] = "scale_out"
            planning["operations"]["suggested_action"] = "考虑集群扩容以分散负载"
        
        return planning

# 全局报告生成器实例
performance_reporter = PerformanceReportGenerator()