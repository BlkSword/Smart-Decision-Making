from fastapi import WebSocket
from typing import Dict, List, Set, Optional
import json
import logging
import asyncio
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)

class ConnectionManager:
    """WebSocket连接管理器"""
    
    def __init__(self):
        # 存储活跃连接
        self.active_connections: Dict[str, WebSocket] = {}
        # 存储订阅关系
        self.subscriptions: Dict[str, Set[str]] = {}
        # 流消费者映射
        self.stream_consumers: Dict[str, str] = {}
        # 消费者任务
        self.consumer_tasks: Dict[str, asyncio.Task] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str):
        """建立WebSocket连接"""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.subscriptions[client_id] = set()
        
        # 为客户端创建唯一的消费者名称
        consumer_name = f"ws_client_{client_id}_{uuid.uuid4().hex[:8]}"
        self.stream_consumers[client_id] = consumer_name
        
        logger.info(f"Client {client_id} connected. Total connections: {len(self.active_connections)}")
        
        # 启动实时流消费者
        await self._start_stream_consumer(client_id)
    
    def disconnect(self, client_id: str):
        """断开WebSocket连接"""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        if client_id in self.subscriptions:
            del self.subscriptions[client_id]
        if client_id in self.stream_consumers:
            del self.stream_consumers[client_id]
            
        # 取消消费者任务
        if client_id in self.consumer_tasks:
            task = self.consumer_tasks[client_id]
            if not task.done():
                task.cancel()
            del self.consumer_tasks[client_id]
            
        logger.info(f"Client {client_id} disconnected. Total connections: {len(self.active_connections)}")
    
    async def send_personal_message(self, message: dict, client_id: str):
        """向特定客户端发送消息"""
        if client_id in self.active_connections:
            try:
                websocket = self.active_connections[client_id]
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending message to {client_id}: {e}")
                self.disconnect(client_id)
    
    async def broadcast(self, channel: str, message: dict):
        """广播消息到订阅了特定频道的所有客户端"""
        disconnected_clients = []
        
        message_data = {
            "type": "broadcast",
            "channel": channel,
            "data": message,
            "timestamp": datetime.now().isoformat()
        }
        
        for client_id, websocket in self.active_connections.items():
            # 检查客户端是否订阅了该频道
            if channel in self.subscriptions.get(client_id, set()):
                try:
                    await websocket.send_text(json.dumps(message_data))
                except Exception as e:
                    logger.error(f"Error broadcasting to {client_id}: {e}")
                    disconnected_clients.append(client_id)
        
        # 清理断开的连接
        for client_id in disconnected_clients:
            self.disconnect(client_id)
    
    async def broadcast_all(self, message: dict):
        """广播消息到所有连接的客户端"""
        disconnected_clients = []
        
        for client_id, websocket in self.active_connections.items():
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error broadcasting to {client_id}: {e}")
                disconnected_clients.append(client_id)
        
        # 清理断开的连接
        for client_id in disconnected_clients:
            self.disconnect(client_id)
    
    async def subscribe(self, client_id: str, channel: str):
        """订阅频道"""
        if client_id in self.subscriptions:
            self.subscriptions[client_id].add(channel)
            logger.info(f"Client {client_id} subscribed to channel {channel}")
    
    async def unsubscribe(self, client_id: str, channel: str):
        """取消订阅频道"""
        if client_id in self.subscriptions:
            self.subscriptions[client_id].discard(channel)
            logger.info(f"Client {client_id} unsubscribed from channel {channel}")
    
    def get_connection_count(self) -> int:
        """获取当前连接数"""
        return len(self.active_connections)
    
    def get_subscriptions(self, client_id: str) -> Set[str]:
        """获取客户端的订阅列表"""
        return self.subscriptions.get(client_id, set())
    
    async def send_stream_event(self, client_id: str, stream_type: str, event_data: dict):
        """发送流事件到特定客户端"""
        if client_id not in self.active_connections:
            return
        
        websocket = self.active_connections[client_id]
        message_data = {
            "type": "stream_event",
            "stream_type": stream_type,
            "data": event_data,
            "timestamp": datetime.now().isoformat()
        }
        
        try:
            await websocket.send_text(json.dumps(message_data))
        except Exception as e:
            logger.error(f"Error sending stream event to {client_id}: {e}")
            self.disconnect(client_id)
    
    async def _start_stream_consumer(self, client_id: str):
        """为客户端启动流消费者"""
        try:
            # 延迟导入避免循环引用
            from .stream_manager import stream_manager
            
            if not hasattr(stream_manager, 'streams') or not stream_manager.streams:
                logger.debug("Stream manager not available or no streams configured")
                return
            
            consumer_name = self.stream_consumers.get(client_id)
            if not consumer_name:
                return
            
            # 为主要流类型启动消费者
            priority_streams = ['game_events', 'notifications', 'company_updates']
            
            # 创建消费者任务
            task = asyncio.create_task(
                self._consume_multiple_streams(client_id, priority_streams, consumer_name)
            )
            self.consumer_tasks[client_id] = task
            
        except Exception as e:
            logger.error(f"Error starting stream consumer for {client_id}: {e}")
    
    async def _consume_multiple_streams(self, client_id: str, stream_types: List[str], consumer_name: str):
        """同时消费多个流的数据"""
        try:
            from .stream_manager import stream_manager
            
            logger.info(f"Starting stream consumer for client {client_id}")
            
            while client_id in self.active_connections:
                try:
                    # 轮询每个流类型
                    for stream_type in stream_types:
                        if client_id not in self.active_connections:
                            break
                            
                        if stream_type not in stream_manager.streams:
                            continue
                        
                        try:
                            # 读取最新消息
                            messages = await stream_manager.read_stream(
                                stream_type, start_id='$', count=5, block=100
                            )
                            
                            if messages:
                                for message in messages:
                                    if client_id in self.active_connections:
                                        await self.send_stream_event(client_id, stream_type, message)
                        
                        except Exception as stream_error:
                            logger.debug(f"Stream read error for {stream_type}: {stream_error}")
                    
                    # 短暂延迟避免过度消耗CPU
                    await asyncio.sleep(1)
                    
                except Exception as e:
                    logger.error(f"Error in stream consumer loop for {client_id}: {e}")
                    await asyncio.sleep(2)  # 出错时延迟更长时间
        
        except Exception as e:
            logger.error(f"Stream consumer error for {client_id}: {e}")
        
        finally:
            logger.debug(f"Stream consumer stopped for {client_id}")
    
    async def get_connection_stats(self) -> dict:
        """获取连接统计信息"""
        return {
            "total_connections": len(self.active_connections),
            "active_clients": list(self.active_connections.keys()),
            "total_subscriptions": sum(len(subs) for subs in self.subscriptions.values()),
            "channels": list(set().union(*self.subscriptions.values())) if self.subscriptions else [],
            "stream_consumers": len(self.stream_consumers),
            "active_consumer_tasks": len([t for t in self.consumer_tasks.values() if not t.done()]),
            "consumer_mapping": dict(self.stream_consumers)
        }