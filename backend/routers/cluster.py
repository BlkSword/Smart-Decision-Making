from fastapi import APIRouter, HTTPException, Query, Body
from typing import Dict, List, Any, Optional
import logging
from pydantic import BaseModel

from core.redis_client_cluster import redis_client
from core.cluster_config import cluster_config_manager, create_example_config_file

router = APIRouter()
logger = logging.getLogger(__name__)

class NodeConfigModel(BaseModel):
    """节点配置模型"""
    host: str
    port: int
    password: Optional[str] = None
    weight: float = 1.0
    node_id: Optional[str] = None

class ClusterHealthResponse(BaseModel):
    """集群健康响应模型"""
    status: str
    total_nodes: int
    healthy_nodes: int
    failed_nodes: int
    success_rate: float

@router.get("/info", response_model=Dict[str, Any])
async def get_cluster_info():
    """获取Redis集群信息"""
    try:
        connection_info = redis_client.get_connection_info()
        
        if connection_info['mode'] == 'cluster':
            return {
                "status": "success",
                "mode": "cluster",
                "data": connection_info['cluster_info']
            }
        elif connection_info['mode'] == 'single_node':
            return {
                "status": "success",
                "mode": "single_node",
                "data": {
                    "connected": connection_info['connected'],
                    "host": connection_info.get('host'),
                    "port": connection_info.get('port'),
                    "total_nodes": 1,
                    "healthy_nodes": 1 if connection_info['connected'] else 0
                }
            }
        else:
            return {
                "status": "success",
                "mode": "none",
                "data": {
                    "connected": False,
                    "total_nodes": 0,
                    "healthy_nodes": 0
                }
            }
            
    except Exception as e:
        logger.error(f"Error getting cluster info: {e}")
        raise HTTPException(status_code=500, detail="Failed to get cluster information")

@router.get("/health", response_model=ClusterHealthResponse)
async def get_cluster_health():
    """获取集群健康状态"""
    try:
        connection_info = redis_client.get_connection_info()
        
        if connection_info['mode'] == 'cluster':
            cluster_info = connection_info['cluster_info']
            
            total_nodes = cluster_info.get('total_nodes', 0)
            healthy_nodes = cluster_info.get('healthy_nodes', 0)
            failed_nodes = cluster_info.get('failed_nodes', 0)
            success_rate = cluster_info.get('success_rate', 0.0)
            
            if healthy_nodes == total_nodes:
                status = "healthy"
            elif healthy_nodes > 0:
                status = "degraded"
            else:
                status = "failed"
                
            return ClusterHealthResponse(
                status=status,
                total_nodes=total_nodes,
                healthy_nodes=healthy_nodes,
                failed_nodes=failed_nodes,
                success_rate=success_rate
            )
        elif connection_info['mode'] == 'single_node':
            is_connected = connection_info['connected']
            return ClusterHealthResponse(
                status="healthy" if is_connected else "failed",
                total_nodes=1,
                healthy_nodes=1 if is_connected else 0,
                failed_nodes=0 if is_connected else 1,
                success_rate=1.0 if is_connected else 0.0
            )
        else:
            return ClusterHealthResponse(
                status="failed",
                total_nodes=0,
                healthy_nodes=0,
                failed_nodes=0,
                success_rate=0.0
            )
            
    except Exception as e:
        logger.error(f"Error getting cluster health: {e}")
        raise HTTPException(status_code=500, detail="Failed to get cluster health")

@router.get("/nodes", response_model=List[Dict[str, Any]])
async def get_cluster_nodes():
    """获取集群节点列表"""
    try:
        connection_info = redis_client.get_connection_info()
        
        if connection_info['mode'] == 'cluster':
            cluster_info = connection_info['cluster_info']
            return cluster_info.get('nodes', [])
        elif connection_info['mode'] == 'single_node':
            return [{
                'node_id': 'single_node',
                'host': connection_info.get('host', 'unknown'),
                'port': connection_info.get('port', 0),
                'status': 'healthy' if connection_info['connected'] else 'failed',
                'weight': 1.0,
                'is_connected': connection_info['connected']
            }]
        else:
            return []
            
    except Exception as e:
        logger.error(f"Error getting cluster nodes: {e}")
        raise HTTPException(status_code=500, detail="Failed to get cluster nodes")

