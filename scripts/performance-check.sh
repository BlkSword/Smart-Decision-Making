#!/bin/bash

# AI商战模拟系统性能检查脚本
# 用于检查系统各组件的性能状态

set -e

echo "=== AI商战模拟系统性能检查 ==="
echo "检查时间: $(date)"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查函数
check_service() {
    local service_name="$1"
    local check_command="$2"
    local expected_output="$3"
    
    echo -n "检查 $service_name... "
    
    if eval "$check_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 正常${NC}"
        return 0
    else
        echo -e "${RED}✗ 异常${NC}"
        return 1
    fi
}

# 检查系统资源
check_system_resources() {
    echo "=== 系统资源状态 ==="
    
    # CPU使用率
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
    echo "CPU使用率: ${cpu_usage}%"
    
    # 内存使用率
    mem_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
    echo "内存使用率: ${mem_usage}%"
    
    # 磁盘使用率
    disk_usage=$(df -h / | awk 'NR==2 {print $5}')
    echo "磁盘使用率: ${disk_usage}"
    
    # 负载平均值
    load_avg=$(uptime | awk -F'load average:' '{print $2}')
    echo "负载平均值:${load_avg}"
    
    echo ""
}

# 检查前端服务
check_frontend() {
    echo "=== 前端服务检查 ==="
    
    # 检查Next.js服务
    check_service "Next.js服务" "curl -f http://localhost:3000/ -s" ""
    
    # 检查响应时间
    response_time=$(curl -o /dev/null -s -w "%{time_total}" http://localhost:3000/)
    echo "前端响应时间: ${response_time}秒"
    
    # 检查API路由
    check_service "前端API路由" "curl -f http://localhost:3000/api/companies -s" ""
    
    echo ""
}

# 检查后端服务
check_backend() {
    echo "=== 后端服务检查 ==="
    
    # 检查FastAPI服务
    check_service "FastAPI服务" "curl -f http://localhost:8000/health -s" ""
    
    # 检查API响应时间
    response_time=$(curl -o /dev/null -s -w "%{time_total}" http://localhost:8000/health)
    echo "后端响应时间: ${response_time}秒"
    
    # 检查WebSocket端点
    check_service "WebSocket端点" "curl -f http://localhost:8000/ws -s" ""
    
    # 检查AI状态
    ai_status=$(curl -s http://localhost:8000/api/simulation/status | jq -r '.ai_stats.total_calls // 0')
    echo "AI调用总数: ${ai_status}"
    
    echo ""
}

# 检查数据库
check_database() {
    echo "=== 数据库检查 ==="
    
    # 检查SQLite数据库文件
    if [ -f "backend/business_war.db" ]; then
        echo -e "数据库文件: ${GREEN}✓ 存在${NC}"
        db_size=$(du -h backend/business_war.db | cut -f1)
        echo "数据库大小: ${db_size}"
    else
        echo -e "数据库文件: ${RED}✗ 不存在${NC}"
    fi
    
    # 检查数据库连接
    check_service "数据库连接" "curl -f http://localhost:8000/api/companies -s" ""
    
    echo ""
}

# 检查Redis
check_redis() {
    echo "=== Redis检查 ==="
    
    # 检查Redis服务
    if command -v redis-cli &> /dev/null; then
        if redis-cli ping > /dev/null 2>&1; then
            echo -e "Redis服务: ${GREEN}✓ 正常${NC}"
            
            # 获取Redis信息
            redis_version=$(redis-cli INFO server | grep redis_version | cut -d: -f2 | tr -d '\r')
            echo "Redis版本: ${redis_version}"
            
            # 内存使用情况
            redis_memory=$(redis-cli INFO memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
            echo "Redis内存使用: ${redis_memory}"
            
            # 连接数
            redis_connections=$(redis-cli INFO clients | grep connected_clients | cut -d: -f2 | tr -d '\r')
            echo "Redis连接数: ${redis_connections}"
            
        else
            echo -e "Redis服务: ${RED}✗ 异常${NC}"
        fi
    else
        echo -e "Redis客户端: ${YELLOW}! 未安装${NC}"
    fi
    
    echo ""
}

# 检查进程
check_processes() {
    echo "=== 进程检查 ==="
    
    # 检查Node.js进程
    node_processes=$(pgrep -f "node.*next" | wc -l)
    echo "Node.js进程数: ${node_processes}"
    
    # 检查Python进程
    python_processes=$(pgrep -f "python.*uvicorn" | wc -l)
    echo "Python进程数: ${python_processes}"
    
    # 检查端口占用
    echo "端口占用情况:"
    if command -v ss &> /dev/null; then
        ss -tlnp | grep -E ":(3000|8000|6379)" | while read line; do
            echo "  $line"
        done
    else
        netstat -tlnp | grep -E ":(3000|8000|6379)" | while read line; do
            echo "  $line"
        done
    fi
    
    echo ""
}

# 检查日志
check_logs() {
    echo "=== 日志检查 ==="
    
    # 检查最近的错误日志
    if [ -f "/var/log/ai-business-war/error.log" ]; then
        error_count=$(tail -n 1000 /var/log/ai-business-war/error.log | grep -c "ERROR" || echo "0")
        echo "最近1000行错误日志中的ERROR数量: ${error_count}"
    fi
    
    # 检查Node.js控制台错误
    echo "最近的应用输出:"
    if pgrep -f "node.*next" > /dev/null; then
        echo "  前端服务正在运行"
    else
        echo "  前端服务未运行"
    fi
    
    if pgrep -f "python.*uvicorn" > /dev/null; then
        echo "  后端服务正在运行"
    else
        echo "  后端服务未运行"
    fi
    
    echo ""
}

# 性能测试
performance_test() {
    echo "=== 性能测试 ==="
    
    # 前端性能测试
    echo "前端性能测试 (10次请求):"
    for i in {1..10}; do
        time=$(curl -o /dev/null -s -w "%{time_total}" http://localhost:3000/)
        echo "  请求 $i: ${time}秒"
    done
    
    # 后端性能测试
    echo "后端性能测试 (10次请求):"
    for i in {1..10}; do
        time=$(curl -o /dev/null -s -w "%{time_total}" http://localhost:8000/health)
        echo "  请求 $i: ${time}秒"
    done
    
    echo ""
}

# 生成报告
generate_report() {
    echo "=== 性能报告 ==="
    
    # 获取系统信息
    uptime_info=$(uptime)
    echo "系统运行时间: ${uptime_info}"
    
    # 获取模拟状态
    if curl -f http://localhost:8000/api/simulation/status -s > /dev/null 2>&1; then
        status_info=$(curl -s http://localhost:8000/api/simulation/status | jq -r '.status')
        step_info=$(curl -s http://localhost:8000/api/simulation/status | jq -r '.current_step')
        companies_info=$(curl -s http://localhost:8000/api/simulation/status | jq -r '.companies_count')
        
        echo "模拟状态: ${status_info}"
        echo "当前步数: ${step_info}"
        echo "公司数量: ${companies_info}"
    fi
    
    # 生成时间戳
    echo "报告生成时间: $(date)"
    
    echo ""
}

# 主函数
main() {
    check_system_resources
    check_frontend
    check_backend
    check_database
    check_redis
    check_processes
    check_logs
    
    # 可选的性能测试
    if [ "$1" = "--performance" ]; then
        performance_test
    fi
    
    generate_report
    
    echo "=== 检查完成 ==="
    echo "如需详细性能测试，请运行: $0 --performance"
}

# 运行主函数
main "$@"