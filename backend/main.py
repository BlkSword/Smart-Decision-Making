from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import asyncio
import logging
from datetime import datetime
from typing import Dict, List
import json
import os
from dotenv import load_dotenv
from dataclasses import asdict

# Load environment variables
load_dotenv()

from routers import companies, employees, decisions, simulation, cache, streams, cluster, monitoring, situation
from core.websocket_manager import ConnectionManager
from core.ai_client import AIClient
from core.game_engine import GameEngine
from core.redis_client_cluster import redis_client
from core.cache_manager import cache_manager
from core.stream_manager import stream_manager
from core.redis_monitor import redis_monitor

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Business War Simulation API",
    description="AI商战模拟系统后端API",
    version="1.0.0"
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应该设置具体的域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket连接管理器
manager = ConnectionManager()

# 游戏引擎实例
game_engine = GameEngine()

async def handle_data_update_request(websocket: WebSocket, client_id: str):
    """处理数据更新请求"""
    try:
        # 获取当前数据
        companies = game_engine.get_companies()
        companies_data = [company.to_dict() for company in companies]
        
        simulation_status = {
            "status": game_engine.state.value,
            "mode": game_engine.mode.value,
            "current_round": game_engine.current_round,
            "current_phase": game_engine.current_phase.value,
            "last_round_time": game_engine.last_round_time.isoformat(),
            "companies_count": len(companies_data),
            "employees_count": len(game_engine.employees),
            "decisions_count": len(game_engine.decisions),
            "events_count": len(game_engine.events),
            "config": game_engine.config
        }
        
        # 发送数据更新
        update_data = {
            "type": "data_update",
            "companies": companies_data,
            "simulationStatus": simulation_status,
            "timestamp": datetime.now().isoformat()
        }
        
        await websocket.send_text(json.dumps(update_data))
        logger.debug(f"Sent data update to client {client_id}")
        
    except Exception as e:
        logger.error(f"Error handling data update request for {client_id}: {e}")
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": "Failed to get data update",
            "timestamp": datetime.now().isoformat()
        }))

# 注册路由
app.include_router(companies.router, prefix="/api/companies", tags=["companies"])
app.include_router(employees.router, prefix="/api/employees", tags=["employees"])
app.include_router(decisions.router, prefix="/api/decisions", tags=["decisions"])
app.include_router(simulation.router, prefix="/api/simulation", tags=["simulation"])
app.include_router(cache.router, prefix="/api/cache", tags=["cache"])
app.include_router(streams.router, prefix="/api/streams", tags=["streams"])
app.include_router(cluster.router, prefix="/api/cluster", tags=["cluster"])
app.include_router(monitoring.router, prefix="/api/monitoring", tags=["monitoring"])
app.include_router(situation.router, tags=["situation"])

@app.get("/")
async def root():
    """根路径"""
    return {
        "message": "AI Business War Simulation API",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """WebSocket连接端点"""
    await manager.connect(websocket, client_id)
    logger.info(f"Client {client_id} connected")
    
    try:
        while True:
            # 等待客户端消息
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # 处理不同类型的消息
            if message.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
            elif message.get("type") == "subscribe":
                # 订阅特定事件
                channel = message.get("channel")
                await manager.subscribe(client_id, channel)
                logger.info(f"Client {client_id} subscribed to {channel}")
            elif message.get("type") == "unsubscribe":
                # 取消订阅
                channel = message.get("channel")
                await manager.unsubscribe(client_id, channel)
                logger.info(f"Client {client_id} unsubscribed from {channel}")
            elif message.get("type") == "request_data_update":
                # 处理数据更新请求
                await handle_data_update_request(websocket, client_id)
            
    except WebSocketDisconnect:
        logger.info(f"Client {client_id} disconnected")
        manager.disconnect(client_id)
    except Exception as e:
        logger.error(f"WebSocket error for client {client_id}: {e}")
        manager.disconnect(client_id)

@app.on_event("startup")
async def startup_event():
    """应用启动事件"""
    logger.info("AI Business War Simulation API starting up...")
    
    # 初始化Redis连接
    await redis_client.connect()
    if redis_client.redis:
        logger.info("Redis connection established")
    else:
        logger.info("Running without Redis caching")
    
    # 初始化流管理器
    await stream_manager.initialize()
    
    # 初始化游戏引擎
    await game_engine.initialize()
    
    # 启动Redis性能监控
    await redis_monitor.start_monitoring()
    
    # 启动后台任务
    asyncio.create_task(background_simulation_task())
    
    logger.info("API startup completed")

@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭事件"""
    logger.info("AI Business War Simulation API shutting down...")
    
    # 关闭流管理器
    await stream_manager.cleanup()
    
    # 停止Redis性能监控
    await redis_monitor.stop_monitoring()
    
    # 关闭游戏引擎
    await game_engine.shutdown()
    
    # 断开Redis连接
    try:
        await redis_client.disconnect()
        logger.info("Redis connection closed")
    except Exception as e:
        logger.error(f"Error closing Redis connection: {e}")
    
    logger.info("API shutdown completed")

async def background_simulation_task():
    """后台模拟任务"""
    while True:
        try:
            # 等待配置的轮次间隔
            await asyncio.sleep(game_engine.config.get('round_interval', 30))
            
            # 只有在自动模式下才执行轮次
            if game_engine.mode.value == 'auto' and game_engine.state.value == 'running':
                events = await game_engine.execute_round()
                
                # 广播事件到所有连接的客户端
                for event in events:
                    event_dict = event.to_dict() if hasattr(event, 'to_dict') else asdict(event)
                    await manager.broadcast("game_events", event_dict)
                
                # 广播数据更新通知
                if events:
                    await manager.broadcast("data_changed", {
                        "type": "round_completed",
                        "round": game_engine.current_round,
                        "events_count": len(events),
                        "timestamp": datetime.now().isoformat()
                    })
                
        except Exception as e:
            logger.error(f"Background simulation task error: {e}")
            await asyncio.sleep(5)  # 错误后短暂等待

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)