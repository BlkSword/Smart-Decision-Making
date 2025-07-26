import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 基本健康检查
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        database: 'connected', // 实际项目中应该检查数据库连接
        ai_service: process.env.MOONSHOT_API_KEY ? 'configured' : 'not_configured'
      }
    };

    return NextResponse.json(health, { status: 200 });
  } catch (error) {
    const errorResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}