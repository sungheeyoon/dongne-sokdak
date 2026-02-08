import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 이미지 최적화
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1년 캐시
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    unoptimized: process.env.NODE_ENV === 'development', // 개발 환경에서는 최적화 비활성화
  },

  // 성능 최적화
  poweredByHeader: false,
  compress: true,
  
  // React Strict Mode 개발 환경에서 비활성화 (중복 API 호출 방지)
  reactStrictMode: process.env.NODE_ENV !== 'development',

  // 개발 환경 설정
  ...(process.env.NODE_ENV === 'development' && {
    allowedDevOrigins: ['172.24.19.106:3000'],
  }),

  // 실험적 기능
  experimental: {
    optimizePackageImports: ['lucide-react', '@tanstack/react-query'],
  },
};

export default nextConfig;
