"""
Redis性能监控系统
提供Redis集群的性能指标收集、监控和预警功能
"""

import asyncio
import logging
import time
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import deque, defaultdict
import statistics
import json

from core.redis_client_cluster import redis_client

logger = logging.getLogger(__name__)

@dataclass
class MetricPoint:
    """性能指标数据点"""
    timestamp: datetime
    value: float
    node_id: Optional[str] = None
    tags: Dict[str, str] = field(default_factory=dict)

@dataclass
class AlertRule:
    """预警规则"""
    metric_name: str
    threshold: float
    comparison: str  # 'gt', 'lt', 'eq', 'gte', 'lte'
    duration: int  # 持续时间（秒）
    severity: str  # 'critical', 'warning', 'info'
    description: str
    enabled: bool = True

@dataclass
class Alert:
    """预警信息"""
    rule_id: str
    metric_name: str
    value: float
    threshold: float
    severity: str
    description: str
    timestamp: datetime
    node_id: Optional[str] = None
    resolved: bool = False
    resolved_at: Optional[datetime] = None

class RedisPerformanceMonitor:
    """Redis性能监控器"""
    
    def __init__(self, history_size: int = 1000):
        self.history_size = history_size
        self.metrics_history: Dict[str, deque] = defaultdict(lambda: deque(maxlen=history_size))
        self.alert_rules: Dict[str, AlertRule] = {}
        self.active_alerts: Dict[str, Alert] = {}
        self.alert_history: List[Alert] = []
        self.monitoring = False
        self.monitor_interval = 30  # 秒
        self.monitor_task: Optional[asyncio.Task] = None
        
        # 默认监控指标
        self.monitored_metrics = {
            'memory_usage': 'Redis内存使用率',
            'cpu_usage': 'CPU使用率',
            'connected_clients': '连接客户端数',
            'ops_per_sec': '每秒操作数',
            'hit_rate': '缓存命中率',
            'evicted_keys': '被驱逐的键数',
            'expired_keys': '过期键数',
            'keyspace_hits': '键空间命中数',
            'keyspace_misses': '键空间未命中数',
            'response_time': '平均响应时间',
            'network_io': '网络IO',
            'persistence_activity': '持久化活动'
        }
        
        self._setup_default_alerts()
    
    def _setup_default_alerts(self):
        """设置默认预警规则"""
        default_rules = [
            AlertRule(
                metric_name='memory_usage',
                threshold=80.0,
                comparison='gte',
                duration=300,  # 5分钟
                severity='warning',
                description='Redis内存使用率超过80%'
            ),
            AlertRule(
                metric_name='memory_usage',
                threshold=90.0,
                comparison='gte',
                duration=60,  # 1分钟
                severity='critical',
                description='Redis内存使用率超过90%'
            ),
            AlertRule(
                metric_name='connected_clients',
                threshold=1000,
                comparison='gte',
                duration=600,  # 10分钟
                severity='warning',
                description='连接客户端数超过1000'
            ),
            AlertRule(
                metric_name='hit_rate',
                threshold=70.0,
                comparison='lt',
                duration=900,  # 15分钟
                severity='warning',
                description='缓存命中率低于70%'
            ),
            AlertRule(
                metric_name='response_time',
                threshold=100.0,
                comparison='gte',
                duration=300,  # 5分钟
                severity='warning',
                description='平均响应时间超过100ms'
            ),
            AlertRule(
                metric_name='ops_per_sec',
                threshold=10000,
                comparison='gte',
                duration=300,  # 5分钟
                severity='info',
                description='每秒操作数超过10000'
            )
        ]
        
        for rule in default_rules:
            rule_id = f"{rule.metric_name}_{rule.comparison}_{rule.threshold}"
            self.alert_rules[rule_id] = rule
    
    async def collect_metrics(self) -> Dict[str, Any]:
        """收集Redis性能指标"""
        try:
            metrics = {}
            
            # 获取Redis集群信息
            connection_info = redis_client.get_connection_info()
            
            if not connection_info.get('connected', False):
                logger.warning("Redis not connected, skipping metrics collection")
                return {}
            
            # 收集基础信息指标
            info = await redis_client.info()
            
            if info:
                # 内存相关指标
                used_memory = info.get('used_memory', 0)
                max_memory = info.get('maxmemory', 0)
                if max_memory > 0:
                    metrics['memory_usage'] = (used_memory / max_memory) * 100
                else:
                    # 如果没有设置maxmemory，使用系统内存估算
                    metrics['memory_usage'] = min((used_memory / (1024**3)) * 10, 100)  # 估算值
                
                metrics['used_memory_mb'] = used_memory / (1024**2)
                metrics['memory_fragmentation_ratio'] = info.get('mem_fragmentation_ratio', 1.0)
                
                # 客户端连接
                metrics['connected_clients'] = info.get('connected_clients', 0)
                metrics['blocked_clients'] = info.get('blocked_clients', 0)
                
                # 操作统计
                total_commands = info.get('total_commands_processed', 0)
                uptime = info.get('uptime_in_seconds', 1)
                metrics['ops_per_sec'] = total_commands / max(uptime, 1)
                
                # 键空间统计
                keyspace_hits = info.get('keyspace_hits', 0)
                keyspace_misses = info.get('keyspace_misses', 0)
                total_keyspace_ops = keyspace_hits + keyspace_misses
                
                if total_keyspace_ops > 0:
                    metrics['hit_rate'] = (keyspace_hits / total_keyspace_ops) * 100
                else:
                    metrics['hit_rate'] = 0
                
                metrics['keyspace_hits'] = keyspace_hits
                metrics['keyspace_misses'] = keyspace_misses
                
                # 过期和驱逐
                metrics['expired_keys'] = info.get('expired_keys', 0)
                metrics['evicted_keys'] = info.get('evicted_keys', 0)
                
                # CPU使用率（Redis进程）
                metrics['cpu_usage'] = info.get('used_cpu_sys', 0) + info.get('used_cpu_user', 0)
                
                # 网络IO
                metrics['total_net_input_bytes'] = info.get('total_net_input_bytes', 0)
                metrics['total_net_output_bytes'] = info.get('total_net_output_bytes', 0)
                
                # 持久化信息
                metrics['rdb_last_save_time'] = info.get('rdb_last_save_time', 0)
                metrics['rdb_changes_since_last_save'] = info.get('rdb_changes_since_last_save', 0)
                
                # 如果是集群模式，收集集群特定指标
                if connection_info.get('mode') == 'cluster':
                    cluster_info = await self._collect_cluster_metrics()
                    metrics.update(cluster_info)
            
            # 响应时间测试
            response_time = await self._measure_response_time()
            metrics['response_time'] = response_time
            
            # 记录收集时间
            metrics['collection_timestamp'] = datetime.now().isoformat()
            
            logger.debug(f"Collected {len(metrics)} Redis metrics")
            return metrics
            
        except Exception as e:
            logger.error(f"Error collecting Redis metrics: {e}")
            return {}
    
    async def _collect_cluster_metrics(self) -> Dict[str, Any]:
        """收集集群特定指标"""
        try:
            cluster_metrics = {}
            
            # 获取集群性能信息
            if hasattr(redis_client, 'cluster_manager'):
                cluster_manager = redis_client.cluster_manager
                
                # 节点健康状态
                healthy_nodes = len([n for n in cluster_manager.nodes.values() if n.is_healthy])
                total_nodes = len(cluster_manager.nodes)
                
                cluster_metrics['cluster_healthy_nodes'] = healthy_nodes
                cluster_metrics['cluster_total_nodes'] = total_nodes
                cluster_metrics['cluster_health_ratio'] = (healthy_nodes / max(total_nodes, 1)) * 100
                
                # 负载均衡指标
                cluster_metrics['cluster_strategy'] = cluster_manager.strategy
                cluster_metrics['cluster_total_requests'] = cluster_manager.total_requests
                cluster_metrics['cluster_success_rate'] = cluster_manager.get_success_rate()
                cluster_metrics['cluster_avg_response_time'] = cluster_manager.avg_response_time
                
                # 各节点性能指标
                node_metrics = {}
                for node_id, node in cluster_manager.nodes.items():
                    node_metrics[node_id] = {
                        'requests': node.total_requests,
                        'successful_requests': node.successful_requests,
                        'error_count': node.error_count,
                        'success_rate': node.get_success_rate(),
                        'avg_response_time': node.avg_response_time,
                        'connection_count': node.connection_count,
                        'load_factor': node.load_factor,
                        'is_healthy': node.is_healthy
                    }
                
                cluster_metrics['cluster_nodes'] = node_metrics
            
            return cluster_metrics
            
        except Exception as e:
            logger.error(f"Error collecting cluster metrics: {e}")
            return {}
    
    async def _measure_response_time(self) -> float:
        """测量Redis响应时间"""
        try:
            start_time = time.perf_counter()
            await redis_client.ping()
            end_time = time.perf_counter()
            
            response_time = (end_time - start_time) * 1000  # 转换为毫秒
            return round(response_time, 2)
            
        except Exception as e:
            logger.error(f"Error measuring response time: {e}")
            return -1.0
    
    def store_metrics(self, metrics: Dict[str, Any]):
        """存储性能指标到历史记录"""
        timestamp = datetime.now()
        
        for metric_name, value in metrics.items():
            if isinstance(value, (int, float)) and metric_name in self.monitored_metrics:
                point = MetricPoint(
                    timestamp=timestamp,
                    value=float(value)
                )
                self.metrics_history[metric_name].append(point)
    
    def check_alerts(self, metrics: Dict[str, Any]):
        """检查预警条件"""
        current_time = datetime.now()
        
        for rule_id, rule in self.alert_rules.items():
            if not rule.enabled or rule.metric_name not in metrics:
                continue
            
            current_value = float(metrics[rule.metric_name])
            
            # 检查阈值条件
            triggered = self._check_threshold(current_value, rule.threshold, rule.comparison)
            
            if triggered:
                # 检查是否已经有活跃的预警
                if rule_id not in self.active_alerts:
                    # 创建新预警
                    alert = Alert(
                        rule_id=rule_id,
                        metric_name=rule.metric_name,
                        value=current_value,
                        threshold=rule.threshold,
                        severity=rule.severity,
                        description=rule.description,
                        timestamp=current_time
                    )
                    self.active_alerts[rule_id] = alert
                    self.alert_history.append(alert)
                    
                    logger.warning(f"Alert triggered: {alert.description} (Value: {current_value})")
            else:
                # 检查是否需要解除预警
                if rule_id in self.active_alerts:
                    alert = self.active_alerts[rule_id]
                    alert.resolved = True
                    alert.resolved_at = current_time
                    del self.active_alerts[rule_id]
                    
                    logger.info(f"Alert resolved: {alert.description}")
    
    def _check_threshold(self, value: float, threshold: float, comparison: str) -> bool:
        """检查阈值条件"""
        if comparison == 'gt':
            return value > threshold
        elif comparison == 'gte':
            return value >= threshold
        elif comparison == 'lt':
            return value < threshold
        elif comparison == 'lte':
            return value <= threshold
        elif comparison == 'eq':
            return abs(value - threshold) < 0.01
        else:
            return False
    
    def get_metrics_summary(self, hours: int = 1) -> Dict[str, Any]:
        """获取指定时间范围内的指标摘要"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        summary = {}
        
        for metric_name, history in self.metrics_history.items():
            if not history:
                continue
            
            # 过滤时间范围内的数据
            recent_points = [
                point for point in history 
                if point.timestamp >= cutoff_time
            ]
            
            if not recent_points:
                continue
            
            values = [point.value for point in recent_points]
            
            summary[metric_name] = {
                'current': values[-1] if values else 0,
                'average': round(statistics.mean(values), 2),
                'min': min(values),
                'max': max(values),
                'median': round(statistics.median(values), 2),
                'count': len(values),
                'description': self.monitored_metrics.get(metric_name, metric_name)
            }
            
            # 计算标准差（如果有足够的数据点）
            if len(values) > 1:
                summary[metric_name]['stddev'] = round(statistics.stdev(values), 2)
        
        return summary
    
    def get_active_alerts(self) -> List[Dict[str, Any]]:
        """获取当前活跃的预警"""
        return [
            {
                'rule_id': alert.rule_id,
                'metric_name': alert.metric_name,
                'value': alert.value,
                'threshold': alert.threshold,
                'severity': alert.severity,
                'description': alert.description,
                'timestamp': alert.timestamp.isoformat(),
                'duration': str(datetime.now() - alert.timestamp)
            }
            for alert in self.active_alerts.values()
        ]
    
    def get_alert_history(self, hours: int = 24) -> List[Dict[str, Any]]:
        """获取预警历史记录"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        return [
            {
                'rule_id': alert.rule_id,
                'metric_name': alert.metric_name,
                'value': alert.value,
                'threshold': alert.threshold,
                'severity': alert.severity,
                'description': alert.description,
                'timestamp': alert.timestamp.isoformat(),
                'resolved': alert.resolved,
                'resolved_at': alert.resolved_at.isoformat() if alert.resolved_at else None,
                'duration': str(alert.resolved_at - alert.timestamp) if alert.resolved_at else None
            }
            for alert in self.alert_history
            if alert.timestamp >= cutoff_time
        ]
    
    async def start_monitoring(self):
        """启动性能监控"""
        if self.monitoring:
            logger.info("Redis monitoring is already running")
            return
        
        self.monitoring = True
        self.monitor_task = asyncio.create_task(self._monitoring_loop())
        logger.info(f"Redis performance monitoring started (interval: {self.monitor_interval}s)")
    
    async def stop_monitoring(self):
        """停止性能监控"""
        if not self.monitoring:
            return
        
        self.monitoring = False
        if self.monitor_task:
            self.monitor_task.cancel()
            try:
                await self.monitor_task
            except asyncio.CancelledError:
                pass
        
        logger.info("Redis performance monitoring stopped")
    
    async def _monitoring_loop(self):
        """监控循环"""
        while self.monitoring:
            try:
                # 收集指标
                metrics = await self.collect_metrics()
                if metrics:
                    # 存储指标
                    self.store_metrics(metrics)
                    
                    # 检查预警
                    self.check_alerts(metrics)
                
                # 等待下一次收集
                await asyncio.sleep(self.monitor_interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                await asyncio.sleep(self.monitor_interval)
    
    def add_alert_rule(self, rule: AlertRule) -> str:
        """添加预警规则"""
        rule_id = f"{rule.metric_name}_{rule.comparison}_{rule.threshold}_{int(time.time())}"
        self.alert_rules[rule_id] = rule
        logger.info(f"Added alert rule: {rule.description}")
        return rule_id
    
    def remove_alert_rule(self, rule_id: str) -> bool:
        """移除预警规则"""
        if rule_id in self.alert_rules:
            rule = self.alert_rules.pop(rule_id)
            # 也要移除对应的活跃预警
            if rule_id in self.active_alerts:
                del self.active_alerts[rule_id]
            logger.info(f"Removed alert rule: {rule.description}")
            return True
        return False
    
    def update_alert_rule(self, rule_id: str, rule: AlertRule) -> bool:
        """更新预警规则"""
        if rule_id in self.alert_rules:
            self.alert_rules[rule_id] = rule
            logger.info(f"Updated alert rule: {rule.description}")
            return True
        return False

# 全局监控实例
redis_monitor = RedisPerformanceMonitor()