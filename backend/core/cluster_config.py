import os
import yaml
import json
import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from pathlib import Path

from .redis_cluster import RedisClusterManager, LoadBalanceStrategy

logger = logging.getLogger(__name__)

@dataclass
class NodeConfig:
    """Redis节点配置"""
    host: str
    port: int
    password: Optional[str] = None
    weight: float = 1.0
    node_id: Optional[str] = None
    max_connections: int = 100

@dataclass
class ClusterConfig:
    """集群配置"""
    strategy: str = "consistent_hash"
    health_check_interval: int = 30
    max_retries: int = 3
    retry_delay: float = 1.0
    failover_threshold: int = 3
    virtual_nodes: int = 160
    
    # 连接池配置
    connection_pool_size: int = 100
    connection_timeout: float = 5.0
    socket_timeout: float = 5.0
    socket_keep_alive: bool = True
    
    # 性能监控配置
    performance_monitoring: bool = True
    metrics_retention_minutes: int = 60
    slow_query_threshold: float = 0.1  # 100ms
    
    # 故障转移配置
    auto_failover: bool = True
    failover_notification: bool = True
    backup_strategy: str = "round_robin"
    
    # 数据分片配置
    sharding_enabled: bool = True
    consistent_hashing: bool = True
    hash_function: str = "md5"

