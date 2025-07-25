from fastapi import APIRouter, HTTPException, Query
from typing import Dict, List, Any, Optional
import logging

from core.stream_manager import stream_manager
from core.redis_client_cluster import redis_client

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/info", response_model=Dict[str, Any])
async def get_streams_info():
    """获取所有流的信息"""
    try:
        # 检查Redis是否可用（集群或单节点模式）
        connection_info = redis_client.get_connection_info()
        if connection_info['mode'] == 'none' or not connection_info.get('connected', False):
            raise HTTPException(status_code=503, detail="Redis not available")
        
        streams_info = await stream_manager.get_all_streams_info()
        
        return {
            "status": "active" if connection_info.get('connected', False) else "inactive",
            "streams": streams_info,
            "active_consumers": list(stream_manager.active_consumers),
            "total_streams": len(stream_manager.streams),
            "consumer_groups": list(stream_manager.consumer_groups.keys())
        }
    except Exception as e:
        logger.error(f"Error getting streams info: {e}")
        raise HTTPException(status_code=500, detail="Failed to get streams info")

@router.get("/{stream_type}/info", response_model=Dict[str, Any])
async def get_stream_info(stream_type: str):
    """获取特定流的信息"""
    try:
        # 检查Redis是否可用
        connection_info = redis_client.get_connection_info()
        if connection_info['mode'] == 'none' or not connection_info.get('connected', False):
            raise HTTPException(status_code=503, detail="Redis not available")
        
        if stream_type not in stream_manager.streams:
            raise HTTPException(status_code=404, detail=f"Stream type '{stream_type}' not found")
        
        stream_info = await stream_manager.get_stream_info(stream_type)
        
        return stream_info
    except Exception as e:
        logger.error(f"Error getting stream info for {stream_type}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get stream info")

@router.get("/{stream_type}/messages", response_model=List[Dict[str, Any]])
async def get_stream_messages(
    stream_type: str,
    start: str = Query('-', description="Start message ID"),
    end: str = Query('+', description="End message ID"),
    count: Optional[int] = Query(100, description="Maximum number of messages")
):
    """获取流消息"""
    try:
        # 检查Redis是否可用
        connection_info = redis_client.get_connection_info()
        if connection_info['mode'] == 'none' or not connection_info.get('connected', False):
            raise HTTPException(status_code=503, detail="Redis not available")
        
        if stream_type not in stream_manager.streams:
            raise HTTPException(status_code=404, detail=f"Stream type '{stream_type}' not found")
        
        messages = await stream_manager.read_stream_range(stream_type, start, end, count)
        
        return messages
    except Exception as e:
        logger.error(f"Error getting messages from {stream_type}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get stream messages")

