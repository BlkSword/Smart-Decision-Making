import os
import json
import logging
from typing import Any, Dict, List, Optional, Union
from datetime import datetime, timedelta
import redis.asyncio as redis
import asyncio
from contextlib import asynccontextmanager

from .redis_cluster import RedisClusterManager, redis_cluster, LoadBalanceStrategy
from .cluster_config import ClusterConfigManager, cluster_config_manager

logger = logging.getLogger(__name__)

class ClusterAwareRedisClient:
    """集群感知的Redis客户端"""
    
    def __init__(self):
        self.cluster: RedisClusterManager = redis_cluster
        self.config_manager: ClusterConfigManager = cluster_config_manager
        self.single_redis: Optional[redis.Redis] = None  # 单节点模式的后备
        self.is_cluster_mode = False
        
        # Redis键前缀
        self.KEY_PREFIX = {
            'company': 'ai_war:company:',
            'employee': 'ai_war:employee:',
            'decision': 'ai_war:decision:',
            'game_state': 'ai_war:game:',
            'session': 'ai_war:session:',
            'cache': 'ai_war:cache:',
            'events': 'ai_war:events:',
            'stats': 'ai_war:stats:'
        }
    
    async def connect(self):
        """连接到Redis（集群或单节点）"""
        try:
            # 尝试加载集群配置
            cluster_loaded = False
            
            # 1. 尝试从配置文件加载
            if self.config_manager.load_from_file():
                cluster_loaded = True
                logger.info("Loaded Redis cluster config from file")
            
            # 2. 尝试从环境变量加载
            elif self.config_manager.load_from_env():
                cluster_loaded = True
                logger.info("Loaded Redis cluster config from environment")
            
            # 3. 使用默认单节点配置
            else:
                logger.info("No cluster config found, creating default single-node config")
                self.config_manager.create_default_config()
                cluster_loaded = True
            
            if cluster_loaded:
                # 验证配置
                validation_errors = self.config_manager.validate_config()
                if validation_errors:
                    logger.warning(f"Cluster config validation errors: {validation_errors}")
                    return await self._fallback_to_single_node()
                
                # 应用配置到集群
                if self.config_manager.apply_to_cluster(self.cluster):
                    # 尝试连接集群
                    connection_results = await self.cluster.connect_all()
                    
                    successful_connections = sum(1 for success in connection_results.values() if success)
                    
                    if successful_connections > 0:
                        self.is_cluster_mode = True
                        await self.cluster.start_health_monitoring()
                        logger.info(f"Redis cluster mode activated with {successful_connections} nodes")
                        return
                    else:
                        logger.warning("No cluster nodes could be connected")
            
            # 集群模式失败，回退到单节点模式
            await self._fallback_to_single_node()
            
        except Exception as e:
            logger.error(f"Error initializing Redis client: {e}")
            await self._fallback_to_single_node()
    
    async def _fallback_to_single_node(self):
        """回退到单节点模式"""
        try:
            logger.info("Falling back to single-node Redis mode")
            
            config = {
                'host': os.getenv('REDIS_HOST', '127.0.0.1'),
                'port': int(os.getenv('REDIS_PORT', 6379)),
                'password': os.getenv('REDIS_PASSWORD'),
                'db': int(os.getenv('REDIS_DB', 0)),
                'socket_timeout': 5.0,
                'socket_connect_timeout': 5.0,
                'decode_responses': True,
                'encoding': 'utf-8'
            }
            
            # 尝试URL连接方式
            if config['password']:
                redis_url = f"redis://:{config['password']}@{config['host']}:{config['port']}/{config['db']}"
                self.single_redis = redis.from_url(
                    redis_url,
                    socket_timeout=config['socket_timeout'],
                    socket_connect_timeout=config['socket_connect_timeout'],
                    decode_responses=config['decode_responses'],
                    encoding=config['encoding']
                )
            else:
                self.single_redis = redis.Redis(**{k: v for k, v in config.items() if v is not None})
            
            # 测试连接
            await self.single_redis.ping()
            self.is_cluster_mode = False
            logger.info(f"Single-node Redis connected at {config['host']}:{config['port']}")
            
        except Exception as e:
            logger.error(f"Single-node Redis connection failed: {e}")
            logger.info("Redis unavailable, system will run without caching")
            self.single_redis = None
            self.is_cluster_mode = False
    
    async def disconnect(self):
        """断开连接"""
        try:
            if self.is_cluster_mode:
                await self.cluster.stop_health_monitoring()
                await self.cluster.disconnect_all()
                logger.info("Disconnected from Redis cluster")
            elif self.single_redis:
                await self.single_redis.close()
                self.single_redis = None
                logger.info("Disconnected from single-node Redis")
        except Exception as e:
            logger.error(f"Error disconnecting from Redis: {e}")
    
    def _get_key(self, prefix: str, identifier: str) -> str:
        """生成Redis键名"""
        return f"{self.KEY_PREFIX.get(prefix, prefix)}{identifier}"
    
    @property
    def redis(self) -> Optional[redis.Redis]:
        """获取Redis连接（用于向后兼容）"""
        if self.is_cluster_mode:
            # 在集群模式下，返回一个节点的连接（仅用于兼容性）
            node = self.cluster.get_node()
            return node.redis if node else None
        return self.single_redis
    
    async def _execute_operation(self, operation: str, key: Optional[str] = None, *args, **kwargs) -> Any:
        """执行Redis操作"""
        if self.is_cluster_mode:
            return await self.cluster.execute_with_failover(operation, key, *args, **kwargs)
        elif self.single_redis:
            method = getattr(self.single_redis, operation, None)
            if not method:
                raise AttributeError(f"Redis operation '{operation}' not found")
            return await method(*args, **kwargs)
        else:
            logger.debug(f"Redis not available, skipping {operation} operation")
            return None
    
    # === 基础操作 ===
    
    async def set(self, key: str, value: Any, expire: Optional[int] = None) -> bool:
        """设置键值"""
        try:
            if isinstance(value, (dict, list)):
                value = json.dumps(value, ensure_ascii=False, default=str)
            
            result = await self._execute_operation('set', key, key, value, ex=expire)
            return bool(result)
        except Exception as e:
            logger.error(f"Redis SET error: {e}")
            return False
    
    async def get(self, key: str) -> Optional[Any]:
        """获取键值"""
        try:
            value = await self._execute_operation('get', key, key)
            if value is None:
                return None
            
            # 尝试解析JSON
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return value
        except Exception as e:
            logger.error(f"Redis GET error: {e}")
            return None
    
    async def delete(self, *keys: str) -> int:
        """删除键"""
        try:
            if not keys:
                return 0
            
            # 在集群模式下，可能需要分别删除不同节点上的键
            if self.is_cluster_mode:
                total_deleted = 0
                for key in keys:
                    result = await self._execute_operation('delete', key, key)
                    total_deleted += result if result else 0
                return total_deleted
            else:
                result = await self._execute_operation('delete', None, *keys)
                return result if result else 0
        except Exception as e:
            logger.error(f"Redis DELETE error: {e}")
            return 0
    
    async def exists(self, key: str) -> bool:
        """检查键是否存在"""
        try:
            result = await self._execute_operation('exists', key, key)
            return bool(result)
        except Exception as e:
            logger.error(f"Redis EXISTS error: {e}")
            return False
    
    async def expire(self, key: str, seconds: int) -> bool:
        """设置键过期时间"""
        try:
            result = await self._execute_operation('expire', key, key, seconds)
            return bool(result)
        except Exception as e:
            logger.error(f"Redis EXPIRE error: {e}")
            return False
    
    # === 列表操作 ===
    
    async def lpush(self, key: str, *values: Any) -> int:
        """从左侧添加元素到列表"""
        try:
            serialized_values = []
            for value in values:
                if isinstance(value, (dict, list)):
                    serialized_values.append(json.dumps(value, ensure_ascii=False, default=str))
                else:
                    serialized_values.append(str(value))
            
            result = await self._execute_operation('lpush', key, key, *serialized_values)
            return result if result else 0
        except Exception as e:
            logger.error(f"Redis LPUSH error: {e}")
            return 0
    
    async def rpush(self, key: str, *values: Any) -> int:
        """从右侧添加元素到列表"""
        try:
            serialized_values = []
            for value in values:
                if isinstance(value, (dict, list)):
                    serialized_values.append(json.dumps(value, ensure_ascii=False, default=str))
                else:
                    serialized_values.append(str(value))
            
            result = await self._execute_operation('rpush', key, key, *serialized_values)
            return result if result else 0
        except Exception as e:
            logger.error(f"Redis RPUSH error: {e}")
            return 0
    
    async def lpop(self, key: str) -> Optional[Any]:
        """从左侧弹出元素"""
        try:
            value = await self._execute_operation('lpop', key, key)
            if value is None:
                return None
            
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return value
        except Exception as e:
            logger.error(f"Redis LPOP error: {e}")
            return None
    
    async def rpop(self, key: str) -> Optional[Any]:
        """从右侧弹出元素"""
        try:
            value = await self._execute_operation('rpop', key, key)
            if value is None:
                return None
            
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return value
        except Exception as e:
            logger.error(f"Redis RPOP error: {e}")
            return None
    
    # === 监控和信息操作 ===
    
    async def info(self, section: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """获取Redis信息"""
        try:
            if self.is_cluster_mode:
                # 集群模式下，从主节点获取信息
                node = self.cluster.get_node()
                if not node or not node.redis:
                    return None
                
                info_result = await node.redis.info(section=section)
                return dict(info_result) if info_result else None
            else:
                if not self.single_redis:
                    return None
                
                info_result = await self.single_redis.info(section=section)
                return dict(info_result) if info_result else None
        except Exception as e:
            logger.error(f"Redis INFO error: {e}")
            return None
    
    async def ping(self) -> bool:
        """测试Redis连接"""
        try:
            result = await self._execute_operation('ping', None)
            return result == b'PONG' or result == 'PONG' or result is True
        except Exception as e:
            logger.error(f"Redis PING error: {e}")
            return False
    
    async def dbsize(self) -> int:
        """获取数据库大小"""
        try:
            result = await self._execute_operation('dbsize', None)
            return result if result else 0
        except Exception as e:
            logger.error(f"Redis DBSIZE error: {e}")
            return 0
    
    async def memory_usage(self, key: str) -> int:
        """获取键的内存使用量"""
        try:
            result = await self._execute_operation('memory_usage', key, key)
            return result if result else 0
        except Exception as e:
            logger.error(f"Redis MEMORY USAGE error: {e}")
            return 0
    
    async def slowlog_get(self, num: int = 10) -> List[Dict[str, Any]]:
        """获取慢查询日志"""
        try:
            if self.is_cluster_mode:
                # 集群模式下，从主节点获取
                node = self.cluster.get_node()
                if not node or not node.redis:
                    return []
                
                result = await node.redis.slowlog_get(num)
                return [dict(entry._asdict()) for entry in result] if result else []
            else:
                if not self.single_redis:
                    return []
                
                result = await self.single_redis.slowlog_get(num)
                return [dict(entry._asdict()) for entry in result] if result else []
        except Exception as e:
            logger.error(f"Redis SLOWLOG GET error: {e}")
            return []
    
    async def llen(self, key: str) -> int:
        """获取列表长度"""
        try:
            result = await self._execute_operation('llen', key, key)
            return result if result else 0
        except Exception as e:
            logger.error(f"Redis LLEN error: {e}")
            return 0
    
    async def lrange(self, key: str, start: int, end: int) -> List[Any]:
        """获取列表范围内的元素"""
        try:
            values = await self._execute_operation('lrange', key, key, start, end)
            if not values:
                return []
            
            result = []
            for value in values:
                try:
                    result.append(json.loads(value))
                except (json.JSONDecodeError, TypeError):
                    result.append(value)
            
            return result
        except Exception as e:
            logger.error(f"Redis LRANGE error: {e}")
            return []
    
    async def ltrim(self, key: str, start: int, end: int) -> bool:
        """修剪列表"""
        try:
            result = await self._execute_operation('ltrim', key, key, start, end)
            return bool(result)
        except Exception as e:
            logger.error(f"Redis LTRIM error: {e}")
            return False
    
    # === 哈希操作 ===
    
    async def hset(self, key: str, field: str, value: Any) -> bool:
        """设置哈希字段"""
        try:
            if isinstance(value, (dict, list)):
                value = json.dumps(value, ensure_ascii=False, default=str)
            
            result = await self._execute_operation('hset', key, key, field, value)
            return bool(result)
        except Exception as e:
            logger.error(f"Redis HSET error: {e}")
            return False
    
    async def hget(self, key: str, field: str) -> Optional[Any]:
        """获取哈希字段"""
        try:
            value = await self._execute_operation('hget', key, key, field)
            if value is None:
                return None
            
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return value
        except Exception as e:
            logger.error(f"Redis HGET error: {e}")
            return None
    
    async def hgetall(self, key: str) -> Dict[str, Any]:
        """获取哈希所有字段"""
        try:
            hash_data = await self._execute_operation('hgetall', key, key)
            if not hash_data:
                return {}
            
            result = {}
            for field, value in hash_data.items():
                try:
                    result[field] = json.loads(value)
                except (json.JSONDecodeError, TypeError):
                    result[field] = value
            
            return result
        except Exception as e:
            logger.error(f"Redis HGETALL error: {e}")
            return {}
    
    async def hdel(self, key: str, *fields: str) -> int:
        """删除哈希字段"""
        try:
            result = await self._execute_operation('hdel', key, key, *fields)
            return result if result else 0
        except Exception as e:
            logger.error(f"Redis HDEL error: {e}")
            return 0
    
    # === 集合操作 ===
    
    async def sadd(self, key: str, *members: Any) -> int:
        """添加集合成员"""
        try:
            serialized_members = []
            for member in members:
                if isinstance(member, (dict, list)):
                    serialized_members.append(json.dumps(member, ensure_ascii=False, default=str))
                else:
                    serialized_members.append(str(member))
            
            result = await self._execute_operation('sadd', key, key, *serialized_members)
            return result if result else 0
        except Exception as e:
            logger.error(f"Redis SADD error: {e}")
            return 0
    
    async def srem(self, key: str, *members: Any) -> int:
        """移除集合成员"""
        try:
            serialized_members = []
            for member in members:
                if isinstance(member, (dict, list)):
                    serialized_members.append(json.dumps(member, ensure_ascii=False, default=str))
                else:
                    serialized_members.append(str(member))
            
            result = await self._execute_operation('srem', key, key, *serialized_members)
            return result if result else 0
        except Exception as e:
            logger.error(f"Redis SREM error: {e}")
            return 0
    
    async def smembers(self, key: str) -> set:
        """获取集合所有成员"""
        try:
            members = await self._execute_operation('smembers', key, key)
            if not members:
                return set()
            
            result = set()
            for member in members:
                try:
                    result.add(json.loads(member))
                except (json.JSONDecodeError, TypeError):
                    result.add(member)
            
            return result
        except Exception as e:
            logger.error(f"Redis SMEMBERS error: {e}")
            return set()
    
    # === Streams操作 ===
    
    async def xadd(self, stream: str, fields: Dict[str, Any], max_len: Optional[int] = None) -> Optional[str]:
        """添加流消息"""
        try:
            # 序列化字段值
            serialized_fields = {}
            for field, value in fields.items():
                if isinstance(value, (dict, list)):
                    serialized_fields[field] = json.dumps(value, ensure_ascii=False, default=str)
                else:
                    serialized_fields[field] = str(value)
            
            kwargs = {}
            if max_len is not None:
                kwargs['maxlen'] = max_len
            
            result = await self._execute_operation('xadd', stream, stream, serialized_fields, **kwargs)
            return result
        except Exception as e:
            logger.error(f"Redis XADD error: {e}")
            return None
    
    async def xread(self, streams: Dict[str, str], count: Optional[int] = None, 
                   block: Optional[int] = None) -> List[Any]:
        """读取流消息"""
        try:
            kwargs = {}
            if count is not None:
                kwargs['count'] = count
            if block is not None:
                kwargs['block'] = block
            
            # 选择一个流来决定使用哪个节点（简化处理）
            first_stream = next(iter(streams.keys())) if streams else None
            result = await self._execute_operation('xread', first_stream, streams, **kwargs)
            return result if result else []
        except Exception as e:
            logger.error(f"Redis XREAD error: {e}")
            return []
    
    async def xrange(self, stream: str, min_id: str = '-', max_id: str = '+', 
                    count: Optional[int] = None) -> List[Any]:
        """获取流范围消息"""
        try:
            kwargs = {}
            if count is not None:
                kwargs['count'] = count
            
            result = await self._execute_operation('xrange', stream, stream, min_id, max_id, **kwargs)
            return result if result else []
        except Exception as e:
            logger.error(f"Redis XRANGE error: {e}")
            return []
    
    async def xlen(self, stream: str) -> int:
        """获取流长度"""
        try:
            result = await self._execute_operation('xlen', stream, stream)
            return result if result else 0
        except Exception as e:
            logger.error(f"Redis XLEN error: {e}")
            return 0
    
    async def xgroup_create(self, stream: str, group_name: str, id: str = '0', mkstream: bool = False) -> bool:
        """创建消费者组"""
        try:
            kwargs = {'mkstream': mkstream} if mkstream else {}
            result = await self._execute_operation('xgroup_create', stream, stream, group_name, id, **kwargs)
            return bool(result)
        except Exception as e:
            # BUSYGROUP错误表示消费者组已存在，这是正常的
            if "BUSYGROUP" in str(e):
                logger.debug(f"Consumer group {group_name} for stream {stream} already exists")
                return True
            logger.error(f"Redis XGROUP CREATE error: {e}")
            return False
    
    # === 系统信息 ===
    
    def get_connection_info(self) -> Dict[str, Any]:
        """获取连接信息"""
        if self.is_cluster_mode:
            cluster_info = self.cluster.get_cluster_info()
            return {
                'mode': 'cluster',
                'strategy': self.cluster.strategy.value,
                'connected': cluster_info.get('healthy_nodes', 0) > 0,
                'cluster_info': cluster_info
            }
        elif self.single_redis:
            return {
                'mode': 'single_node',
                'connected': True,
                'host': os.getenv('REDIS_HOST', '127.0.0.1'),
                'port': int(os.getenv('REDIS_PORT', 6379))
            }
        else:
            return {
                'mode': 'none',
                'connected': False
            }

# 全局集群感知Redis客户端实例
redis_client = ClusterAwareRedisClient()