"""
Redis性能监控API路由
提供性能指标查询、预警管理等功能
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Dict, List, Any, Optional
import logging
from pydantic import BaseModel

from core.redis_monitor import redis_monitor, AlertRule
from core.performance_report import performance_reporter

router = APIRouter()
logger = logging.getLogger(__name__)

class AlertRuleModel(BaseModel):
    """预警规则模型"""
    metric_name: str
    threshold: float
    comparison: str  # 'gt', 'lt', 'eq', 'gte', 'lte'
    duration: int
    severity: str  # 'critical', 'warning', 'info'
    description: str
    enabled: bool = True

class AlertRuleUpdate(BaseModel):
    """预警规则更新模型"""
    threshold: Optional[float] = None
    comparison: Optional[str] = None
    duration: Optional[int] = None
    severity: Optional[str] = None
    description: Optional[str] = None
    enabled: Optional[bool] = None

@router.get("/metrics/current", response_model=Dict[str, Any])
async def get_current_metrics():
    """获取当前Redis性能指标"""
    try:
        metrics = await redis_monitor.collect_metrics()
        
        if not metrics:
            raise HTTPException(status_code=503, detail="Unable to collect Redis metrics")
        
        return {
            "status": "success",
            "data": metrics,
            "collection_time": metrics.get('collection_timestamp')
        }
        
    except Exception as e:
        logger.error(f"Error getting current metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get current metrics")

@router.get("/metrics/summary", response_model=Dict[str, Any])
async def get_metrics_summary(
    hours: int = Query(1, description="统计时间范围（小时）", ge=1, le=168)
):
    """获取指定时间范围内的性能指标摘要"""
    try:
        summary = redis_monitor.get_metrics_summary(hours=hours)
        
        return {
            "status": "success",
            "time_range_hours": hours,
            "data": summary,
            "total_metrics": len(summary)
        }
        
    except Exception as e:
        logger.error(f"Error getting metrics summary: {e}")
        raise HTTPException(status_code=500, detail="Failed to get metrics summary")

@router.get("/metrics/history/{metric_name}", response_model=Dict[str, Any])
async def get_metric_history(
    metric_name: str,
    limit: int = Query(100, description="返回数据点数量", ge=1, le=1000)
):
    """获取特定指标的历史数据"""
    try:
        if metric_name not in redis_monitor.metrics_history:
            raise HTTPException(status_code=404, detail=f"Metric '{metric_name}' not found")
        
        history = redis_monitor.metrics_history[metric_name]
        
        # 获取最近的数据点
        recent_points = list(history)[-limit:] if len(history) > limit else list(history)
        
        data_points = [
            {
                "timestamp": point.timestamp.isoformat(),
                "value": point.value,
                "tags": point.tags
            }
            for point in recent_points
        ]
        
        return {
            "status": "success",
            "metric_name": metric_name,
            "description": redis_monitor.monitored_metrics.get(metric_name, metric_name),
            "total_points": len(data_points),
            "data": data_points
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting metric history for {metric_name}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get metric history")

@router.get("/metrics/available", response_model=Dict[str, Any])
async def get_available_metrics():
    """获取所有可用的监控指标"""
    try:
        return {
            "status": "success",
            "metrics": redis_monitor.monitored_metrics,
            "total_count": len(redis_monitor.monitored_metrics)
        }
        
    except Exception as e:
        logger.error(f"Error getting available metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get available metrics")

@router.get("/alerts/active", response_model=Dict[str, Any])
async def get_active_alerts():
    """获取当前活跃的预警"""
    try:
        active_alerts = redis_monitor.get_active_alerts()
        
        return {
            "status": "success",
            "total_alerts": len(active_alerts),
            "data": active_alerts
        }
        
    except Exception as e:
        logger.error(f"Error getting active alerts: {e}")
        raise HTTPException(status_code=500, detail="Failed to get active alerts")

@router.get("/alerts/history", response_model=Dict[str, Any])
async def get_alert_history(
    hours: int = Query(24, description="历史记录时间范围（小时）", ge=1, le=720)
):
    """获取预警历史记录"""
    try:
        alert_history = redis_monitor.get_alert_history(hours=hours)
        
        return {
            "status": "success",
            "time_range_hours": hours,
            "total_alerts": len(alert_history),
            "data": alert_history
        }
        
    except Exception as e:
        logger.error(f"Error getting alert history: {e}")
        raise HTTPException(status_code=500, detail="Failed to get alert history")

@router.get("/alerts/rules", response_model=Dict[str, Any])
async def get_alert_rules():
    """获取所有预警规则"""
    try:
        rules_data = []
        
        for rule_id, rule in redis_monitor.alert_rules.items():
            rules_data.append({
                "rule_id": rule_id,
                "metric_name": rule.metric_name,
                "threshold": rule.threshold,
                "comparison": rule.comparison,
                "duration": rule.duration,
                "severity": rule.severity,
                "description": rule.description,
                "enabled": rule.enabled
            })
        
        return {
            "status": "success",
            "total_rules": len(rules_data),
            "data": rules_data
        }
        
    except Exception as e:
        logger.error(f"Error getting alert rules: {e}")
        raise HTTPException(status_code=500, detail="Failed to get alert rules")

@router.post("/alerts/rules", response_model=Dict[str, Any])
async def create_alert_rule(rule_data: AlertRuleModel):
    """创建新的预警规则"""
    try:
        # 验证比较运算符
        valid_comparisons = ['gt', 'gte', 'lt', 'lte', 'eq']
        if rule_data.comparison not in valid_comparisons:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid comparison operator. Must be one of: {valid_comparisons}"
            )
        
        # 验证严重程度
        valid_severities = ['critical', 'warning', 'info']
        if rule_data.severity not in valid_severities:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid severity level. Must be one of: {valid_severities}"
            )
        
        # 验证指标名称
        if rule_data.metric_name not in redis_monitor.monitored_metrics:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid metric name. Available metrics: {list(redis_monitor.monitored_metrics.keys())}"
            )
        
        # 创建预警规则
        rule = AlertRule(
            metric_name=rule_data.metric_name,
            threshold=rule_data.threshold,
            comparison=rule_data.comparison,
            duration=rule_data.duration,
            severity=rule_data.severity,
            description=rule_data.description,
            enabled=rule_data.enabled
        )
        
        rule_id = redis_monitor.add_alert_rule(rule)
        
        return {
            "status": "success",
            "rule_id": rule_id,
            "message": "Alert rule created successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating alert rule: {e}")
        raise HTTPException(status_code=500, detail="Failed to create alert rule")

@router.put("/alerts/rules/{rule_id}", response_model=Dict[str, Any])
async def update_alert_rule(rule_id: str, rule_update: AlertRuleUpdate):
    """更新预警规则"""
    try:
        if rule_id not in redis_monitor.alert_rules:
            raise HTTPException(status_code=404, detail="Alert rule not found")
        
        existing_rule = redis_monitor.alert_rules[rule_id]
        
        # 更新指定的字段
        update_data = rule_update.dict(exclude_unset=True)
        
        # 验证更新的字段
        if 'comparison' in update_data:
            valid_comparisons = ['gt', 'gte', 'lt', 'lte', 'eq']
            if update_data['comparison'] not in valid_comparisons:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid comparison operator. Must be one of: {valid_comparisons}"
                )
        
        if 'severity' in update_data:
            valid_severities = ['critical', 'warning', 'info']
            if update_data['severity'] not in valid_severities:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid severity level. Must be one of: {valid_severities}"
                )
        
        # 创建更新后的规则
        updated_rule = AlertRule(
            metric_name=existing_rule.metric_name,
            threshold=update_data.get('threshold', existing_rule.threshold),
            comparison=update_data.get('comparison', existing_rule.comparison),
            duration=update_data.get('duration', existing_rule.duration),
            severity=update_data.get('severity', existing_rule.severity),
            description=update_data.get('description', existing_rule.description),
            enabled=update_data.get('enabled', existing_rule.enabled)
        )
        
        success = redis_monitor.update_alert_rule(rule_id, updated_rule)
        
        if not success:
            raise HTTPException(status_code=404, detail="Alert rule not found")
        
        return {
            "status": "success",
            "rule_id": rule_id,
            "message": "Alert rule updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating alert rule {rule_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update alert rule")

@router.delete("/alerts/rules/{rule_id}", response_model=Dict[str, Any])
async def delete_alert_rule(rule_id: str):
    """删除预警规则"""
    try:
        success = redis_monitor.remove_alert_rule(rule_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Alert rule not found")
        
        return {
            "status": "success",
            "rule_id": rule_id,
            "message": "Alert rule deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting alert rule {rule_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete alert rule")

@router.post("/monitoring/start", response_model=Dict[str, Any])
async def start_monitoring():
    """启动性能监控"""
    try:
        await redis_monitor.start_monitoring()
        
        return {
            "status": "success",
            "message": "Performance monitoring started",
            "monitoring_interval": redis_monitor.monitor_interval
        }
        
    except Exception as e:
        logger.error(f"Error starting monitoring: {e}")
        raise HTTPException(status_code=500, detail="Failed to start monitoring")

@router.post("/monitoring/stop", response_model=Dict[str, Any])
async def stop_monitoring():
    """停止性能监控"""
    try:
        await redis_monitor.stop_monitoring()
        
        return {
            "status": "success",
            "message": "Performance monitoring stopped"
        }
        
    except Exception as e:
        logger.error(f"Error stopping monitoring: {e}")
        raise HTTPException(status_code=500, detail="Failed to stop monitoring")

@router.get("/monitoring/status", response_model=Dict[str, Any])
async def get_monitoring_status():
    """获取监控状态"""
    try:
        return {
            "status": "success",
            "monitoring": redis_monitor.monitoring,
            "monitor_interval": redis_monitor.monitor_interval,
            "total_metrics": len(redis_monitor.monitored_metrics),
            "total_alert_rules": len(redis_monitor.alert_rules),
            "active_alerts": len(redis_monitor.active_alerts),
            "data_points": {
                metric: len(history) 
                for metric, history in redis_monitor.metrics_history.items()
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting monitoring status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get monitoring status")

@router.get("/dashboard/overview", response_model=Dict[str, Any])
async def get_dashboard_overview():
    """获取监控仪表板概览数据"""
    try:
        # 获取当前指标
        current_metrics = await redis_monitor.collect_metrics()
        
        # 获取指标摘要（最近1小时）
        summary = redis_monitor.get_metrics_summary(hours=1)
        
        # 获取活跃预警
        active_alerts = redis_monitor.get_active_alerts()
        
        # 计算健康评分
        health_score = 100.0
        
        # 根据关键指标调整健康评分
        if current_metrics:
            # 内存使用率影响
            memory_usage = current_metrics.get('memory_usage', 0)
            if memory_usage > 90:
                health_score -= 30
            elif memory_usage > 80:
                health_score -= 15
            
            # 响应时间影响
            response_time = current_metrics.get('response_time', 0)
            if response_time > 100:
                health_score -= 20
            elif response_time > 50:
                health_score -= 10
            
            # 缓存命中率影响
            hit_rate = current_metrics.get('hit_rate', 100)
            if hit_rate < 70:
                health_score -= 15
            elif hit_rate < 80:
                health_score -= 10
        
        # 活跃预警影响
        for alert in active_alerts:
            if alert['severity'] == 'critical':
                health_score -= 25
            elif alert['severity'] == 'warning':
                health_score -= 10
            else:
                health_score -= 5
        
        health_score = max(0, min(100, health_score))
        
        return {
            "status": "success",
            "health_score": round(health_score, 1),
            "current_metrics": current_metrics,
            "metrics_summary": summary,
            "active_alerts": active_alerts,
            "monitoring_status": {
                "is_running": redis_monitor.monitoring,
                "interval_seconds": redis_monitor.monitor_interval,
                "total_rules": len(redis_monitor.alert_rules)
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting dashboard overview: {e}")
        raise HTTPException(status_code=500, detail="Failed to get dashboard overview")

@router.get("/health", response_model=Dict[str, Any])
async def health_check():
    """监控系统健康检查"""
    try:
        # 测试Redis连接
        current_metrics = await redis_monitor.collect_metrics()
        redis_available = bool(current_metrics)
        
        return {
            "status": "healthy" if redis_available else "unhealthy",
            "redis_available": redis_available,
            "monitoring_active": redis_monitor.monitoring,
            "timestamp": current_metrics.get('collection_timestamp') if current_metrics else None
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "redis_available": False,
            "monitoring_active": False,
            "error": str(e)
        }

@router.get("/reports/performance", response_model=Dict[str, Any])
async def generate_performance_report(
    hours: int = Query(24, description="报告时间范围（小时）", ge=1, le=168)
):
    """生成Redis性能分析报告"""
    try:
        report = await performance_reporter.generate_performance_report(hours=hours)
        
        return {
            "status": "success",
            "report": report
        }
        
    except Exception as e:
        logger.error(f"Error generating performance report: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate performance report")

@router.get("/reports/summary", response_model=Dict[str, Any])
async def get_performance_summary():
    """获取性能摘要报告"""
    try:
        # 生成简化版报告（最近6小时）
        report = await performance_reporter.generate_performance_report(hours=6)
        
        if "error" in report:
            raise HTTPException(status_code=500, detail=report["error"])
        
        # 提取关键信息
        summary = {
            "generated_at": report["report_metadata"]["generated_at"],
            "health_score": report["overall_health_score"],
            "status": report["executive_summary"]["overall_status"],
            "critical_issues": report["executive_summary"]["critical_issues_count"],
            "key_metrics": report["executive_summary"]["key_metrics"],
            "immediate_actions": report["executive_summary"]["immediate_actions"],
            "high_priority_recommendations": len(report["recommendations"]["high"]),
            "alert_summary": {
                "total": report["alert_summary"]["total_alerts"],
                "critical": report["alert_summary"]["critical_alerts"],
                "warning": report["alert_summary"]["warning_alerts"]
            }
        }
        
        return {
            "status": "success",
            "summary": summary
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating performance summary: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate performance summary")