'use client';

import { useState } from 'react';
import { AdminStats } from '../../features/admin/presentation/hooks/useAdminViewModel';

interface SimpleChartsProps {
  stats: AdminStats;
  onRefresh: () => void;
}

export default function SimpleCharts({ stats, onRefresh }: SimpleChartsProps) {
  // 일주일간 더미 데이터
  const [weeklyData] = useState(() => {
    const days = [];
    const users = [];
    const reports = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }));
      
      // 더미 데이터 생성
      users.push(Math.floor(Math.random() * 10) + Math.max(stats.todayUsers, 1));
      reports.push(Math.floor(Math.random() * 5) + Math.max(stats.todayReports, 1));
    }
    
    return { days, users, reports };
  });

  const maxUsers = Math.max(...weeklyData.users);
  const maxReports = Math.max(...weeklyData.reports);

  // 제보 상태 데이터
  const reportData = [
    { label: '미처리', value: stats.openReports, color: 'bg-red-500' },
    { label: '완료', value: stats.resolvedReports, color: 'bg-green-500' },
  ];
  const totalReports = reportData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-6">
      {/* 차트 헤더 */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">통계 차트</h2>
        <button
          onClick={onRefresh}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          🔄 새로고침
        </button>
      </div>

      {/* 차트 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 사용자 증가 추이 - 간단한 바 차트 */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">사용자 증가 추이</h3>
          <div className="h-64">
            <div className="flex items-end justify-between h-full space-x-2 pt-4">
              {weeklyData.days.map((day, index) => {
                const height = (weeklyData.users[index] / maxUsers) * 100;
                return (
                  <div key={day} className="flex-1 flex flex-col items-center">
                    <div
                      className="bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600 min-h-[4px] w-full"
                      style={{ height: `${Math.max(height, 5)}%` }}
                      title={`${day}: ${weeklyData.users[index]}명`}
                    ></div>
                    <div className="text-xs text-gray-600 mt-2 transform -rotate-45 origin-center">
                      {day}
                    </div>
                    <div className="text-xs font-medium text-blue-600 mt-1">
                      {weeklyData.users[index]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-3 text-sm text-gray-600">
            최근 7일간 신규 사용자 등록 현황
          </div>
        </div>

        {/* 제보 처리 현황 - 도넛 차트 */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">제보 처리 현황</h3>
          <div className="h-64 flex items-center justify-center">
            <div className="relative w-48 h-48">
              {/* 원형 진행률 */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                />
                {reportData.map((item, index) => {
                  const percentage = totalReports > 0 ? (item.value / totalReports) * 100 : 0;
                  const circumference = 2 * Math.PI * 40;
                  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
                  const rotation = index === 0 ? 0 : (reportData[0].value / totalReports) * 360;
                  
                  return (
                    <circle
                      key={item.label}
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke={item.label === '미처리' ? '#ef4444' : '#10b981'}
                      strokeWidth="8"
                      strokeDasharray={strokeDasharray}
                      strokeLinecap="round"
                      style={{
                        transform: `rotate(${rotation}deg)`,
                        transformOrigin: '50% 50%',
                      }}
                    />
                  );
                })}
              </svg>
              
              {/* 중앙 텍스트 */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-bold text-gray-900">{totalReports}</div>
                <div className="text-sm text-gray-600">총 제보</div>
              </div>
            </div>
          </div>
          
          {/* 범례 */}
          <div className="flex justify-center space-x-4 mt-4">
            {reportData.map((item) => (
              <div key={item.label} className="flex items-center">
                <div className={`w-3 h-3 rounded-full ${item.color} mr-2`}></div>
                <span className="text-sm text-gray-600">
                  {item.label} ({item.value})
                </span>
              </div>
            ))}
          </div>
          
          <div className="mt-3 text-sm text-gray-600 text-center">
            전체 제보 중 처리 상태별 분포
          </div>
        </div>

        {/* 일별 활동 통계 - 다중 바 차트 */}
        <div className="bg-white p-6 rounded-lg shadow-md lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">일별 활동 통계</h3>
          <div className="h-64">
            <div className="flex items-end justify-between h-full space-x-1 pt-4">
              {weeklyData.days.map((day, index) => {
                const reportHeight = (weeklyData.reports[index] / maxReports) * 100;
                const commentHeight = (Math.floor(Math.random() * 8) + 2) / 10 * 100;
                const voteHeight = (Math.floor(Math.random() * 12) + 3) / 15 * 100;
                
                return (
                  <div key={day} className="flex-1 flex flex-col items-center">
                    <div className="flex items-end justify-center space-x-1 h-full w-full">
                      <div
                        className="bg-red-500 rounded-t w-1/3"
                        style={{ height: `${Math.max(reportHeight, 5)}%` }}
                        title={`제보: ${weeklyData.reports[index]}`}
                      ></div>
                      <div
                        className="bg-purple-500 rounded-t w-1/3"
                        style={{ height: `${Math.max(commentHeight, 5)}%` }}
                        title={`댓글: ${Math.floor(commentHeight / 10)}`}
                      ></div>
                      <div
                        className="bg-yellow-500 rounded-t w-1/3"
                        style={{ height: `${Math.max(voteHeight, 5)}%` }}
                        title={`투표: ${Math.floor(voteHeight / 7)}`}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-600 mt-2 transform -rotate-45 origin-center">
                      {day}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* 범례 */}
          <div className="flex justify-center space-x-6 mt-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
              <span className="text-sm text-gray-600">제보</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-purple-500 rounded mr-2"></div>
              <span className="text-sm text-gray-600">댓글</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded mr-2"></div>
              <span className="text-sm text-gray-600">투표</span>
            </div>
          </div>
          
          <div className="mt-3 text-sm text-gray-600 text-center">
            최근 7일간 제보, 댓글, 투표 활동 현황
          </div>
        </div>
      </div>

      {/* 실시간 지표 */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">실시간 지표</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {((stats.activeUsers / Math.max(stats.totalUsers, 1)) * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-blue-700">활성 사용자 비율</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {totalReports > 0 
                ? ((stats.resolvedReports / totalReports) * 100).toFixed(1)
                : 0}%
            </div>
            <div className="text-sm text-green-700">제보 해결률</div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {stats.todayComments + stats.todayVotes}
            </div>
            <div className="text-sm text-purple-700">오늘 상호작용</div>
          </div>
          
          <div className="text-center p-4 bg-indigo-50 rounded-lg">
            <div className="text-2xl font-bold text-indigo-600">
              {stats.todayAdminActions}
            </div>
            <div className="text-sm text-indigo-700">관리자 활동</div>
          </div>
        </div>
      </div>

      {/* 성과 요약 */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 rounded-lg text-white">
        <h3 className="text-lg font-semibold mb-4">📊 오늘의 성과 요약</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-3xl font-bold">{stats.todayUsers}</div>
            <div className="text-sm opacity-90">신규 사용자</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{stats.todayReports}</div>
            <div className="text-sm opacity-90">새 제보</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{stats.todayAdminActions}</div>
            <div className="text-sm opacity-90">관리 작업</div>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-white bg-opacity-10 rounded-lg">
          <div className="text-sm">
            💡 <strong>관리 팁:</strong> 
            {stats.openReports > 10 
              ? " 미처리 제보가 많습니다. 우선순위를 정해 처리해보세요."
              : stats.todayReports > 5 
              ? " 오늘 제보가 활발합니다. 빠른 응답을 유지해주세요."
              : " 안정적으로 운영되고 있습니다. 좋은 상태를 유지하세요!"}
          </div>
        </div>
      </div>
    </div>
  );
}