@router.post("/nodes/add")
async def add_cluster_node(node: NodeConfigModel):
    """添加集群节点"""
    try:
        if not redis_client.is_cluster_mode:
            raise HTTPException(status_code=400, detail="Not in cluster mode")
        
        node_id = redis_client.cluster.add_node(
            host=node.host,
            port=node.port,
            password=node.password,
            weight=node.weight,
            node_id=node.node_id
        )
        
        # 尝试连接新节点
        if node_id in redis_client.cluster.nodes:
            success = await redis_client.cluster.nodes[node_id].connect()
            
            return {
                "status": "success",
                "message": f"Node {node_id} added successfully",
                "node_id": node_id,
                "connected": success
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to add node")
            
    except Exception as e:
        logger.error(f"Error adding cluster node: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add node: {str(e)}")

@router.delete("/nodes/{node_id}")
async def remove_cluster_node(node_id: str):
    """移除集群节点"""
    try:
        if not redis_client.is_cluster_mode:
            raise HTTPException(status_code=400, detail="Not in cluster mode")
        
        success = redis_client.cluster.remove_node(node_id)
        
        if success:
            return {
                "status": "success",
                "message": f"Node {node_id} removed successfully"
            }
        else:
            raise HTTPException(status_code=404, detail=f"Node {node_id} not found")
            
    except Exception as e:
        logger.error(f"Error removing cluster node: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to remove node: {str(e)}")

@router.post("/health-check")
async def trigger_health_check():
    """触发手动健康检查"""
    try:
        if not redis_client.is_cluster_mode:
            raise HTTPException(status_code=400, detail="Not in cluster mode")
        
        await redis_client.cluster._perform_health_checks()
        
        return {
            "status": "success",
            "message": "Health check completed",
            "timestamp": "2025-07-25T02:50:00Z"  # 这里应该使用实际时间戳
        }
        
    except Exception as e:
        logger.error(f"Error triggering health check: {e}")
        raise HTTPException(status_code=500, detail="Failed to perform health check")

@router.get("/config", response_model=Dict[str, Any])
async def get_cluster_config():
    """获取集群配置"""
    try:
        config_summary = cluster_config_manager.get_config_summary()
        return {
            "status": "success",
            "data": config_summary
        }
        
    except Exception as e:
        logger.error(f"Error getting cluster config: {e}")
        raise HTTPException(status_code=500, detail="Failed to get cluster configuration")

@router.post("/config/reload")
async def reload_cluster_config():
    """重新加载集群配置"""
    try:
        # 尝试从文件重新加载配置
        if cluster_config_manager.load_from_file():
            # 验证配置
            validation_errors = cluster_config_manager.validate_config()
            if validation_errors:
                return {
                    "status": "warning",
                    "message": "Configuration loaded with warnings",
                    "validation_errors": validation_errors
                }
            
            return {
                "status": "success",
                "message": "Cluster configuration reloaded successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to reload configuration")
            
    except Exception as e:
        logger.error(f"Error reloading cluster config: {e}")
        raise HTTPException(status_code=500, detail="Failed to reload cluster configuration")

@router.post("/config/save")
async def save_cluster_config():
    """保存当前集群配置到文件"""
    try:
        if cluster_config_manager.save_to_file():
            return {
                "status": "success",
                "message": "Cluster configuration saved successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to save configuration")
            
    except Exception as e:
        logger.error(f"Error saving cluster config: {e}")
        raise HTTPException(status_code=500, detail="Failed to save cluster configuration")

@router.post("/config/create-example")
async def create_example_config():
    """创建示例配置文件"""
    try:
        if create_example_config_file():
            return {
                "status": "success",
                "message": "Example configuration file created successfully",
                "filename": "redis_cluster_example.yaml"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create example configuration")
            
    except Exception as e:
        logger.error(f"Error creating example config: {e}")
        raise HTTPException(status_code=500, detail="Failed to create example configuration")

@router.get("/performance", response_model=Dict[str, Any])
async def get_cluster_performance():
    """获取集群性能指标"""
    try:
        connection_info = redis_client.get_connection_info()
        
        if connection_info['mode'] == 'cluster':
            cluster_info = connection_info['cluster_info']
            nodes = cluster_info.get('nodes', [])
            
            # 聚合性能指标
            total_requests = sum(node.get('total_requests', 0) for node in nodes)
            successful_requests = sum(node.get('successful_requests', 0) for node in nodes)
            avg_response_times = [node.get('avg_response_time', 0) for node in nodes if node.get('avg_response_time', 0) > 0]
            avg_response_time = sum(avg_response_times) / len(avg_response_times) if avg_response_times else 0
            
            return {
                "status": "success",
                "data": {
                    "total_requests": total_requests,
                    "successful_requests": successful_requests,
                    "success_rate": successful_requests / total_requests if total_requests > 0 else 1.0,
                    "avg_response_time": round(avg_response_time, 3),
                    "node_performance": nodes
                }
            }
        elif connection_info['mode'] == 'single_node':
            return {
                "status": "success",
                "data": {
                    "total_requests": 0,
                    "successful_requests": 0,
                    "success_rate": 1.0,
                    "avg_response_time": 0.0,
                    "node_performance": []
                }
            }
        else:
            return {
                "status": "success",
                "data": {
                    "total_requests": 0,
                    "successful_requests": 0,
                    "success_rate": 0.0,
                    "avg_response_time": 0.0,
                    "node_performance": []
                }
            }
            
    except Exception as e:
        logger.error(f"Error getting cluster performance: {e}")
        raise HTTPException(status_code=500, detail="Failed to get cluster performance")

@router.post("/strategy/change")
async def change_load_balance_strategy(strategy: str = Body(..., embed=True)):
    """更改负载均衡策略"""
    try:
        if not redis_client.is_cluster_mode:
            raise HTTPException(status_code=400, detail="Not in cluster mode")
        
        from core.redis_cluster import LoadBalanceStrategy
        
        try:
            new_strategy = LoadBalanceStrategy(strategy)
            old_strategy = redis_client.cluster.strategy
            redis_client.cluster.strategy = new_strategy
            
            # 如果切换到一致性哈希，需要重建哈希环
            if new_strategy == LoadBalanceStrategy.CONSISTENT_HASH:
                redis_client.cluster.hash_ring.clear()
                for node_id, node in redis_client.cluster.nodes.items():
                    redis_client.cluster._add_node_to_hash_ring(node_id, node.weight)
            
            return {
                "status": "success",
                "message": f"Load balance strategy changed from {old_strategy.value} to {new_strategy.value}",
                "old_strategy": old_strategy.value,
                "new_strategy": new_strategy.value
            }
            
        except ValueError:
            valid_strategies = [s.value for s in LoadBalanceStrategy]
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid strategy '{strategy}'. Valid strategies: {valid_strategies}"
            )
            
    except Exception as e:
        logger.error(f"Error changing load balance strategy: {e}")
        raise HTTPException(status_code=500, detail="Failed to change load balance strategy")

@router.get("/test")
async def test_cluster_operations():
    """测试集群操作"""
    try:
        test_results = {}
        
        # 测试基本操作
        test_key = "cluster_test:key"
        test_value = {"test": "data", "timestamp": "2025-07-25T02:50:00Z"}
        
        # SET操作
        set_result = await redis_client.set(test_key, test_value, expire=60)
        test_results["set_operation"] = set_result
        
        # GET操作
        get_result = await redis_client.get(test_key)
        test_results["get_operation"] = get_result == test_value
        
        # EXISTS操作
        exists_result = await redis_client.exists(test_key)
        test_results["exists_operation"] = exists_result
        
        # DELETE操作
        delete_result = await redis_client.delete(test_key)
        test_results["delete_operation"] = delete_result > 0
        
        all_passed = all(test_results.values())
        
        return {
            "status": "success" if all_passed else "warning",
            "message": "All tests passed" if all_passed else "Some tests failed",
            "test_results": test_results,
            "connection_info": redis_client.get_connection_info()
        }
        
    except Exception as e:
        logger.error(f"Error testing cluster operations: {e}")
        raise HTTPException(status_code=500, detail=f"Cluster test failed: {str(e)}")

@router.get("/stats", response_model=Dict[str, Any])
async def get_cluster_stats():
    """获取集群统计信息"""
    try:
        connection_info = redis_client.get_connection_info()
        
        if connection_info['mode'] == 'cluster':
            cluster_info = connection_info['cluster_info']
            
            return {
                "status": "success",
                "data": {
                    "mode": "cluster",
                    "strategy": cluster_info.get('strategy'),
                    "total_nodes": cluster_info.get('total_nodes', 0),
                    "healthy_nodes": cluster_info.get('healthy_nodes', 0),
                    "degraded_nodes": cluster_info.get('degraded_nodes', 0),
                    "failed_nodes": cluster_info.get('failed_nodes', 0),
                    "total_requests": cluster_info.get('total_requests', 0),
                    "success_rate": cluster_info.get('success_rate', 0.0),
                    "avg_response_time": cluster_info.get('avg_response_time', 0.0),
                    "is_monitoring": cluster_info.get('is_monitoring', False)
                }
            }
        else:
            return {
                "status": "success",
                "data": {
                    "mode": connection_info['mode'],
                    "connected": connection_info.get('connected', False),
                    "total_nodes": 1 if connection_info.get('connected') else 0,
                    "healthy_nodes": 1 if connection_info.get('connected') else 0
                }
            }
            
    except Exception as e:
        logger.error(f"Error getting cluster stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get cluster statistics")