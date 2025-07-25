from fastapi import APIRouter, HTTPException
from typing import Dict, List, Any
import logging

from core.cache_manager import cache_manager, get_or_set_cache
from core.redis_client import redis_client

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/statistics", response_model=Dict[str, Any])
async def get_cache_statistics():
    """获取缓存统计信息"""
    try:
        stats = await cache_manager.get_cache_statistics()
        cache_info = await cache_manager.get_cache_info()
        
        return {
            "performance": stats,
            "storage": cache_info,
            "connection_status": "connected" if redis_client.redis else "disconnected"
        }
    except Exception as e:
        logger.error(f"Error getting cache statistics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get cache statistics")

@router.post("/warm-up")
async def warm_up_cache():
    """预热缓存"""
    try:
        # 获取游戏引擎实例来预热缓存
        import main
        engine = main.game_engine
        
        companies = list(engine.companies.values())
        employees = list(engine.employees.values())
        
        results = await cache_manager.warm_up_cache(companies, employees)
        
        return {
            "message": "Cache warm-up completed",
            "results": results
        }
    except Exception as e:
        logger.error(f"Error warming up cache: {e}")
        raise HTTPException(status_code=500, detail="Failed to warm up cache")

@router.delete("/clear")
async def clear_cache(pattern: str = "ai_war:cache:*"):
    """清除缓存"""
    try:
        if not redis_client.redis:
            raise HTTPException(status_code=503, detail="Redis not available")
        
        deleted_count = await cache_manager.clear_cache(pattern)
        
        return {
            "message": f"Cleared {deleted_count} cache entries",
            "pattern": pattern,
            "deleted_count": deleted_count
        }
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear cache")

@router.post("/cleanup")
async def cleanup_expired_cache():
    """清理过期缓存"""
    try:
        if not redis_client.redis:
            raise HTTPException(status_code=503, detail="Redis not available")
        
        deleted_count = await cache_manager.cleanup_expired_cache()
        
        return {
            "message": f"Cleaned up {deleted_count} expired cache entries",
            "deleted_count": deleted_count
        }
    except Exception as e:
        logger.error(f"Error cleaning up expired cache: {e}")
        raise HTTPException(status_code=500, detail="Failed to cleanup expired cache")

@router.get("/health")
async def cache_health_check():
    """缓存健康检查"""
    try:
        if not redis_client.redis:
            return {
                "status": "unhealthy",
                "message": "Redis connection not available",
                "recommendations": ["Check Redis server status", "Verify connection configuration"]
            }
        
        # 测试Redis连接
        await redis_client.redis.ping()
        
        # 获取缓存统计
        stats = await cache_manager.get_cache_statistics()
        
        # 判断缓存健康状态
        health_status = "healthy"
        recommendations = []
        
        if stats['total_requests'] > 0:
            if stats['hit_rate'] < 50:
                health_status = "warning"
                recommendations.append("Cache hit rate is below 50%, consider optimizing cache strategy")
            
            if stats['total_errors'] > stats['total_requests'] * 0.1:
                health_status = "warning" 
                recommendations.append("High error rate detected, check Redis connection stability")
        
        return {
            "status": health_status,
            "statistics": stats,
            "recommendations": recommendations if recommendations else ["Cache is operating normally"]
        }
        
    except Exception as e:
        logger.error(f"Error in cache health check: {e}")
        return {
            "status": "unhealthy",
            "message": f"Health check failed: {str(e)}",
            "recommendations": ["Check Redis server connectivity", "Review application logs"]
        }

@router.get("/keys/{pattern}")
async def list_cache_keys(pattern: str = "ai_war:*", limit: int = 100):
    """列出缓存键"""
    try:
        if not redis_client.redis:
            raise HTTPException(status_code=503, detail="Redis not available")
        
        keys = await redis_client.redis.keys(pattern)
        
        # 限制返回的键数量
        if len(keys) > limit:
            keys = keys[:limit]
        
        # 获取键的详细信息
        key_info = []
        for key in keys:
            try:
                ttl = await redis_client.redis.ttl(key)
                key_type = await redis_client.redis.type(key)
                key_info.append({
                    "key": key,
                    "type": key_type,
                    "ttl": ttl if ttl > 0 else "no expiration"
                })
            except Exception as key_error:
                logger.warning(f"Error getting info for key {key}: {key_error}")
                key_info.append({
                    "key": key,
                    "type": "unknown",
                    "ttl": "unknown"
                })
        
        return {
            "pattern": pattern,
            "total_found": len(keys),
            "limit": limit,
            "keys": key_info
        }
        
    except Exception as e:
        logger.error(f"Error listing cache keys: {e}")
        raise HTTPException(status_code=500, detail="Failed to list cache keys")

@router.post("/test")
async def test_cache_performance():
    """测试缓存性能"""
    try:
        if not redis_client.redis:
            raise HTTPException(status_code=503, detail="Redis not available")
        
        import time
        
        # 测试写入性能
        start_time = time.time()
        test_data = {"test": "data", "timestamp": time.time()}
        
        write_results = []
        for i in range(10):
            write_start = time.time()
            await redis_client.set(f"test:performance:{i}", test_data, 60)
            write_end = time.time()
            write_results.append(write_end - write_start)
        
        write_time = time.time() - start_time
        
        # 测试读取性能
        start_time = time.time()
        read_results = []
        for i in range(10):
            read_start = time.time()
            await redis_client.get(f"test:performance:{i}")
            read_end = time.time()
            read_results.append(read_end - read_start)
        
        read_time = time.time() - start_time
        
        # 清理测试数据
        test_keys = [f"test:performance:{i}" for i in range(10)]
        await redis_client.delete(*test_keys)
        
        return {
            "write_performance": {
                "total_time": round(write_time * 1000, 2),  # ms
                "average_time": round(sum(write_results) / len(write_results) * 1000, 2),  # ms
                "operations_per_second": round(10 / write_time, 2)
            },
            "read_performance": {
                "total_time": round(read_time * 1000, 2),  # ms
                "average_time": round(sum(read_results) / len(read_results) * 1000, 2),  # ms
                "operations_per_second": round(10 / read_time, 2)
            }
        }
        
    except Exception as e:
        logger.error(f"Error testing cache performance: {e}")
        raise HTTPException(status_code=500, detail="Failed to test cache performance")