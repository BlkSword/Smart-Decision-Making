import os
import json
import logging
from typing import Any, Dict, List, Optional, Union
from datetime import datetime, timedelta
import redis.asyncio as redis
import asyncio
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)

class RedisClient:
    """Redis客户端管理类"""
    
    def __init__(self):
        self.redis: Optional[redis.Redis] = None
        self.config = {
            'host': os.getenv('REDIS_HOST', 'localhost'),
            'port': int(os.getenv('REDIS_PORT', 6379)),
            'password': os.getenv('REDIS_PASSWORD'),
            'db': int(os.getenv('REDIS_DB', 0)),
            'max_connections': int(os.getenv('REDIS_MAX_CONNECTIONS', 100)),
            'socket_timeout': float(os.getenv('REDIS_SOCKET_TIMEOUT', 5.0)),
            'socket_connect_timeout': float(os.getenv('REDIS_SOCKET_CONNECT_TIMEOUT', 5.0)),
            'decode_responses': True,
            'encoding': 'utf-8'
        }
        
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
        """连接到Redis"""
        try:
            logger.info(f"Redis config: host={self.config['host']}, port={self.config['port']}, password={'***' if self.config['password'] else 'None'}")
            # 尝试不同的连接方式
            connection_attempts = []
            
            # 方式1: 使用URL连接 (优先使用，对认证更友好)
            if self.config['password']:
                redis_url = f"redis://:{self.config['password']}@{self.config['host']}:{self.config['port']}/{self.config['db']}"
                connection_attempts.append(('URL with password', lambda: redis.from_url(
                    redis_url,
                    socket_timeout=self.config['socket_timeout'],
                    socket_connect_timeout=self.config['socket_connect_timeout'],
                    decode_responses=self.config['decode_responses'],
                    encoding=self.config['encoding']
                )))
            
            # 方式2: 直接参数连接
            connection_params = {
                'host': self.config['host'],
                'port': self.config['port'],
                'db': self.config['db'],
                'socket_timeout': self.config['socket_timeout'],
                'socket_connect_timeout': self.config['socket_connect_timeout'],
                'decode_responses': self.config['decode_responses'],
                'encoding': self.config['encoding']
            }
            
            if self.config['password']:
                connection_params['password'] = self.config['password']
            
            connection_attempts.append(('Direct params', lambda: redis.Redis(**connection_params)))
            
            # 方式3: 无密码连接 (备用)
            if not self.config['password']:
                connection_attempts.append(('No auth', lambda: redis.Redis(
                    host=self.config['host'],
                    port=self.config['port'],
                    db=self.config['db'],
                    socket_timeout=self.config['socket_timeout'],
                    socket_connect_timeout=self.config['socket_connect_timeout'],
                    decode_responses=self.config['decode_responses'],
                    encoding=self.config['encoding']
                )))
            
            # 尝试连接
            for method_name, create_connection in connection_attempts:
                try:
                    logger.info(f"Trying Redis connection method: {method_name}")
                    self.redis = create_connection()
                    
                    # 测试连接
                    await self.redis.ping()
                    logger.info(f"Successfully connected to Redis at {self.config['host']}:{self.config['port']} using {method_name}")
                    return
                    
                except Exception as conn_error:
                    logger.warning(f"Connection attempt with {method_name} failed: {conn_error}")
                    if self.redis:
                        try:
                            await self.redis.close()
                        except:
                            pass
                        self.redis = None
                    continue
            
            # 所有连接尝试都失败
            raise Exception("All Redis connection attempts failed")
            
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            logger.info("Redis connection failed, system will run without caching")
            self.redis = None
            # 不抛出异常，让系统在没有Redis的情况下继续运行
    
    async def disconnect(self):
        """断开Redis连接"""
        if self.redis:
            await self.redis.close()
            self.redis = None
            logger.info("Disconnected from Redis")
    
    def _get_key(self, prefix: str, identifier: str) -> str:
        """生成Redis键名"""
        return f"{self.KEY_PREFIX.get(prefix, prefix)}{identifier}"
    
    # === 基础操作 ===
    
    async def set(self, key: str, value: Any, expire: Optional[int] = None) -> bool:
        """设置键值"""
        if not self.redis:
            logger.debug("Redis not available, skipping SET operation")
            return False
            
        try:
            if isinstance(value, (dict, list)):
                value = json.dumps(value, ensure_ascii=False, default=str)
            
            result = await self.redis.set(key, value, ex=expire)
            return result
        except Exception as e:
            logger.error(f"Redis SET error: {e}")
            return False
    
    async def get(self, key: str) -> Optional[Any]:
        """获取键值"""
        if not self.redis:
            logger.debug("Redis not available, skipping GET operation")
            return None
            
        try:
            value = await self.redis.get(key)
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
        if not self.redis:
            logger.debug("Redis not available, skipping DELETE operation")
            return 0
            
        try:
            return await self.redis.delete(*keys)
        except Exception as e:
            logger.error(f"Redis DELETE error: {e}")
            return 0
    
    async def exists(self, key: str) -> bool:
        """检查键是否存在"""
        try:
            return await self.redis.exists(key) > 0
        except Exception as e:
            logger.error(f"Redis EXISTS error: {e}")
            return False
    
    async def expire(self, key: str, seconds: int) -> bool:
        """设置键过期时间"""
        try:
            return await self.redis.expire(key, seconds)
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
            
            return await self.redis.lpush(key, *serialized_values)
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
            
            return await self.redis.rpush(key, *serialized_values)
        except Exception as e:
            logger.error(f"Redis RPUSH error: {e}")
            return 0
    
    async def lrange(self, key: str, start: int = 0, end: int = -1) -> List[Any]:
        """获取列表范围内的元素"""
        try:
            values = await self.redis.lrange(key, start, end)
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
            return await self.redis.ltrim(key, start, end)
        except Exception as e:
            logger.error(f"Redis LTRIM error: {e}")
            return False
    
    # === 哈希操作 ===
    
    async def hset(self, key: str, field: str, value: Any) -> int:
        """设置哈希字段值"""
        try:
            if isinstance(value, (dict, list)):
                value = json.dumps(value, ensure_ascii=False, default=str)
            
            return await self.redis.hset(key, field, value)
        except Exception as e:
            logger.error(f"Redis HSET error: {e}")
            return 0
    
    async def hget(self, key: str, field: str) -> Optional[Any]:
        """获取哈希字段值"""
        try:
            value = await self.redis.hget(key, field)
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
            hash_data = await self.redis.hgetall(key)
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
            return await self.redis.hdel(key, *fields)
        except Exception as e:
            logger.error(f"Redis HDEL error: {e}")
            return 0
    
    # === 集合操作 ===
    
    async def sadd(self, key: str, *members: Any) -> int:
        """添加元素到集合"""
        try:
            serialized_members = []
            for member in members:
                if isinstance(member, (dict, list)):
                    serialized_members.append(json.dumps(member, ensure_ascii=False, default=str))
                else:
                    serialized_members.append(str(member))
            
            return await self.redis.sadd(key, *serialized_members)
        except Exception as e:
            logger.error(f"Redis SADD error: {e}")
            return 0
    
    async def smembers(self, key: str) -> set:
        """获取集合所有成员"""
        try:
            members = await self.redis.smembers(key)
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
    
    # === 有序集合操作 ===
    
    async def zadd(self, key: str, mapping: Dict[str, float]) -> int:
        """添加元素到有序集合"""
        try:
            serialized_mapping = {}
            for member, score in mapping.items():
                if isinstance(member, (dict, list)):
                    serialized_mapping[json.dumps(member, ensure_ascii=False, default=str)] = score
                else:
                    serialized_mapping[str(member)] = score
            
            return await self.redis.zadd(key, serialized_mapping)
        except Exception as e:
            logger.error(f"Redis ZADD error: {e}")
            return 0
    
    async def zrange(self, key: str, start: int = 0, end: int = -1, desc: bool = False, withscores: bool = False) -> List[Any]:
        """获取有序集合范围内的元素"""
        try:
            if desc:
                result = await self.redis.zrevrange(key, start, end, withscores=withscores)
            else:
                result = await self.redis.zrange(key, start, end, withscores=withscores)
            
            if withscores:
                parsed_result = []
                for member, score in result:
                    try:
                        parsed_member = json.loads(member)
                    except (json.JSONDecodeError, TypeError):
                        parsed_member = member
                    parsed_result.append((parsed_member, score))
                return parsed_result
            else:
                parsed_result = []
                for member in result:
                    try:
                        parsed_result.append(json.loads(member))
                    except (json.JSONDecodeError, TypeError):
                        parsed_result.append(member)
                return parsed_result
        except Exception as e:
            logger.error(f"Redis ZRANGE error: {e}")
            return []
    
    # === 发布订阅 ===
    
    async def publish(self, channel: str, message: Any) -> int:
        """发布消息到频道"""
        try:
            if isinstance(message, (dict, list)):
                message = json.dumps(message, ensure_ascii=False, default=str)
            
            return await self.redis.publish(channel, message)
        except Exception as e:
            logger.error(f"Redis PUBLISH error: {e}")
            return 0
    
    @asynccontextmanager
    async def subscribe(self, *channels: str):
        """订阅频道"""
        pubsub = None
        try:
            pubsub = self.redis.pubsub()
            await pubsub.subscribe(*channels)
            yield pubsub
        except Exception as e:
            logger.error(f"Redis SUBSCRIBE error: {e}")
            raise
        finally:
            if pubsub:
                await pubsub.unsubscribe(*channels)
                await pubsub.close()
    
    # === Redis Streams 操作 ===
    
    async def xadd(self, stream: str, fields: Dict[str, Any], max_len: Optional[int] = None) -> Optional[str]:
        """向流中添加消息"""
        if not self.redis:
            logger.debug("Redis not available, skipping XADD operation")
            return None
            
        try:
            # 序列化复杂数据类型
            serialized_fields = {}
            for key, value in fields.items():
                if isinstance(value, (dict, list)):
                    serialized_fields[key] = json.dumps(value, ensure_ascii=False, default=str)
                else:
                    serialized_fields[key] = str(value)
            
            # 添加消息到流
            message_id = await self.redis.xadd(stream, serialized_fields, maxlen=max_len)
            return message_id
        except Exception as e:
            logger.error(f"Redis XADD error: {e}")
            return None
    
    async def xread(self, streams: Dict[str, str], count: Optional[int] = None, block: Optional[int] = None) -> List[Dict[str, Any]]:
        """读取流消息"""
        if not self.redis:
            logger.debug("Redis not available, skipping XREAD operation")
            return []
            
        try:
            results = await self.redis.xread(streams, count=count, block=block)
            
            processed_results = []
            for stream_name, messages in results:
                for message_id, fields in messages:
                    # 反序列化数据
                    processed_fields = {}
                    for key, value in fields.items():
                        try:
                            processed_fields[key] = json.loads(value)
                        except (json.JSONDecodeError, TypeError):
                            processed_fields[key] = value
                    
                    processed_results.append({
                        'stream': stream_name,
                        'id': message_id,
                        'fields': processed_fields
                    })
            
            return processed_results
        except Exception as e:
            logger.error(f"Redis XREAD error: {e}")
            return []
    
    async def xrange(self, stream: str, start: str = '-', end: str = '+', count: Optional[int] = None) -> List[Dict[str, Any]]:
        """获取流中指定范围的消息"""
        if not self.redis:
            logger.debug("Redis not available, skipping XRANGE operation")
            return []
            
        try:
            results = await self.redis.xrange(stream, start, end, count=count)
            
            processed_results = []
            for message_id, fields in results:
                # 反序列化数据
                processed_fields = {}
                for key, value in fields.items():
                    try:
                        processed_fields[key] = json.loads(value)
                    except (json.JSONDecodeError, TypeError):
                        processed_fields[key] = value
                
                processed_results.append({
                    'id': message_id,
                    'fields': processed_fields
                })
            
            return processed_results
        except Exception as e:
            logger.error(f"Redis XRANGE error: {e}")
            return []
    
    async def xlen(self, stream: str) -> int:
        """获取流的长度"""
        if not self.redis:
            logger.debug("Redis not available, skipping XLEN operation")
            return 0
            
        try:
            return await self.redis.xlen(stream)
        except Exception as e:
            logger.error(f"Redis XLEN error: {e}")
            return 0
    
    async def xtrim(self, stream: str, max_len: int, approximate: bool = True) -> int:
        """修剪流长度"""
        if not self.redis:
            logger.debug("Redis not available, skipping XTRIM operation")
            return 0
            
        try:
            return await self.redis.xtrim(stream, maxlen=max_len, approximate=approximate)
        except Exception as e:
            logger.error(f"Redis XTRIM error: {e}")
            return 0
    
    async def xgroup_create(self, stream: str, group: str, id: str = '0', mkstream: bool = True) -> bool:
        """创建消费者组"""
        if not self.redis:
            logger.debug("Redis not available, skipping XGROUP CREATE operation")
            return False
            
        try:
            await self.redis.xgroup_create(stream, group, id, mkstream=mkstream)
            return True
        except Exception as e:
            logger.error(f"Redis XGROUP CREATE error: {e}")
            return False
    
    async def xreadgroup(self, group: str, consumer: str, streams: Dict[str, str], 
                        count: Optional[int] = None, block: Optional[int] = None) -> List[Dict[str, Any]]:
        """使用消费者组读取流消息"""
        if not self.redis:
            logger.debug("Redis not available, skipping XREADGROUP operation")
            return []
            
        try:
            results = await self.redis.xreadgroup(group, consumer, streams, count=count, block=block)
            
            processed_results = []
            for stream_name, messages in results:
                for message_id, fields in messages:
                    # 反序列化数据
                    processed_fields = {}
                    for key, value in fields.items():
                        try:
                            processed_fields[key] = json.loads(value)
                        except (json.JSONDecodeError, TypeError):
                            processed_fields[key] = value
                    
                    processed_results.append({
                        'stream': stream_name,
                        'id': message_id,
                        'fields': processed_fields
                    })
            
            return processed_results
        except Exception as e:
            logger.error(f"Redis XREADGROUP error: {e}")
            return []
    
    # === 高级功能 ===
    
    async def pipeline(self):
        """创建管道"""
        return self.redis.pipeline()
    
    async def flushdb(self):
        """清空当前数据库"""
        try:
            return await self.redis.flushdb()
        except Exception as e:
            logger.error(f"Redis FLUSHDB error: {e}")
            return False
    
    async def info(self, section: Optional[str] = None) -> Dict[str, Any]:
        """获取Redis信息"""
        try:
            return await self.redis.info(section)
        except Exception as e:
            logger.error(f"Redis INFO error: {e}")
            return {}
    
    # === 业务相关方法 ===
    
    async def cache_company(self, company_id: str, company_data: Dict[str, Any], expire: int = 300):
        """缓存公司数据"""
        key = self._get_key('company', company_id)
        return await self.set(key, company_data, expire)
    
    async def get_cached_company(self, company_id: str) -> Optional[Dict[str, Any]]:
        """获取缓存的公司数据"""
        key = self._get_key('company', company_id)
        return await self.get(key)
    
    async def cache_game_state(self, state_data: Dict[str, Any], expire: int = 60):
        """缓存游戏状态"""
        key = self._get_key('game_state', 'current')
        return await self.set(key, state_data, expire)
    
    async def get_cached_game_state(self) -> Optional[Dict[str, Any]]:
        """获取缓存的游戏状态"""
        key = self._get_key('game_state', 'current')
        return await self.get(key)
    
    async def add_game_event(self, event_data: Dict[str, Any]):
        """添加游戏事件到流"""
        key = self._get_key('events', 'stream')
        # 使用列表存储最近的事件，限制数量
        await self.lpush(key, event_data)
        await self.ltrim(key, 0, 999)  # 保留最近1000个事件
    
    async def get_recent_events(self, limit: int = 100) -> List[Dict[str, Any]]:
        """获取最近的游戏事件"""
        key = self._get_key('events', 'stream')
        return await self.lrange(key, 0, limit - 1)
    
    async def update_stats(self, stat_name: str, value: Any, expire: int = 3600):
        """更新统计数据"""
        key = self._get_key('stats', stat_name)
        return await self.set(key, value, expire)
    
    async def get_stats(self, stat_name: str) -> Optional[Any]:
        """获取统计数据"""
        key = self._get_key('stats', stat_name)
        return await self.get(key)

# 全局Redis客户端实例
redis_client = RedisClient()