class ClusterConfigManager:
    """集群配置管理器"""
    
    def __init__(self):
        self.config_path = os.getenv('REDIS_CLUSTER_CONFIG', 'redis_cluster.yaml')
        self.cluster_config: Optional[ClusterConfig] = None
        self.node_configs: List[NodeConfig] = []
    
    def load_from_env(self) -> bool:
        """从环境变量加载配置"""
        try:
            # 基础配置
            strategy = os.getenv('REDIS_CLUSTER_STRATEGY', 'consistent_hash')
            health_interval = int(os.getenv('REDIS_CLUSTER_HEALTH_INTERVAL', 30))
            
            self.cluster_config = ClusterConfig(
                strategy=strategy,
                health_check_interval=health_interval,
                max_retries=int(os.getenv('REDIS_CLUSTER_MAX_RETRIES', 3)),
                retry_delay=float(os.getenv('REDIS_CLUSTER_RETRY_DELAY', 1.0)),
                failover_threshold=int(os.getenv('REDIS_CLUSTER_FAILOVER_THRESHOLD', 3)),
                virtual_nodes=int(os.getenv('REDIS_CLUSTER_VIRTUAL_NODES', 160)),
                auto_failover=os.getenv('REDIS_CLUSTER_AUTO_FAILOVER', 'true').lower() == 'true'
            )
            
            # 检查是否有单节点配置（向后兼容）
            single_host = os.getenv('REDIS_HOST')
            single_port = os.getenv('REDIS_PORT')
            single_password = os.getenv('REDIS_PASSWORD')
            
            if single_host and single_port:
                self.node_configs.append(NodeConfig(
                    host=single_host,
                    port=int(single_port),
                    password=single_password,
                    weight=1.0,
                    node_id=f"{single_host}:{single_port}"
                ))
            
            # 检查集群节点配置
            cluster_nodes = os.getenv('REDIS_CLUSTER_NODES')
            if cluster_nodes:
                self._parse_cluster_nodes_string(cluster_nodes)
            
            logger.info(f"Loaded cluster configuration from environment variables")
            logger.info(f"Strategy: {strategy}, Nodes: {len(self.node_configs)}")
            return True
            
        except Exception as e:
            logger.error(f"Error loading cluster config from environment: {e}")
            return False
    
    def _parse_cluster_nodes_string(self, nodes_string: str):
        """解析集群节点字符串"""
        # 格式: "host1:port1:password1:weight1,host2:port2:password2:weight2"
        try:
            for node_str in nodes_string.split(','):
                parts = node_str.strip().split(':')
                if len(parts) >= 2:
                    host = parts[0]
                    port = int(parts[1])
                    password = parts[2] if len(parts) > 2 and parts[2] else None
                    weight = float(parts[3]) if len(parts) > 3 else 1.0
                    
                    self.node_configs.append(NodeConfig(
                        host=host,
                        port=port,
                        password=password,
                        weight=weight,
                        node_id=f"{host}:{port}"
                    ))
        except Exception as e:
            logger.error(f"Error parsing cluster nodes string: {e}")
    
    def load_from_file(self, file_path: Optional[str] = None) -> bool:
        """从配置文件加载"""
        config_file = file_path or self.config_path
        
        try:
            if not Path(config_file).exists():
                logger.warning(f"Cluster config file not found: {config_file}")
                return False
            
            with open(config_file, 'r', encoding='utf-8') as f:
                if config_file.endswith('.yaml') or config_file.endswith('.yml'):
                    config_data = yaml.safe_load(f)
                else:
                    config_data = json.load(f)
            
            # 解析集群配置
            cluster_data = config_data.get('cluster', {})
            self.cluster_config = ClusterConfig(**cluster_data)
            
            # 解析节点配置
            nodes_data = config_data.get('nodes', [])
            self.node_configs = []
            
            for node_data in nodes_data:
                self.node_configs.append(NodeConfig(**node_data))
            
            logger.info(f"Loaded cluster configuration from file: {config_file}")
            logger.info(f"Strategy: {self.cluster_config.strategy}, Nodes: {len(self.node_configs)}")
            return True
            
        except Exception as e:
            logger.error(f"Error loading cluster config from file {config_file}: {e}")
            return False
    
    def save_to_file(self, file_path: Optional[str] = None) -> bool:
        """保存配置到文件"""
        if not self.cluster_config:
            logger.error("No cluster configuration to save")
            return False
        
        config_file = file_path or self.config_path
        
        try:
            config_data = {
                'cluster': asdict(self.cluster_config),
                'nodes': [asdict(node) for node in self.node_configs]
            }
            
            with open(config_file, 'w', encoding='utf-8') as f:
                if config_file.endswith('.yaml') or config_file.endswith('.yml'):
                    yaml.dump(config_data, f, default_flow_style=False, allow_unicode=True)
                else:
                    json.dump(config_data, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Saved cluster configuration to file: {config_file}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving cluster config to file {config_file}: {e}")
            return False
    
    def create_default_config(self) -> bool:
        """创建默认配置"""
        try:
            self.cluster_config = ClusterConfig()
            
            # 创建默认单节点配置
            self.node_configs = [
                NodeConfig(
                    host='127.0.0.1',
                    port=6379,
                    password=None,
                    weight=1.0,
                    node_id='default_node'
                )
            ]
            
            logger.info("Created default cluster configuration")
            return True
            
        except Exception as e:
            logger.error(f"Error creating default config: {e}")
            return False
    
    def apply_to_cluster(self, cluster: RedisClusterManager) -> bool:
        """将配置应用到集群管理器"""
        try:
            if not self.cluster_config or not self.node_configs:
                logger.error("No configuration to apply")
                return False
            
            # 设置负载均衡策略
            try:
                strategy = LoadBalanceStrategy(self.cluster_config.strategy)
                cluster.strategy = strategy
            except ValueError:
                logger.warning(f"Invalid strategy: {self.cluster_config.strategy}, using default")
                cluster.strategy = LoadBalanceStrategy.CONSISTENT_HASH
            
            # 设置其他参数
            cluster.health_check_interval = self.cluster_config.health_check_interval
            cluster.max_retries = self.cluster_config.max_retries
            cluster.retry_delay = self.cluster_config.retry_delay
            cluster.virtual_nodes = self.cluster_config.virtual_nodes
            
            # 添加节点
            for node_config in self.node_configs:
                cluster.add_node(
                    host=node_config.host,
                    port=node_config.port,
                    password=node_config.password,
                    weight=node_config.weight,
                    node_id=node_config.node_id
                )
            
            logger.info(f"Applied configuration to cluster: {len(self.node_configs)} nodes")
            return True
            
        except Exception as e:
            logger.error(f"Error applying config to cluster: {e}")
            return False
    
    def validate_config(self) -> List[str]:
        """验证配置"""
        errors = []
        
        if not self.cluster_config:
            errors.append("Missing cluster configuration")
            return errors
        
        if not self.node_configs:
            errors.append("No Redis nodes configured")
            return errors
        
        # 验证节点配置
        node_ids = set()
        for i, node in enumerate(self.node_configs):
            if not node.host:
                errors.append(f"Node {i}: Missing host")
            
            if not node.port or node.port <= 0 or node.port > 65535:
                errors.append(f"Node {i}: Invalid port {node.port}")
            
            if node.weight <= 0:
                errors.append(f"Node {i}: Weight must be positive")
            
            if node.node_id in node_ids:
                errors.append(f"Node {i}: Duplicate node_id {node.node_id}")
            node_ids.add(node.node_id)
        
        # 验证集群配置
        if self.cluster_config.health_check_interval <= 0:
            errors.append("Health check interval must be positive")
        
        if self.cluster_config.max_retries < 0:
            errors.append("Max retries cannot be negative")
        
        if self.cluster_config.retry_delay <= 0:
            errors.append("Retry delay must be positive")
        
        try:
            LoadBalanceStrategy(self.cluster_config.strategy)
        except ValueError:
            errors.append(f"Invalid load balance strategy: {self.cluster_config.strategy}")
        
        return errors
    
    def get_config_summary(self) -> Dict[str, Any]:
        """获取配置摘要"""
        return {
            'cluster_config': asdict(self.cluster_config) if self.cluster_config else None,
            'node_count': len(self.node_configs),
            'nodes_summary': [
                {
                    'node_id': node.node_id,
                    'host': node.host,
                    'port': node.port,
                    'weight': node.weight,
                    'has_password': bool(node.password)
                }
                for node in self.node_configs
            ],
            'validation_errors': self.validate_config()
        }

# 示例配置文件模板
def create_example_config_file(file_path: str = 'redis_cluster_example.yaml'):
    """创建示例配置文件"""
    example_config = {
        'cluster': {
            'strategy': 'consistent_hash',
            'health_check_interval': 30,
            'max_retries': 3,
            'retry_delay': 1.0,
            'failover_threshold': 3,
            'virtual_nodes': 160,
            'auto_failover': True,
            'performance_monitoring': True
        },
        'nodes': [
            {
                'host': '127.0.0.1',
                'port': 6379,
                'password': 'your_password_here',
                'weight': 1.0,
                'node_id': 'redis-1',
                'max_connections': 100
            },
            {
                'host': '127.0.0.1',
                'port': 6380,
                'password': 'your_password_here',
                'weight': 1.0,
                'node_id': 'redis-2',
                'max_connections': 100
            },
            {
                'host': '127.0.0.1',
                'port': 6381,
                'password': 'your_password_here',
                'weight': 1.5,
                'node_id': 'redis-3',
                'max_connections': 150
            }
        ]
    }
    
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            yaml.dump(example_config, f, default_flow_style=False, allow_unicode=True)
        logger.info(f"Created example config file: {file_path}")
        return True
    except Exception as e:
        logger.error(f"Error creating example config file: {e}")
        return False

# 全局配置管理器实例
cluster_config_manager = ClusterConfigManager()