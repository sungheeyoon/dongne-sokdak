'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '../../hooks/useAdmin';
import SimpleCharts from './SimpleCharts';

interface StatsCardProps {
  title: string;
  value: number;
  icon: string;
  color: string;
  onClick?: () => void;
  clickable?: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color, onClick, clickable = false }) => (
  <div 
    className={`bg-white p-6 rounded-lg shadow-md border-l-4 ${color} ${clickable ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
    onClick={clickable ? onClick : undefined}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
      </div>
      <div className="text-3xl">{icon}</div>
    </div>
  </div>
);

export default function AdminDashboard() {
  const router = useRouter();
  const { adminStats, adminInfo, fetchAdminStats, loading, error, isAdmin } = useAdmin();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (isAdmin()) {
      fetchAdminStats();
    }
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAdminStats();
    setIsRefreshing(false);
  };

  const handleNavigateToReports = () => {
    router.push('/admin/reports');
  };

  const handleNavigateToUsers = () => {
    router.push('/admin/users');
  };

  const handleNavigateToLogs = () => {
    router.push('/admin/logs');
  };

  const handleSystemSettings = () => {
    router.push('/admin/settings');
  };

  if (loading && !adminStats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">대시보드를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">오류가 발생했습니다</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">관리자 대시보드</h1>
            <p className="text-gray-600 mt-1">
              {adminInfo?.nickname}님, 환영합니다! ({adminInfo?.role === 'admin' ? '최고관리자' : '중간관리자'})
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isRefreshing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isRefreshing ? '새로고침 중...' : '새로고침'}
          </button>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="전체 사용자"
            value={adminStats?.total_users || 0}
            icon="👥"
            color="border-blue-500"
            clickable={true}
            onClick={handleNavigateToUsers}
          />
          <StatsCard
            title="활성 사용자"
            value={adminStats?.active_users || 0}
            icon="✅"
            color="border-green-500"
            clickable={true}
            onClick={handleNavigateToUsers}
          />
          <StatsCard
            title="관리자"
            value={adminStats?.admin_count || 0}
            icon="👑"
            color="border-purple-500"
            clickable={true}
            onClick={handleNavigateToUsers}
          />
          <StatsCard
            title="중간관리자"
            value={adminStats?.moderator_count || 0}
            icon="🛡️"
            color="border-yellow-500"
            clickable={true}
            onClick={handleNavigateToUsers}
          />
        </div>

        {/* 오늘의 통계 */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">오늘의 활동</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div 
              className="text-center cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
              onClick={handleNavigateToUsers}
            >
              <div className="text-2xl mb-2">🆕</div>
              <p className="text-sm text-gray-600">신규 가입</p>
              <p className="text-xl font-bold text-blue-600">{adminStats?.today_users || 0}</p>
            </div>
            <div 
              className="text-center cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
              onClick={handleNavigateToUsers}
            >
              <div className="text-2xl mb-2">🔄</div>
              <p className="text-sm text-gray-600">최근 로그인</p>
              <p className="text-xl font-bold text-green-600">{adminStats?.recent_logins || 0}</p>
            </div>
            <div 
              className="text-center cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
              onClick={handleNavigateToReports}
            >
              <div className="text-2xl mb-2">📝</div>
              <p className="text-sm text-gray-600">제보 접수</p>
              <p className="text-xl font-bold text-red-600">{adminStats?.today_reports || 0}</p>
            </div>
            <div className="text-center p-3">
              <div className="text-2xl mb-2">💬</div>
              <p className="text-sm text-gray-600">댓글 작성</p>
              <p className="text-xl font-bold text-purple-600">{adminStats?.today_comments || 0}</p>
            </div>
            <div className="text-center p-3">
              <div className="text-2xl mb-2">👍</div>
              <p className="text-sm text-gray-600">투표 참여</p>
              <p className="text-xl font-bold text-orange-600">{adminStats?.today_votes || 0}</p>
            </div>
            <div 
              className="text-center cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
              onClick={handleNavigateToLogs}
            >
              <div className="text-2xl mb-2">⚡</div>
              <p className="text-sm text-gray-600">관리자 활동</p>
              <p className="text-xl font-bold text-indigo-600">{adminStats?.today_admin_actions || 0}</p>
            </div>
          </div>
        </div>

        {/* 제보 관리 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">제보 관리</h2>
            <div className="space-y-3">
              <div 
                className="flex justify-between items-center cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                onClick={handleNavigateToReports}
              >
                <span className="text-gray-600">미처리 제보</span>
                <span className="font-bold text-red-600">{adminStats?.open_reports || 0}</span>
              </div>
              <div 
                className="flex justify-between items-center cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                onClick={handleNavigateToReports}
              >
                <span className="text-gray-600">처리 완료</span>
                <span className="font-bold text-green-600">{adminStats?.resolved_reports || 0}</span>
              </div>
              <div className="pt-3 border-t">
                <button 
                  onClick={handleNavigateToReports}
                  className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600 transition-colors"
                >
                  제보 관리하기
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">빠른 작업</h2>
            <div className="space-y-3">
              <button 
                onClick={handleNavigateToUsers}
                className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors"
              >
                사용자 관리
              </button>
              <button 
                onClick={handleNavigateToLogs}
                className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 transition-colors"
              >
                활동 로그 보기
              </button>
              <button 
                onClick={handleSystemSettings}
                className="w-full bg-purple-500 text-white py-2 rounded hover:bg-purple-600 transition-colors"
              >
                시스템 설정
              </button>
            </div>
          </div>
        </div>

        {/* 차트 및 시각화 섹션 */}
        {adminStats && (
          <div className="mt-8">
            <SimpleCharts stats={adminStats} onRefresh={handleRefresh} />
          </div>
        )}
      </div>
    </div>
  );
}