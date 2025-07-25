import os
import asyncio
import logging
import hashlib
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
import redis.asyncio as redis
from enum import Enum
import json
import random

logger = logging.getLogger(__name__)

class NodeStatus(Enum):
    """节点状态枚举"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"  # 部分功能受损
    FAILED = "failed"
    UNKNOWN = "unknown"

class LoadBalanceStrategy(Enum):
    """负载均衡策略"""
    ROUND_ROBIN = "round_robin"
    CONSISTENT_HASH = "consistent_hash"
    LEAST_CONNECTIONS = "least_connections"
    RANDOM = "random"
    PERFORMANCE_BASED = "performance_based"

class RedisNode:
    """Redis节点"""
    
    def __init__(self, host: str, port: int, password: Optional[str] = None, 
                 weight: float = 1.0, node_id: Optional[str] = None):
        self.host = host
        self.port = port
        self.password = password
        self.weight = weight
        self.node_id = node_id or f"{host}:{port}"
        
        self.redis: Optional[redis.Redis] = None
        self.status = NodeStatus.UNKNOWN
        self.last_check = None
        self.connection_count = 0
        self.error_count = 0
        self.response_times: List[float] = []
        self.total_requests = 0
        self.successful_requests = 0
        
        # 性能指标
        self.avg_response_time = 0.0
        self.success_rate = 1.0
        self.load_factor = 0.0
    
    async def connect(self) -> bool:
        """连接到Redis节点"""
        try:
            connection_params = {
                'host': self.host,
                'port': self.port,
                'decode_responses': True,
                'encoding': 'utf-8',
                'socket_timeout': 5.0,
                'socket_connect_timeout': 5.0
            }
            
            if self.password:
                connection_params['password'] = self.password
            
            self.redis = redis.Redis(**connection_params)
            
            # 测试连接
            await self.redis.ping()
            self.status = NodeStatus.HEALTHY
            self.error_count = 0
            logger.info(f"Connected to Redis node {self.node_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to Redis node {self.node_id}: {e}")
            self.status = NodeStatus.FAILED
            self.error_count += 1
            if self.redis:
                try:
                    await self.redis.close()
                except:
                    pass
                self.redis = None
            return False
    
    async def disconnect(self):
        """断开连接"""
        if self.redis:
            try:
                await self.redis.close()
                logger.info(f"Disconnected from Redis node {self.node_id}")
            except Exception as e:
                logger.error(f"Error disconnecting from {self.node_id}: {e}")
            finally:
                self.redis = None
    
    async def health_check(self) -> bool:
        """健康检查"""
        try:
            if not self.redis:
                return await self.connect()
            
            start_time = asyncio.get_event_loop().time()
            await self.redis.ping()
            response_time = asyncio.get_event_loop().time() - start_time
            
            # 记录响应时间
            self.response_times.append(response_time)
            if len(self.response_times) > 100:  # 保持最近100次的响应时间
                self.response_times.pop(0)
            
            self.avg_response_time = sum(self.response_times) / len(self.response_times)
            self.last_check = datetime.now()
            
            # 根据响应时间调整状态
            if response_time < 0.1:  # 100ms以下认为健康
                self.status = NodeStatus.HEALTHY
            elif response_time < 0.5:  # 500ms以下认为降级
                self.status = NodeStatus.DEGRADED
            else:
                self.status = NodeStatus.FAILED
            
            return self.status != NodeStatus.FAILED
            
        except Exception as e:
            logger.warning(f"Health check failed for node {self.node_id}: {e}")
            self.status = NodeStatus.FAILED
            self.error_count += 1
            return False
    
    def update_performance_metrics(self, success: bool, response_time: float):
        """更新性能指标"""
        self.total_requests += 1
        if success:
            self.successful_requests += 1
        
        self.success_rate = self.successful_requests / self.total_requests if self.total_requests > 0 else 1.0
        
        # 计算负载因子 (基于连接数、响应时间、成功率)
        connection_factor = min(self.connection_count / 100.0, 1.0)  # 归一化连接数
        response_factor = min(self.avg_response_time / 1.0, 1.0)  # 归一化响应时间
        success_factor = 1.0 - self.success_rate  # 失败率
        
        self.load_factor = (connection_factor + response_factor + success_factor) / 3.0
    
    def get_node_info(self) -> Dict[str, Any]:
        """获取节点信息"""
        return {
            'node_id': self.node_id,
            'host': self.host,
            'port': self.port,
            'status': self.status.value,
            'weight': self.weight,
            'connection_count': self.connection_count,
            'error_count': self.error_count,
            'total_requests': self.total_requests,
            'successful_requests': self.successful_requests,
            'success_rate': round(self.success_rate, 3),
            'avg_response_time': round(self.avg_response_time, 3),
            'load_factor': round(self.load_factor, 3),
            'last_check': self.last_check.isoformat() if self.last_check else None,
            'is_connected': self.redis is not None
        }

class RedisClusterManager:
    """Redis集群管理器"""
    
    def __init__(self, strategy: LoadBalanceStrategy = LoadBalanceStrategy.CONSISTENT_HASH):
        self.nodes: Dict[str, RedisNode] = {}
        self.strategy = strategy
        self.health_check_interval = 30  # 秒
        self.health_check_task: Optional[asyncio.Task] = None
        self.round_robin_index = 0
        
        # 一致性哈希环
        self.hash_ring: Dict[int, str] = {}
        self.virtual_nodes = 160  # 每个物理节点的虚拟节点数
        
        # 故障转移配置
        self.max_retries = 3
        self.retry_delay = 1.0
        self.failover_threshold = 3  # 连续失败次数阈值
        
        logger.info(f"Redis cluster manager initialized with strategy: {strategy.value}")
    
    def add_node(self, host: str, port: int, password: Optional[str] = None, 
                 weight: float = 1.0, node_id: Optional[str] = None) -> str:
        """添加Redis节点"""
        node = RedisNode(host, port, password, weight, node_id)
        self.nodes[node.node_id] = node
        
        # 更新一致性哈希环
        if self.strategy == LoadBalanceStrategy.CONSISTENT_HASH:
            self._add_node_to_hash_ring(node.node_id, weight)
        
        logger.info(f"Added Redis node: {node.node_id}")
        return node.node_id
    
    def remove_node(self, node_id: str) -> bool:
        """移除Redis节点"""
        if node_id not in self.nodes:
            return False
        
        node = self.nodes[node_id]
        
        # 断开连接
        if node.redis:
            asyncio.create_task(node.disconnect())
        
        # 从哈希环中移除
        if self.strategy == LoadBalanceStrategy.CONSISTENT_HASH:
            self._remove_node_from_hash_ring(node_id)
        
        del self.nodes[node_id]
        logger.info(f"Removed Redis node: {node_id}")
        return True
    
    def _add_node_to_hash_ring(self, node_id: str, weight: float = 1.0):
        """将节点添加到一致性哈希环"""
        virtual_node_count = int(self.virtual_nodes * weight)
        for i in range(virtual_node_count):
            virtual_key = f"{node_id}:{i}"
            hash_value = int(hashlib.md5(virtual_key.encode()).hexdigest(), 16)
            self.hash_ring[hash_value] = node_id
    
    def _remove_node_from_hash_ring(self, node_id: str):
        """从一致性哈希环中移除节点"""
        keys_to_remove = [k for k, v in self.hash_ring.items() if v == node_id]
        for key in keys_to_remove:
            del self.hash_ring[key]
    
    def _get_node_by_consistent_hash(self, key: str) -> Optional[RedisNode]:
        """通过一致性哈希获取节点"""
        if not self.hash_ring:
            return None
        
        key_hash = int(hashlib.md5(key.encode()).hexdigest(), 16)
        
        # 查找顺时针方向最近的节点
        sorted_hashes = sorted(self.hash_ring.keys())
        for hash_value in sorted_hashes:
            if key_hash <= hash_value:
                node_id = self.hash_ring[hash_value]
                node = self.nodes.get(node_id)
                if node and node.status != NodeStatus.FAILED:
                    return node
        
        # 如果没有找到，使用环上的第一个节点
        if sorted_hashes:
            node_id = self.hash_ring[sorted_hashes[0]]
            node = self.nodes.get(node_id)
            if node and node.status != NodeStatus.FAILED:
                return node
        
        return None
    
    def _get_node_by_round_robin(self) -> Optional[RedisNode]:
        """轮询获取节点"""
        healthy_nodes = [node for node in self.nodes.values() 
                        if node.status != NodeStatus.FAILED]
        
        if not healthy_nodes:
            return None
        
        node = healthy_nodes[self.round_robin_index % len(healthy_nodes)]
        self.round_robin_index += 1
        return node
    
    def _get_node_by_least_connections(self) -> Optional[RedisNode]:
        """获取连接数最少的节点"""
        healthy_nodes = [node for node in self.nodes.values() 
                        if node.status != NodeStatus.FAILED]
        
        if not healthy_nodes:
            return None
        
        return min(healthy_nodes, key=lambda n: n.connection_count)
    
    def _get_node_by_performance(self) -> Optional[RedisNode]:
        """基于性能获取最佳节点"""
        healthy_nodes = [node for node in self.nodes.values() 
                        if node.status != NodeStatus.FAILED]
        
        if not healthy_nodes:
            return None
        
        # 综合考虑负载因子和权重
        best_node = min(healthy_nodes, 
                       key=lambda n: n.load_factor / max(n.weight, 0.1))
        return best_node
    
    def _get_node_by_random(self) -> Optional[RedisNode]:
        """随机获取节点"""
        healthy_nodes = [node for node in self.nodes.values() 
                        if node.status != NodeStatus.FAILED]
        
        if not healthy_nodes:
            return None
        
        # 基于权重的随机选择
        total_weight = sum(node.weight for node in healthy_nodes)
        if total_weight <= 0:
            return random.choice(healthy_nodes)
        
        rand_weight = random.uniform(0, total_weight)
        current_weight = 0
        
        for node in healthy_nodes:
            current_weight += node.weight
            if rand_weight <= current_weight:
                return node
        
        return healthy_nodes[-1]  # 后备选择
    
    def get_node(self, key: Optional[str] = None) -> Optional[RedisNode]:
        """根据负载均衡策略获取节点"""
        if not self.nodes:
            return None
        
        if self.strategy == LoadBalanceStrategy.CONSISTENT_HASH and key:
            return self._get_node_by_consistent_hash(key)
        elif self.strategy == LoadBalanceStrategy.ROUND_ROBIN:
            return self._get_node_by_round_robin()
        elif self.strategy == LoadBalanceStrategy.LEAST_CONNECTIONS:
            return self._get_node_by_least_connections()
        elif self.strategy == LoadBalanceStrategy.PERFORMANCE_BASED:
            return self._get_node_by_performance()
        elif self.strategy == LoadBalanceStrategy.RANDOM:
            return self._get_node_by_random()
        else:
            # 默认使用轮询
            return self._get_node_by_round_robin()
    
    async def connect_all(self) -> Dict[str, bool]:
        """连接所有节点"""
        results = {}
        tasks = []
        
        for node_id, node in self.nodes.items():
            task = asyncio.create_task(node.connect())
            tasks.append((node_id, task))
        
        for node_id, task in tasks:
            try:
                results[node_id] = await task
            except Exception as e:
                logger.error(f"Error connecting to node {node_id}: {e}")
                results[node_id] = False
        
        successful_connections = sum(1 for success in results.values() if success)
        logger.info(f"Connected to {successful_connections}/{len(self.nodes)} Redis nodes")
        
        return results
    
    async def disconnect_all(self):
        """断开所有节点连接"""
        tasks = []
        for node in self.nodes.values():
            if node.redis:
                tasks.append(asyncio.create_task(node.disconnect()))
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        
        logger.info("Disconnected from all Redis nodes")
    
    async def start_health_monitoring(self):
        """启动健康监控"""
        if self.health_check_task and not self.health_check_task.done():
            return
        
        self.health_check_task = asyncio.create_task(self._health_check_loop())
        logger.info("Started Redis cluster health monitoring")
    
    async def stop_health_monitoring(self):
        """停止健康监控"""
        if self.health_check_task and not self.health_check_task.done():
            self.health_check_task.cancel()
            try:
                await self.health_check_task
            except asyncio.CancelledError:
                pass
        
        logger.info("Stopped Redis cluster health monitoring")
    
    async def _health_check_loop(self):
        """健康检查循环"""
        while True:
            try:
                await self._perform_health_checks()
                await asyncio.sleep(self.health_check_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in health check loop: {e}")
                await asyncio.sleep(5)  # 短暂延迟后继续
    
    async def _perform_health_checks(self):
        """执行健康检查"""
        tasks = []
        for node in self.nodes.values():
            tasks.append(asyncio.create_task(node.health_check()))
        
        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            healthy_count = 0
            for i, result in enumerate(results):
                node = list(self.nodes.values())[i]
                if isinstance(result, bool) and result:
                    healthy_count += 1
                elif isinstance(result, Exception):
                    logger.error(f"Health check error for {node.node_id}: {result}")
                    node.status = NodeStatus.FAILED
            
            logger.debug(f"Health check completed: {healthy_count}/{len(self.nodes)} nodes healthy")
    
    async def execute_on_node(self, node: RedisNode, operation: str, *args, **kwargs) -> Any:
        """在指定节点上执行操作"""
        if not node.redis:
            raise Exception(f"Node {node.node_id} is not connected")
        
        start_time = asyncio.get_event_loop().time()
        success = False
        
        try:
            node.connection_count += 1
            
            # 获取Redis操作方法
            method = getattr(node.redis, operation, None)
            if not method:
                raise AttributeError(f"Redis operation '{operation}' not found")
            
            result = await method(*args, **kwargs)
            success = True
            return result
            
        except Exception as e:
            logger.error(f"Operation '{operation}' failed on node {node.node_id}: {e}")
            raise
        finally:
            node.connection_count = max(0, node.connection_count - 1)
            response_time = asyncio.get_event_loop().time() - start_time
            node.update_performance_metrics(success, response_time)
    
    async def execute_with_failover(self, operation: str, key: Optional[str] = None, 
                                   *args, **kwargs) -> Any:
        """执行操作，支持故障转移"""
        attempts = 0
        last_error = None
        
        # 不需要重试的错误类型
        non_retryable_errors = [
            "BUSYGROUP",  # 消费者组已存在
            "WRONGTYPE",  # 错误的数据类型
            "SYNTAX",     # 语法错误
        ]
        
        while attempts < self.max_retries:
            try:
                node = self.get_node(key)
                if not node:
                    raise Exception("No healthy Redis nodes available")
                
                return await self.execute_on_node(node, operation, *args, **kwargs)
                
            except Exception as e:
                last_error = e
                error_str = str(e)
                
                # 检查是否为不需要重试的错误
                if any(err_type in error_str for err_type in non_retryable_errors):
                    logger.debug(f"Non-retryable error for operation '{operation}': {e}")
                    raise e
                
                attempts += 1
                
                if attempts < self.max_retries:
                    await asyncio.sleep(self.retry_delay * attempts)
                    logger.warning(f"Retrying operation '{operation}' (attempt {attempts + 1})")
        
        # 所有重试都失败
        error_msg = f"Operation '{operation}' failed after {self.max_retries} attempts"
        if last_error:
            error_msg += f": {last_error}"
        
        logger.error(error_msg)
        raise Exception(error_msg)
    
    def get_cluster_info(self) -> Dict[str, Any]:
        """获取集群信息"""
        healthy_nodes = [n for n in self.nodes.values() if n.status == NodeStatus.HEALTHY]
        degraded_nodes = [n for n in self.nodes.values() if n.status == NodeStatus.DEGRADED]
        failed_nodes = [n for n in self.nodes.values() if n.status == NodeStatus.FAILED]
        
        total_requests = sum(node.total_requests for node in self.nodes.values())
        total_successful = sum(node.successful_requests for node in self.nodes.values())
        
        return {
            'strategy': self.strategy.value,
            'total_nodes': len(self.nodes),
            'healthy_nodes': len(healthy_nodes),
            'degraded_nodes': len(degraded_nodes),
            'failed_nodes': len(failed_nodes),
            'total_requests': total_requests,
            'success_rate': total_successful / total_requests if total_requests > 0 else 1.0,
            'avg_response_time': sum(n.avg_response_time for n in self.nodes.values()) / len(self.nodes) if self.nodes else 0,
            'health_check_interval': self.health_check_interval,
            'is_monitoring': self.health_check_task is not None and not self.health_check_task.done(),
            'nodes': [node.get_node_info() for node in self.nodes.values()]
        }

# 全局集群管理器实例
redis_cluster = RedisClusterManager()