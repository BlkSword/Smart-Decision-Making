import logging
from typing import Any, Dict, List, Optional, Callable
from datetime import datetime, timedelta
import asyncio
from functools import wraps
import hashlib
import json

from .redis_client_cluster import redis_client
from models.company import Company
from models.employee import Employee
from models.decision import Decision

logger = logging.getLogger(__name__)

class CacheManager:    
    def __init__(self):
        self.default_ttl = {
            'company': 300,      # 5分钟
            'employee': 600,     # 10分钟
            'decision': 180,     # 3分钟
            'game_state': 60,    # 1分钟
            'statistics': 300,   # 5分钟
            'events': 1800,      # 30分钟
            'hot_data': 30,      # 30秒 - 高频访问数据
            'cold_data': 3600,   # 1小时 - 低频访问数据
        }
        
        # 缓存统计
        self.cache_stats = {
            'hits': 0,
            'misses': 0,
            'errors': 0,
            'evictions': 0
        }
        
        # 缓存层配置
        self.cache_levels = {
            'L1': {'ttl': 30, 'max_size': 1000},    # 一级缓存：热数据
            'L2': {'ttl': 300, 'max_size': 5000},   # 二级缓存：温数据
            'L3': {'ttl': 3600, 'max_size': 10000}  # 三级缓存：冷数据
        }
    
    def _generate_cache_key(self, prefix: str, *args, **kwargs) -> str:
        key_data = {
            'args': args,
            'kwargs': kwargs
        }
        key_str = json.dumps(key_data, sort_keys=True, default=str)
        key_hash = hashlib.md5(key_str.encode()).hexdigest()[:8]
        
        return f"ai_war:cache:{prefix}:{key_hash}"
    
    def cached(self, ttl: Optional[int] = None, prefix: str = "default"):
        def decorator(func: Callable):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # 生成缓存键
                cache_key = self._generate_cache_key(f"{prefix}:{func.__name__}", *args, **kwargs)
                
                cached_result = await redis_client.get(cache_key)
                if cached_result is not None:
                    logger.debug(f"Cache hit for key: {cache_key}")
                    self.cache_stats['hits'] += 1
                    return cached_result
                
                logger.debug(f"Cache miss for key: {cache_key}")
                self.cache_stats['misses'] += 1
                result = await func(*args, **kwargs)
                
                # 存储到缓存
                cache_ttl = ttl or self.default_ttl.get(prefix, 300)
                await redis_client.set(cache_key, result, cache_ttl)
                
                return result
            return wrapper
        return decorator
    
    
    async def cache_company(self, company: Company) -> bool:
        try:
            key = f"ai_war:company:{company.id}"
            data = company.to_dict()
            return await redis_client.set(key, data, self.default_ttl['company'])
        except Exception as e:
            logger.error(f"Error caching company {company.id}: {e}")
            return False
    
    async def get_cached_company(self, company_id: str) -> Optional[Dict[str, Any]]:
        try:
            key = f"ai_war:company:{company_id}"
            return await redis_client.get(key)
        except Exception as e:
            logger.error(f"Error getting cached company {company_id}: {e}")
            return None
    
    async def invalidate_company_cache(self, company_id: str) -> bool:
        try:
            key = f"ai_war:company:{company_id}"
            result = await redis_client.delete(key)
            logger.info(f"Invalidated company cache for {company_id}")
            return result > 0
        except Exception as e:
            logger.error(f"Error invalidating company cache {company_id}: {e}")
            return False
    
    async def cache_companies_list(self, companies: List[Company]) -> bool:
        try:
            key = "ai_war:companies:list"
            data = [company.to_dict() for company in companies]
            return await redis_client.set(key, data, self.default_ttl['company'])
        except Exception as e:
            logger.error(f"Error caching companies list: {e}")
            return False
    
    async def get_cached_companies_list(self) -> Optional[List[Dict[str, Any]]]:
        try:
            key = "ai_war:companies:list"
            return await redis_client.get(key)
        except Exception as e:
            logger.error(f"Error getting cached companies list: {e}")
            return None
    
    
    async def cache_employee(self, employee: Employee) -> bool:
        try:
            key = f"ai_war:employee:{employee.id}"
            data = employee.to_dict()
            return await redis_client.set(key, data, self.default_ttl['employee'])
        except Exception as e:
            logger.error(f"Error caching employee {employee.id}: {e}")
            return False
    
    async def cache_decisions(self, decisions: List[Dict[str, Any]]) -> bool:
        try:
            key = "ai_war:decisions:recent"
            return await redis_client.set(key, decisions, self.default_ttl['decision'])
        except Exception as e:
            logger.error(f"Error caching decisions: {e}")
            return False
    
    async def get_cached_decisions(self) -> Optional[List[Dict[str, Any]]]:
        try:
            key = "ai_war:decisions:recent"
            return await redis_client.get(key)
        except Exception as e:
            logger.error(f"Error getting cached decisions: {e}")
            return None
    
    async def cache_ai_stats(self, ai_stats: Dict[str, Any]) -> bool:
        try:
            key = "ai_war:ai:stats"
            return await redis_client.set(key, ai_stats, self.default_ttl['statistics'])
        except Exception as e:
            logger.error(f"Error caching AI stats: {e}")
            return False
    
    async def get_cached_ai_stats(self) -> Optional[Dict[str, Any]]:
        try:
            key = "ai_war:ai:stats"
            return await redis_client.get(key)
        except Exception as e:
            logger.error(f"Error getting cached AI stats: {e}")
            return None
    
    async def clear_game_cache(self) -> bool:
        try:
            patterns = [
                "ai_war:company:*",
                "ai_war:employee:*",
                "ai_war:decision:*",
                "ai_war:game:*",
                "ai_war:events:*",
                "ai_war:statistics:*",
                "ai_war:ai:*",
                "ai_war:decisions:*",
                "ai_war:companies:*"
            ]
            
            deleted_count = 0
            for pattern in patterns:
                keys = await redis_client.keys(pattern)
                if keys:
                    deleted = await redis_client.delete(*keys)
                    deleted_count += deleted
            
            logger.info(f"Cleared {deleted_count} cache keys")
            return True
        except Exception as e:
            logger.error(f"Error clearing game cache: {e}")
            return False
    
    async def cache_company_employees(self, company_id: str, employees: List[Employee]) -> bool:
        try:
            key = f"ai_war:company:{company_id}:employees"
            data = [employee.to_dict() for employee in employees]
            return await redis_client.set(key, data, self.default_ttl['employee'])
        except Exception as e:
            logger.error(f"Error caching employees for company {company_id}: {e}")
            return False
    
    async def get_cached_company_employees(self, company_id: str) -> Optional[List[Dict[str, Any]]]:
        try:
            key = f"ai_war:company:{company_id}:employees"
            return await redis_client.get(key)
        except Exception as e:
            logger.error(f"Error getting cached employees for company {company_id}: {e}")
            return None
    
    
    async def cache_decision(self, decision: Decision) -> bool:
        try:
            key = f"ai_war:decision:{decision.id}"
            data = decision.to_dict()
            return await redis_client.set(key, data, self.default_ttl['decision'])
        except Exception as e:
            logger.error(f"Error caching decision {decision.id}: {e}")
            return False
    
    async def cache_company_decisions(self, company_id: str, decisions: List[Decision], limit: int = 50) -> bool:
        try:
            key = f"ai_war:company:{company_id}:decisions"
            data = [decision.to_dict() for decision in decisions[:limit]]
            return await redis_client.set(key, data, self.default_ttl['decision'])
        except Exception as e:
            logger.error(f"Error caching decisions for company {company_id}: {e}")
            return False
    
    async def get_cached_company_decisions(self, company_id: str) -> Optional[List[Dict[str, Any]]]:
        try:
            key = f"ai_war:company:{company_id}:decisions"
            return await redis_client.get(key)
        except Exception as e:
            logger.error(f"Error getting cached decisions for company {company_id}: {e}")
            return None
    
    
    async def cache_game_stats(self, stats: Dict[str, Any]) -> bool:
        try:
            key = "ai_war:game:stats"
            return await redis_client.set(key, stats, self.default_ttl['game_state'])
        except Exception as e:
            logger.error(f"Error caching game stats: {e}")
            return False
    
    async def get_cached_game_stats(self) -> Optional[Dict[str, Any]]:
        try:
            key = "ai_war:game:stats"
            return await redis_client.get(key)
        except Exception as e:
            logger.error(f"Error getting cached game stats: {e}")
            return None
    
    async def cache_simulation_status(self, status: Dict[str, Any]) -> bool:
        try:
            key = "ai_war:simulation:status"
            return await redis_client.set(key, status, self.default_ttl['game_state'])
        except Exception as e:
            logger.error(f"Error caching simulation status: {e}")
            return False
    
    async def get_cached_simulation_status(self) -> Optional[Dict[str, Any]]:
        try:
            key = "ai_war:simulation:status"
            return await redis_client.get(key)
        except Exception as e:
            logger.error(f"Error getting cached simulation status: {e}")
            return None
    
    
    async def add_game_event(self, event: Dict[str, Any]) -> bool:
        try:
            # 添加时间戳
            event['cached_at'] = datetime.now().isoformat()
            
            # 使用Redis列表存储事件流
            key = "ai_war:events:stream"
            await redis_client.lpush(key, event)
            
            # 限制事件数量，保留最近1000个
            await redis_client.ltrim(key, 0, 999)
            
            # 设置过期时间
            await redis_client.expire(key, self.default_ttl['events'])
            
            return True
        except Exception as e:
            logger.error(f"Error adding game event: {e}")
            return False
    
    async def get_cached_events(self, company_id: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        try:
            key = "ai_war:events:stream"
            events = await redis_client.lrange(key, 0, limit - 1)
            
            # 过滤公司相关事件
            if company_id:
                events = [event for event in events 
                         if isinstance(event, dict) and event.get('company_id') == company_id]
            
            return events
        except Exception as e:
            logger.error(f"Error getting cached events: {e}")
            return []
    
    
    async def update_company_ranking(self, company_id: str, score: float) -> bool:
        try:
            key = "ai_war:leaderboard:companies"
            await redis_client.zadd(key, {company_id: score})
            await redis_client.expire(key, self.default_ttl['statistics'])
            return True
        except Exception as e:
            logger.error(f"Error updating company ranking: {e}")
            return False
    
    async def get_company_leaderboard(self, limit: int = 10) -> List[Dict[str, Any]]:
        try:
            key = "ai_war:leaderboard:companies"
            results = await redis_client.zrange(key, 0, limit - 1, desc=True, withscores=True)
            
            leaderboard = []
            for i, (company_id, score) in enumerate(results):
                leaderboard.append({
                    'rank': i + 1,
                    'company_id': company_id,
                    'score': score
                })
            
            return leaderboard
        except Exception as e:
            logger.error(f"Error getting company leaderboard: {e}")
            return []
    
    
    async def store_session(self, session_id: str, session_data: Dict[str, Any], expire: int = 3600) -> bool:
        try:
            key = f"ai_war:session:{session_id}"
            return await redis_client.set(key, session_data, expire)
        except Exception as e:
            logger.error(f"Error storing session {session_id}: {e}")
            return False
    
    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        try:
            key = f"ai_war:session:{session_id}"
            return await redis_client.get(key)
        except Exception as e:
            logger.error(f"Error getting session {session_id}: {e}")
            return None
    
    async def delete_session(self, session_id: str) -> bool:
        try:
            key = f"ai_war:session:{session_id}"
            result = await redis_client.delete(key)
            return result > 0
        except Exception as e:
            logger.error(f"Error deleting session {session_id}: {e}")
            return False
    
    
    async def clear_cache(self, pattern: str = "ai_war:cache:*") -> int:
        try:
            keys = await redis_client.redis.keys(pattern)
            if keys:
                return await redis_client.delete(*keys)
            return 0
        except Exception as e:
            logger.error(f"Error clearing cache with pattern {pattern}: {e}")
            return 0
    
    async def get_cache_info(self) -> Dict[str, Any]:
        try:
            info = await redis_client.info('memory')
            
            patterns = {
                'companies': 'ai_war:company:*',
                'employees': 'ai_war:employee:*',
                'decisions': 'ai_war:decision:*',
                'cache': 'ai_war:cache:*',
                'events': 'ai_war:events:*',
                'sessions': 'ai_war:session:*'
            }
            
            key_counts = {}
            for name, pattern in patterns.items():
                keys = await redis_client.redis.keys(pattern)
                key_counts[name] = len(keys)
            
            return {
                'memory_info': {
                    'used_memory': info.get('used_memory_human', 'N/A'),
                    'used_memory_rss': info.get('used_memory_rss_human', 'N/A'),
                    'used_memory_peak': info.get('used_memory_peak_human', 'N/A'),
                },
                'key_counts': key_counts,
                'total_keys': sum(key_counts.values())
            }
        except Exception as e:
            logger.error(f"Error getting cache info: {e}")
            return {}

    
    async def bulk_cache_companies(self, companies: List[Company]) -> Dict[str, bool]:
        results = {}
        for company in companies:
            result = await self.cache_company(company)
            results[company.id] = result
        return results
    
    async def bulk_invalidate_cache(self, keys: List[str]) -> int:
        try:
            if not keys:
                return 0
            return await redis_client.delete(*keys)
        except Exception as e:
            logger.error(f"Error bulk invalidating cache: {e}")
            return 0
    
    async def get_cache_statistics(self) -> Dict[str, Any]:
        hit_rate = 0.0
        total_requests = self.cache_stats['hits'] + self.cache_stats['misses']
        if total_requests > 0:
            hit_rate = (self.cache_stats['hits'] / total_requests) * 100
        
        return {
            'hit_rate': round(hit_rate, 2),
            'total_hits': self.cache_stats['hits'],
            'total_misses': self.cache_stats['misses'],
            'total_errors': self.cache_stats['errors'],
            'total_requests': total_requests,
            'evictions': self.cache_stats['evictions']
        }
    
    async def warm_up_cache(self, companies: List[Company], employees: List[Employee]) -> Dict[str, int]:
        results = {'companies': 0, 'employees': 0, 'errors': 0}
        
        for company in companies:
            try:
                if await self.cache_company(company):
                    results['companies'] += 1
            except Exception as e:
                logger.error(f"Error warming up company cache {company.id}: {e}")
                results['errors'] += 1
        
        for employee in employees:
            try:
                if await self.cache_employee(employee):
                    results['employees'] += 1
            except Exception as e:
                logger.error(f"Error warming up employee cache {employee.id}: {e}")
                results['errors'] += 1
        
        logger.info(f"Cache warm-up completed: {results}")
        return results
    
    async def cleanup_expired_cache(self) -> int:
        try:
            pattern_keys = [
                "ai_war:cache:*",
                "ai_war:company:*", 
                "ai_war:employee:*",
                "ai_war:decision:*"
            ]
            
            total_deleted = 0
            for pattern in pattern_keys:
                keys = await redis_client.redis.keys(pattern)
                if keys:
                    deleted = await redis_client.delete(*keys)
                    total_deleted += deleted
            
            logger.info(f"Cleaned up {total_deleted} expired cache entries")
            return total_deleted
            
        except Exception as e:
            logger.error(f"Error cleaning up expired cache: {e}")
            return 0
    
    async def cache_game_state_snapshot(self, step: int, state_data: Dict[str, Any]) -> bool:
        try:
            key = f"ai_war:game:snapshot:{step}"
            data = {
                'step': step,
                'timestamp': datetime.now().isoformat(),
                'state': state_data
            }
            return await redis_client.set(key, data, self.default_ttl['cold_data'])
        except Exception as e:
            logger.error(f"Error caching game state snapshot for step {step}: {e}")
            return False
    
    async def get_cached_game_state_snapshot(self, step: int) -> Optional[Dict[str, Any]]:
        try:
            key = f"ai_war:game:snapshot:{step}"
            return await redis_client.get(key)
        except Exception as e:
            logger.error(f"Error getting cached game state snapshot for step {step}: {e}")
            return None

# 全局缓存管理器实例
cache_manager = CacheManager()

# 缓存管理器辅助函数
async def get_or_set_cache(key: str, getter_func: Callable, ttl: int = 300) -> Any:
    try:
        # 尝试从缓存获取
        cached_value = await redis_client.get(key)
        if cached_value is not None:
            cache_manager.cache_stats['hits'] += 1
            return cached_value
        
        # 缓存未命中，执行获取函数
        cache_manager.cache_stats['misses'] += 1
        value = await getter_func()
        
        # 存储到缓存
        await redis_client.set(key, value, ttl)
        return value
        
    except Exception as e:
        logger.error(f"Error in get_or_set_cache for key {key}: {e}")
        cache_manager.cache_stats['errors'] += 1
        return await getter_func()