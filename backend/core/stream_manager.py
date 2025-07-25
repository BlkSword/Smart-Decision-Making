import logging
import asyncio
from typing import Dict, List, Any, Optional, Callable, Set
from datetime import datetime
import uuid
import json

from .redis_client_cluster import redis_client

logger = logging.getLogger(__name__)

class StreamManager:
    """Redis Streams 流管理器"""
    
    def __init__(self):
        self.streams = {
            'game_events': 'ai_war:streams:game_events',
            'company_updates': 'ai_war:streams:company_updates',
            'decision_events': 'ai_war:streams:decision_events',
            'notifications': 'ai_war:streams:notifications',
            'system_events': 'ai_war:streams:system_events'
        }
        
        self.consumer_groups = {
            'game_processors': 'game_processors',
            'notification_service': 'notification_service',
            'websocket_broadcaster': 'websocket_broadcaster',
            'analytics_service': 'analytics_service'
        }
        
        # 流处理器映射
        self.processors: Dict[str, List[Callable]] = {}
        
        # 活跃的消费者
        self.active_consumers: Set[str] = set()
        
        # 流配置
        self.stream_config = {
            'max_length': 10000,  # 每个流最大长度
            'trim_threshold': 8000,  # 触发修剪的阈值
            'batch_size': 100,  # 批处理大小
            'block_timeout': 1000,  # 阻塞超时时间(ms)
        }
    
    async def initialize(self):
        """初始化流管理器"""
        try:
            # 检查Redis是否可用
            connection_info = redis_client.get_connection_info()
            if connection_info['mode'] == 'none' or not connection_info.get('connected', False):
                logger.warning("Redis not available, stream manager will not function")
                return
            
            # 创建消费者组
            for stream_name, stream_key in self.streams.items():
                for group_name, group_key in self.consumer_groups.items():
                    try:
                        await redis_client.xgroup_create(stream_key, group_key, '0', mkstream=True)
                        logger.info(f"Created consumer group {group_key} for stream {stream_key}")
                    except Exception as e:
                        # 消费者组可能已存在
                        logger.debug(f"Consumer group {group_key} for stream {stream_key} already exists or error: {e}")
            
            logger.info("Stream manager initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing stream manager: {e}")
    
    async def add_event(self, stream_type: str, event_data: Dict[str, Any]) -> Optional[str]:
        """添加事件到流"""
        try:
            if stream_type not in self.streams:
                logger.error(f"Unknown stream type: {stream_type}")
                return None
            
            stream_key = self.streams[stream_type]
            
            # 添加元数据
            enhanced_data = {
                **event_data,
                'timestamp': datetime.now().isoformat(),
                'event_id': str(uuid.uuid4()),
                'stream_type': stream_type
            }
            
            # 添加到流
            message_id = await redis_client.xadd(
                stream_key, 
                enhanced_data, 
                max_len=self.stream_config['max_length']
            )
            
            if message_id:
                logger.debug(f"Added event to {stream_type} stream: {message_id}")
            
            return message_id
            
        except Exception as e:
            logger.error(f"Error adding event to stream {stream_type}: {e}")
            return None
    
    async def add_game_event(self, event: Dict[str, Any]) -> Optional[str]:
        """添加游戏事件"""
        return await self.add_event('game_events', {
            'type': event.get('type', 'unknown'),
            'company_id': event.get('company_id'),
            'description': event.get('description', ''),
            'data': event.get('data', {}),
            'step': event.get('step')
        })
    
    async def add_company_update(self, company_id: str, update_type: str, data: Dict[str, Any]) -> Optional[str]:
        """添加公司更新事件"""
        return await self.add_event('company_updates', {
            'company_id': company_id,
            'update_type': update_type,
            'data': data
        })
    
    async def add_decision_event(self, decision_data: Dict[str, Any]) -> Optional[str]:
        """添加决策事件"""
        return await self.add_event('decision_events', {
            'decision_id': decision_data.get('id'),
            'company_id': decision_data.get('company_id'),
            'employee_id': decision_data.get('employee_id'),
            'decision_type': decision_data.get('decision_type'),
            'content': decision_data.get('content'),
            'status': decision_data.get('status'),
            'importance': decision_data.get('importance'),
            'urgency': decision_data.get('urgency')
        })
    
    async def add_notification(self, recipient_type: str, recipient_id: str, 
                             notification_type: str, title: str, message: str, 
                             data: Optional[Dict[str, Any]] = None) -> Optional[str]:
        """添加通知"""
        return await self.add_event('notifications', {
            'recipient_type': recipient_type,  # 'user', 'company', 'system'
            'recipient_id': recipient_id,
            'notification_type': notification_type,
            'title': title,
            'message': message,
            'data': data or {},
            'read': False
        })
    
    async def add_system_event(self, event_type: str, message: str, 
                              data: Optional[Dict[str, Any]] = None) -> Optional[str]:
        """添加系统事件"""
        return await self.add_event('system_events', {
            'event_type': event_type,
            'message': message,
            'data': data or {},
            'severity': data.get('severity', 'info') if data else 'info'
        })
    
    async def read_stream(self, stream_type: str, start_id: str = '$', 
                         count: Optional[int] = None, block: Optional[int] = None) -> List[Dict[str, Any]]:
        """读取流消息"""
        try:
            if stream_type not in self.streams:
                logger.error(f"Unknown stream type: {stream_type}")
                return []
            
            stream_key = self.streams[stream_type]
            streams = {stream_key: start_id}
            
            messages = await redis_client.xread(
                streams, 
                count=count or self.stream_config['batch_size'],
                block=block
            )
            
            return messages
            
        except Exception as e:
            logger.error(f"Error reading stream {stream_type}: {e}")
            return []
    
    async def read_stream_range(self, stream_type: str, start: str = '-', 
                               end: str = '+', count: Optional[int] = None) -> List[Dict[str, Any]]:
        """读取流中指定范围的消息"""
        try:
            if stream_type not in self.streams:
                logger.error(f"Unknown stream type: {stream_type}")
                return []
            
            stream_key = self.streams[stream_type]
            
            messages = await redis_client.xrange(
                stream_key, 
                start, 
                end, 
                count=count or self.stream_config['batch_size']
            )
            
            # Convert Redis tuples to dictionaries
            formatted_messages = []
            for message_id, fields in messages:
                message_dict = {
                    'message_id': message_id,
                    **fields  # Spread the fields dictionary
                }
                formatted_messages.append(message_dict)
            
            return formatted_messages
            
        except Exception as e:
            logger.error(f"Error reading stream range {stream_type}: {e}")
            return []
    
    async def read_with_consumer_group(self, stream_type: str, group_name: str, 
                                      consumer_name: str, count: Optional[int] = None, 
                                      block: Optional[int] = None) -> List[Dict[str, Any]]:
        """使用消费者组读取流消息"""
        try:
            if stream_type not in self.streams:
                logger.error(f"Unknown stream type: {stream_type}")
                return []
            
            if group_name not in self.consumer_groups:
                logger.error(f"Unknown consumer group: {group_name}")
                return []
            
            stream_key = self.streams[stream_type]
            group_key = self.consumer_groups[group_name]
            
            streams = {stream_key: '>'}
            
            messages = await redis_client.xreadgroup(
                group_key,
                consumer_name,
                streams,
                count=count or self.stream_config['batch_size'],
                block=block or self.stream_config['block_timeout']
            )
            
            return messages
            
        except Exception as e:
            logger.error(f"Error reading with consumer group {group_name}: {e}")
            return []
    
    async def get_stream_info(self, stream_type: str) -> Dict[str, Any]:
        """获取流信息"""
        try:
            if stream_type not in self.streams:
                return {}
            
            stream_key = self.streams[stream_type]
            
            length = await redis_client.xlen(stream_key)
            
            # 获取最新和最旧消息
            latest_messages = await redis_client.xrange(stream_key, '+', '-', count=1)
            oldest_messages = await redis_client.xrange(stream_key, '-', '+', count=1)
            
            return {
                'stream_type': stream_type,
                'stream_key': stream_key,
                'length': length,
                'latest_message_id': latest_messages[0][0] if latest_messages else None,
                'oldest_message_id': oldest_messages[0][0] if oldest_messages else None,
                'max_length': self.stream_config['max_length']
            }
            
        except Exception as e:
            logger.error(f"Error getting stream info for {stream_type}: {e}")
            return {}
    
    async def trim_stream(self, stream_type: str, max_len: Optional[int] = None) -> int:
        """修剪流长度"""
        try:
            if stream_type not in self.streams:
                return 0
            
            stream_key = self.streams[stream_type]
            trim_length = max_len or self.stream_config['trim_threshold']
            
            trimmed = await redis_client.xtrim(stream_key, trim_length)
            
            if trimmed > 0:
                logger.info(f"Trimmed {trimmed} messages from {stream_type} stream")
            
            return trimmed
            
        except Exception as e:
            logger.error(f"Error trimming stream {stream_type}: {e}")
            return 0
    
    async def get_all_streams_info(self) -> Dict[str, Dict[str, Any]]:
        """获取所有流的信息"""
        streams_info = {}
        
        for stream_type in self.streams.keys():
            streams_info[stream_type] = await self.get_stream_info(stream_type)
        
        return streams_info
    
    async def register_processor(self, stream_type: str, processor: Callable):
        """注册流处理器"""
        if stream_type not in self.processors:
            self.processors[stream_type] = []
        
        self.processors[stream_type].append(processor)
        logger.info(f"Registered processor for {stream_type} stream")
    
    async def start_consumer(self, stream_type: str, group_name: str, consumer_name: str):
        """启动流消费者"""
        consumer_id = f"{stream_type}:{group_name}:{consumer_name}"
        
        if consumer_id in self.active_consumers:
            logger.warning(f"Consumer {consumer_id} is already active")
            return
        
        self.active_consumers.add(consumer_id)
        
        try:
            logger.info(f"Starting consumer {consumer_id}")
            
            while consumer_id in self.active_consumers:
                try:
                    messages = await self.read_with_consumer_group(
                        stream_type, group_name, consumer_name, 
                        count=self.stream_config['batch_size'],
                        block=self.stream_config['block_timeout']
                    )
                    
                    if messages:
                        logger.debug(f"Consumer {consumer_id} received {len(messages)} messages")
                        
                        # 处理消息
                        for message in messages:
                            await self._process_message(stream_type, message)
                    
                    # 短暂延迟避免过度消耗CPU
                    await asyncio.sleep(0.1)
                    
                except Exception as e:
                    logger.error(f"Error in consumer {consumer_id}: {e}")
                    await asyncio.sleep(1)  # 出错时延迟更长时间
        
        finally:
            self.active_consumers.discard(consumer_id)
            logger.info(f"Consumer {consumer_id} stopped")
    
    async def stop_consumer(self, stream_type: str, group_name: str, consumer_name: str):
        """停止流消费者"""
        consumer_id = f"{stream_type}:{group_name}:{consumer_name}"
        self.active_consumers.discard(consumer_id)
        logger.info(f"Requested stop for consumer {consumer_id}")
    
    async def _process_message(self, stream_type: str, message: Dict[str, Any]):
        """处理流消息"""
        try:
            # 调用注册的处理器
            if stream_type in self.processors:
                for processor in self.processors[stream_type]:
                    try:
                        await processor(message)
                    except Exception as e:
                        logger.error(f"Error in processor for {stream_type}: {e}")
        
        except Exception as e:
            logger.error(f"Error processing message from {stream_type}: {e}")
    
    async def cleanup(self):
        """清理资源"""
        # 停止所有消费者
        active_consumers = list(self.active_consumers)
        for consumer_id in active_consumers:
            parts = consumer_id.split(':')
            if len(parts) == 3:
                await self.stop_consumer(parts[0], parts[1], parts[2])
        
        # 等待消费者停止
        max_wait = 5
        wait_time = 0
        while self.active_consumers and wait_time < max_wait:
            await asyncio.sleep(0.5)
            wait_time += 0.5
        
        logger.info("Stream manager cleanup completed")

# 全局流管理器实例
stream_manager = StreamManager()