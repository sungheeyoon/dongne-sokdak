import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import QueryProvider from "@/lib/providers/QueryProvider";
import AuthProvider from "@/lib/providers/AuthProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import PortfolioNoticeMount from "@/components/PortfolioNoticeMount";

// UI v2 글꼴 계약 (docs/design/UI_V2_CONTRACT.md §2.1)
// 한글·라틴·숫자를 한 패밀리로 처리하고 OS별 우연한 fallback에 의존하지 않기 위해
// Pretendard Variable을 셀프호스팅한다. 서브셋 범위와 용량 예산은 #28에서 확정한다.
const pretendard = localFont({
  src: "./fonts/PretendardVariable.subset.woff2",
  weight: "400 700",
  style: "normal",
  display: "swap",
  preload: true,
  variable: "--font-pretendard",
  fallback: ["-apple-system", "BlinkMacSystemFont", "Apple SD Gothic Neo", "system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "동네속닥 - 우리 동네 이슈 제보 커뮤니티",
  description: "동네의 불편사항과 이슈를 쉽게 제보하고 공유하는 커뮤니티 플랫폼",
  icons: {
    icon: '/icon.png',
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <head>
        {/* 파비콘 설정 */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        
        {/* 카카오맵 스크립트 */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          type="text/javascript"
          src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY}&libraries=services,clusterer&autoload=true`}
        ></script>
      </head>
      <body className="font-sans antialiased">
        <ErrorBoundary>
          <QueryProvider>
            <AuthProvider>
              {children}
              <PortfolioNoticeMount />
            </AuthProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
