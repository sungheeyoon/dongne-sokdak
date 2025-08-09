'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '../../hooks/useAdmin';
import SimpleCharts from './SimpleCharts';
import { 
  Users, UserCheck, Crown, Shield, UserPlus, RotateCcw, 
  FileText, MessageCircle, ThumbsUp, Zap, AlertTriangle, 
  CheckCircle, RefreshCw, Settings, Activity, Home 
} from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  bgColor: string;
  iconColor: string;
  onClick?: () => void;
  clickable?: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, bgColor, iconColor, onClick, clickable = false }) => (
  <div 
    className={`${bgColor} rounded-xl p-6 shadow-sm border transition-all duration-200 ${
      clickable ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-opacity-50' : ''
    }`}
    onClick={clickable ? onClick : undefined}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
        <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
      </div>
      <div className={`w-14 h-14 ${iconColor} rounded-full flex items-center justify-center`}>
        {icon}
      </div>
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
            <h1 className="text-4xl font-bold text-gray-900 flex items-center">
              <Home className="w-8 h-8 mr-4 text-blue-600" />
              관리자 대시보드
            </h1>
            <p className="text-gray-600 mt-2 ml-12">
              {adminInfo?.nickname}님, 환영합니다! 
              <span className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${
                adminInfo?.role === 'admin' 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {adminInfo?.role === 'admin' ? '최고관리자' : '중간관리자'}
              </span>
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center ${
              isRefreshing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 hover:scale-105'
            }`}
          >
            <RefreshCw className={`w-5 h-5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? '새로고침 중...' : '새로고침'}
          </button>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="전체 사용자"
            value={adminStats?.total_users || 0}
            icon={<Users className="w-7 h-7 text-white" />}
            bgColor="bg-gradient-to-br from-blue-50 to-blue-100"
            iconColor="bg-blue-500"
            clickable={true}
            onClick={handleNavigateToUsers}
          />
          <StatsCard
            title="활성 사용자"
            value={adminStats?.active_users || 0}
            icon={<UserCheck className="w-7 h-7 text-white" />}
            bgColor="bg-gradient-to-br from-emerald-50 to-emerald-100"
            iconColor="bg-emerald-500"
            clickable={true}
            onClick={handleNavigateToUsers}
          />
          <StatsCard
            title="관리자"
            value={adminStats?.admin_count || 0}
            icon={<Crown className="w-7 h-7 text-white" />}
            bgColor="bg-gradient-to-br from-purple-50 to-purple-100"
            iconColor="bg-purple-500"
            clickable={true}
            onClick={handleNavigateToUsers}
          />
          <StatsCard
            title="중간관리자"
            value={adminStats?.moderator_count || 0}
            icon={<Shield className="w-7 h-7 text-white" />}
            bgColor="bg-gradient-to-br from-amber-50 to-amber-100"
            iconColor="bg-amber-500"
            clickable={true}
            onClick={handleNavigateToUsers}
          />
        </div>

        {/* 오늘의 통계 */}
        <div className="bg-white rounded-xl p-8 shadow-sm border mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Activity className="w-6 h-6 mr-3 text-blue-600" />
            오늘의 활동
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
            <div 
              className="text-center cursor-pointer hover:bg-blue-50 p-4 rounded-xl transition-all duration-200 hover:scale-105"
              onClick={handleNavigateToUsers}
            >
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <UserPlus className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">신규 가입</p>
              <p className="text-2xl font-bold text-blue-600">{adminStats?.today_users || 0}</p>
            </div>
            <div 
              className="text-center cursor-pointer hover:bg-emerald-50 p-4 rounded-xl transition-all duration-200 hover:scale-105"
              onClick={handleNavigateToUsers}
            >
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <RotateCcw className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">최근 로그인</p>
              <p className="text-2xl font-bold text-emerald-600">{adminStats?.recent_logins || 0}</p>
            </div>
            <div 
              className="text-center cursor-pointer hover:bg-red-50 p-4 rounded-xl transition-all duration-200 hover:scale-105"
              onClick={handleNavigateToReports}
            >
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-red-600" />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">제보 접수</p>
              <p className="text-2xl font-bold text-red-600">{adminStats?.today_reports || 0}</p>
            </div>
            <div className="text-center p-4 hover:bg-purple-50 rounded-xl transition-all duration-200">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="w-6 h-6 text-purple-600" />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">댓글 작성</p>
              <p className="text-2xl font-bold text-purple-600">{adminStats?.today_comments || 0}</p>
            </div>
            <div className="text-center p-4 hover:bg-orange-50 rounded-xl transition-all duration-200">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <ThumbsUp className="w-6 h-6 text-orange-600" />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">투표 참여</p>
              <p className="text-2xl font-bold text-orange-600">{adminStats?.today_votes || 0}</p>
            </div>
            <div 
              className="text-center cursor-pointer hover:bg-indigo-50 p-4 rounded-xl transition-all duration-200 hover:scale-105"
              onClick={handleNavigateToLogs}
            >
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Zap className="w-6 h-6 text-indigo-600" />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">관리자 활동</p>
              <p className="text-2xl font-bold text-indigo-600">{adminStats?.today_admin_actions || 0}</p>
            </div>
          </div>
        </div>

        {/* 제보 관리 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <FileText className="w-5 h-5 mr-3 text-red-600" />
              제보 관리
            </h2>
            <div className="space-y-4">
              <div 
                className="flex justify-between items-center cursor-pointer hover:bg-red-50 p-4 rounded-lg transition-all duration-200"
                onClick={handleNavigateToReports}
              >
                <div className="flex items-center">
                  <AlertTriangle className="w-5 h-5 text-red-500 mr-3" />
                  <span className="font-medium text-gray-700">미처리 제보</span>
                </div>
                <span className="font-bold text-red-600 text-xl">{adminStats?.open_reports || 0}</span>
              </div>
              <div 
                className="flex justify-between items-center cursor-pointer hover:bg-emerald-50 p-4 rounded-lg transition-all duration-200"
                onClick={handleNavigateToReports}
              >
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mr-3" />
                  <span className="font-medium text-gray-700">처리 완료</span>
                </div>
                <span className="font-bold text-emerald-600 text-xl">{adminStats?.resolved_reports || 0}</span>
              </div>
              <div className="pt-4 border-t">
                <button 
                  onClick={handleNavigateToReports}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-3 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium flex items-center justify-center"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  제보 관리하기
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <Zap className="w-5 h-5 mr-3 text-blue-600" />
              빠른 작업
            </h2>
            <div className="space-y-3">
              <button 
                onClick={handleNavigateToUsers}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium flex items-center justify-center"
              >
                <Users className="w-5 h-5 mr-2" />
                사용자 관리
              </button>
              <button 
                onClick={handleNavigateToLogs}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-3 rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 font-medium flex items-center justify-center"
              >
                <Activity className="w-5 h-5 mr-2" />
                활동 로그 보기
              </button>
              <button 
                onClick={handleSystemSettings}
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 font-medium flex items-center justify-center"
              >
                <Settings className="w-5 h-5 mr-2" />
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