@router.post("/{stream_type}/add", response_model=Dict[str, Any])
async def add_stream_message(stream_type: str, message_data: Dict[str, Any]):
    """添加消息到流"""
    try:
        # 检查Redis是否可用
        connection_info = redis_client.get_connection_info()
        if connection_info['mode'] == 'none' or not connection_info.get('connected', False):
            raise HTTPException(status_code=503, detail="Redis not available")
        
        if stream_type not in stream_manager.streams:
            raise HTTPException(status_code=404, detail=f"Stream type '{stream_type}' not found")
        
        message_id = await stream_manager.add_event(stream_type, message_data)
        
        if message_id:
            return {
                "success": True,
                "message_id": message_id,
                "stream_type": stream_type
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to add message to stream")
            
    except Exception as e:
        logger.error(f"Error adding message to {stream_type}: {e}")
        raise HTTPException(status_code=500, detail="Failed to add message to stream")

@router.post("/{stream_type}/trim", response_model=Dict[str, Any])
async def trim_stream(stream_type: str, max_length: Optional[int] = None):
    """修剪流长度"""
    try:
        # 检查Redis是否可用
        connection_info = redis_client.get_connection_info()
        if connection_info['mode'] == 'none' or not connection_info.get('connected', False):
            raise HTTPException(status_code=503, detail="Redis not available")
        
        if stream_type not in stream_manager.streams:
            raise HTTPException(status_code=404, detail=f"Stream type '{stream_type}' not found")
        
        trimmed_count = await stream_manager.trim_stream(stream_type, max_length)
        
        return {
            "success": True,
            "stream_type": stream_type,
            "trimmed_messages": trimmed_count,
            "max_length": max_length or stream_manager.stream_config['trim_threshold']
        }
    except Exception as e:
        logger.error(f"Error trimming stream {stream_type}: {e}")
        raise HTTPException(status_code=500, detail="Failed to trim stream")

@router.get("/events/recent", response_model=List[Dict[str, Any]])
async def get_recent_events(
    stream_type: Optional[str] = None,
    limit: int = Query(50, description="Maximum number of events"),
    company_id: Optional[str] = None
):
    """获取最近的事件"""
    try:
        # 检查Redis是否可用
        connection_info = redis_client.get_connection_info()
        if connection_info['mode'] == 'none' or not connection_info.get('connected', False):
            # 如果Redis不可用，返回空结果
            return []
        
        all_events = []
        
        # 如果指定了流类型，只从该流读取
        if stream_type:
            if stream_type not in stream_manager.streams:
                raise HTTPException(status_code=404, detail=f"Stream type '{stream_type}' not found")
            events = await stream_manager.read_stream_range(stream_type, '-', '+', limit)
            for event in events:
                event['stream_type'] = stream_type
            all_events.extend(events)
        else:
            # 从所有流读取事件
            for st in stream_manager.streams.keys():
                events = await stream_manager.read_stream_range(st, '-', '+', limit // len(stream_manager.streams) + 1)
                for event in events:
                    event['stream_type'] = st
                all_events.extend(events)
        
        # 按时间戳排序
        all_events.sort(key=lambda x: x.get('id', ''), reverse=True)
        
        # 过滤公司相关事件
        if company_id:
            all_events = [event for event in all_events 
                         if event.get('fields', {}).get('company_id') == company_id]
        
        return all_events[:limit]
        
    except Exception as e:
        logger.error(f"Error getting recent events: {e}")
        raise HTTPException(status_code=500, detail="Failed to get recent events")

@router.post("/notifications/add", response_model=Dict[str, Any])
async def add_notification(
    recipient_type: str,
    recipient_id: str,
    notification_type: str,
    title: str,
    message: str,
    data: Optional[Dict[str, Any]] = None
):
    """添加通知"""
    try:
        # 检查Redis是否可用
        connection_info = redis_client.get_connection_info()
        if connection_info['mode'] == 'none' or not connection_info.get('connected', False):
            raise HTTPException(status_code=503, detail="Redis not available")
        
        message_id = await stream_manager.add_notification(
            recipient_type, recipient_id, notification_type, title, message, data
        )
        
        if message_id:
            return {
                "success": True,
                "message_id": message_id,
                "recipient_type": recipient_type,
                "recipient_id": recipient_id
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to add notification")
            
    except Exception as e:
        logger.error(f"Error adding notification: {e}")
        raise HTTPException(status_code=500, detail="Failed to add notification")

@router.get("/notifications/{recipient_type}/{recipient_id}", response_model=List[Dict[str, Any]])
async def get_notifications(
    recipient_type: str,
    recipient_id: str,
    limit: int = Query(20, description="Maximum number of notifications")
):
    """获取用户通知"""
    try:
        # 检查Redis是否可用
        connection_info = redis_client.get_connection_info()
        if connection_info['mode'] == 'none' or not connection_info.get('connected', False):
            return []
        
        # 从通知流读取消息
        notifications = await stream_manager.read_stream_range('notifications', '-', '+', limit * 5)
        
        # 过滤出指定接收者的通知
        filtered_notifications = []
        for notification in notifications:
            fields = notification.get('fields', {})
            if (fields.get('recipient_type') == recipient_type and 
                fields.get('recipient_id') == recipient_id):
                filtered_notifications.append(notification)
        
        # 按时间排序并限制数量
        filtered_notifications.sort(key=lambda x: x.get('id', ''), reverse=True)
        return filtered_notifications[:limit]
        
    except Exception as e:
        logger.error(f"Error getting notifications: {e}")
        raise HTTPException(status_code=500, detail="Failed to get notifications")

@router.post("/system/event", response_model=Dict[str, Any])
async def add_system_event(
    event_type: str,
    message: str,
    data: Optional[Dict[str, Any]] = None
):
    """添加系统事件"""
    try:
        # 检查Redis是否可用
        connection_info = redis_client.get_connection_info()
        if connection_info['mode'] == 'none' or not connection_info.get('connected', False):
            raise HTTPException(status_code=503, detail="Redis not available")
        
        message_id = await stream_manager.add_system_event(event_type, message, data)
        
        if message_id:
            return {
                "success": True,
                "message_id": message_id,
                "event_type": event_type
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to add system event")
            
    except Exception as e:
        logger.error(f"Error adding system event: {e}")
        raise HTTPException(status_code=500, detail="Failed to add system event")

@router.get("/consumers/status", response_model=Dict[str, Any])
async def get_consumers_status():
    """获取消费者状态"""
    try:
        return {
            "active_consumers": list(stream_manager.active_consumers),
            "consumer_groups": list(stream_manager.consumer_groups.keys()),
            "total_active": len(stream_manager.active_consumers),
            "processors": {
                stream_type: len(processors) 
                for stream_type, processors in stream_manager.processors.items()
            }
        }
    except Exception as e:
        logger.error(f"Error getting consumers status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get consumers status")

@router.post("/consumers/{stream_type}/start", response_model=Dict[str, Any])
async def start_consumer(stream_type: str, group_name: str, consumer_name: str):
    """启动消费者"""
    try:
        # 检查Redis是否可用
        connection_info = redis_client.get_connection_info()
        if connection_info['mode'] == 'none' or not connection_info.get('connected', False):
            raise HTTPException(status_code=503, detail="Redis not available")
        
        if stream_type not in stream_manager.streams:
            raise HTTPException(status_code=404, detail=f"Stream type '{stream_type}' not found")
        
        if group_name not in stream_manager.consumer_groups:
            raise HTTPException(status_code=404, detail=f"Consumer group '{group_name}' not found")
        
        # 异步启动消费者
        import asyncio
        asyncio.create_task(stream_manager.start_consumer(stream_type, group_name, consumer_name))
        
        return {
            "success": True,
            "stream_type": stream_type,
            "group_name": group_name,
            "consumer_name": consumer_name,
            "status": "starting"
        }
    except Exception as e:
        logger.error(f"Error starting consumer: {e}")
        raise HTTPException(status_code=500, detail="Failed to start consumer")

@router.post("/consumers/{stream_type}/stop", response_model=Dict[str, Any])
async def stop_consumer(stream_type: str, group_name: str, consumer_name: str):
    """停止消费者"""
    try:
        await stream_manager.stop_consumer(stream_type, group_name, consumer_name)
        
        return {
            "success": True,
            "stream_type": stream_type,
            "group_name": group_name,
            "consumer_name": consumer_name,
            "status": "stopping"
        }
    except Exception as e:
        logger.error(f"Error stopping consumer: {e}")
        raise HTTPException(status_code=500, detail="Failed to stop consumer")