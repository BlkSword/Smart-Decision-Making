import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 生产环境优化
  productionBrowserSourceMaps: false,
  poweredByHeader: false,

  // 压缩配置
  compress: true,

  // 实验性功能
  experimental: {
    ppr: true,
    clientSegmentCache: true,
    nodeMiddleware: true,
    turbo: {
      resolveAlias: {
        canvas: './empty-module.js',
      },
    },
  },

  // 允许的开发源
  allowedDevOrigins: [
    '*.clackypaas.com',
    'localhost',
    '127.0.0.1',
    '0.0.0.0'
  ],

  // 图片优化
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
  },

  // 环境变量
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // 重定向配置
  async redirects() {
    return [
      {
        source: '/old-simulation',
        destination: '/simulation',
        permanent: true,
      },
    ];
  },

  // 头部配置
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
