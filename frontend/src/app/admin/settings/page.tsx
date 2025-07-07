'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '../../../hooks/useAdmin';

interface SystemInfo {
  server_status: 'healthy' | 'unhealthy';
  database_status: 'connected' | 'disconnected';
  api_version: string;
  environment: string;
  profile_count: number;
  uptime: string;
}

function AdminSettingsPage() {
  const router = useRouter();
  const { isAdmin } = useAdmin();
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [systemLoading, setSystemLoading] = useState(false);
  const [systemError, setSystemError] = useState<string | null>(null);

  const fetchSystemInfo = async () => {
    try {
      setSystemLoading(true);
      setSystemError(null);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/health`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      setSystemInfo({
        server_status: data.status === 'healthy' ? 'healthy' : 'unhealthy',
        database_status: data.database?.status === 'connected' ? 'connected' : 'disconnected',
        api_version: data.api_version || 'Unknown',
        environment: data.environment || 'Unknown',
        profile_count: data.database?.profile_count || 0,
        uptime: 'Unknown' // TODO: 실제 업타임 구현
      });
    } catch (error) {
      console.error('System info fetch error:', error);
      setSystemError(error instanceof Error ? error.message : '시스템 정보 조회 실패');
    } finally {
      setSystemLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin()) {
      fetchSystemInfo();
    }
  }, []);


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return 'bg-green-100 text-green-800';
      case 'unhealthy':
      case 'disconnected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return '✅';
      case 'unhealthy':
      case 'disconnected':
        return '❌';
      default:
        return '❓';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">시스템 설정</h1>
            <p className="text-gray-600 mt-1">시스템 상태 및 설정을 관리합니다</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchSystemInfo}
              disabled={systemLoading}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                systemLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {systemLoading ? '새로고침 중...' : '새로고침'}
            </button>
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              대시보드로 돌아가기
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 시스템 상태 */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">시스템 상태</h2>
            
            {systemLoading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : systemError ? (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="text-red-800">{systemError}</div>
              </div>
            ) : systemInfo ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">서버 상태</span>
                  <div className="flex items-center gap-2">
                    <span>{getStatusIcon(systemInfo.server_status)}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(systemInfo.server_status)}`}>
                      {systemInfo.server_status === 'healthy' ? '정상' : '비정상'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">데이터베이스</span>
                  <div className="flex items-center gap-2">
                    <span>{getStatusIcon(systemInfo.database_status)}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(systemInfo.database_status)}`}>
                      {systemInfo.database_status === 'connected' ? '연결됨' : '연결 안됨'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">API 버전</span>
                  <span className="text-gray-900 font-mono">{systemInfo.api_version}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">환경</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    systemInfo.environment === 'production' ? 'bg-red-100 text-red-800' : 
                    systemInfo.environment === 'staging' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {systemInfo.environment}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">등록된 사용자</span>
                  <span className="text-gray-900 font-bold">{systemInfo.profile_count.toLocaleString()}명</span>
                </div>
              </div>
            ) : null}
          </div>

          {/* 시스템 설정 */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">시스템 설정</h2>
            
            <div className="space-y-4">
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">사이트 공지사항</h3>
                <p className="text-sm text-gray-600 mb-3">사용자에게 표시될 공지사항을 설정합니다.</p>
                <textarea
                  placeholder="공지사항을 입력하세요..."
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  defaultValue="현재 시스템 점검 중입니다."
                />
                <button className="mt-2 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">
                  저장
                </button>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">제보 카테고리 관리</h3>
                <p className="text-sm text-gray-600 mb-3">제보 카테고리를 추가하거나 수정합니다.</p>
                <div className="space-y-2">
                  {['소음', '쓰레기', '시설', '교통', '기타'].map((category, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">{category}</span>
                      <button className="text-red-600 hover:text-red-800 text-sm">
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    placeholder="새 카테고리명"
                    className="flex-1 p-2 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button className="px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600">
                    추가
                  </button>
                </div>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">시스템 유지보수</h3>
                <p className="text-sm text-gray-600 mb-3">시스템 관리 작업을 수행합니다.</p>
                <div className="space-y-2">
                  <button className="w-full p-2 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600">
                    캐시 클리어
                  </button>
                  <button className="w-full p-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">
                    데이터베이스 최적화
                  </button>
                  <button className="w-full p-2 bg-green-500 text-white text-sm rounded hover:bg-green-600">
                    로그 파일 압축
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 환경 변수 정보 */}
          <div className="bg-white p-6 rounded-lg shadow-md lg:col-span-2">
            <h2 className="text-xl font-bold text-gray-900 mb-4">환경 정보</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-700 mb-2">서버 정보</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>호스트: {process.env.NEXT_PUBLIC_API_URL || 'localhost:8000'}</div>
                  <div>프로토콜: HTTP</div>
                  <div>리로드 모드: 활성화</div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-700 mb-2">데이터베이스</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>타입: PostgreSQL (Supabase)</div>
                  <div>PostGIS: 활성화</div>
                  <div>연결 풀: 정상</div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-700 mb-2">인증</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>JWT: 활성화</div>
                  <div>소셜 로그인: 카카오</div>
                  <div>RBAC: 3단계 권한</div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-700 mb-2">보안</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>CORS: 환경별 설정</div>
                  <div>로깅: 구조화된 JSON</div>
                  <div>에러 트래킹: Sentry 준비</div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-700 mb-2">프론트엔드</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>Next.js: 15.3.5</div>
                  <div>Turbopack: 활성화</div>
                  <div>호스트: 0.0.0.0:3000</div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-700 mb-2">지도 서비스</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>카카오맵: 통합됨</div>
                  <div>위치 정보: PostGIS</div>
                  <div>주소 검색: 활성화</div>
                </div>
              </div>
            </div>
          </div>

          {/* 백업 및 복원 */}
          <div className="bg-white p-6 rounded-lg shadow-md lg:col-span-2">
            <h2 className="text-xl font-bold text-gray-900 mb-4">백업 및 복원</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-3">데이터 백업</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-800">마지막 백업</span>
                      <span className="text-xs text-blue-600">2025-07-05 12:00</span>
                    </div>
                  </div>
                  <button className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    수동 백업 실행
                  </button>
                  <div className="text-xs text-gray-500">
                    * 자동 백업은 매일 오전 3시에 실행됩니다
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">시스템 모니터링</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 bg-green-50 rounded text-center">
                      <div className="text-green-800 font-medium">CPU</div>
                      <div className="text-green-600">12%</div>
                    </div>
                    <div className="p-2 bg-green-50 rounded text-center">
                      <div className="text-green-800 font-medium">메모리</div>
                      <div className="text-green-600">45%</div>
                    </div>
                  </div>
                  <button className="w-full p-2 bg-green-500 text-white rounded hover:bg-green-600">
                    상세 모니터링 보기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminSettingsPageWrapper() {
  const router = useRouter();
  const { isAdmin, adminInfo } = useAdmin();

  useEffect(() => {
    // adminInfo가 로드되었는데 관리자가 아니면 홈으로 리다이렉트
    if (adminInfo && !isAdmin()) {
      router.push('/');
    }
  }, [adminInfo, isAdmin, router]);

  // adminInfo 로딩 중이거나 없으면 로딩 표시
  if (!adminInfo) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin()) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">접근 권한이 없습니다</h1>
          <p className="text-gray-600 mb-4">관리자 권한이 필요한 페이지입니다.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return <AdminSettingsPage />;
}