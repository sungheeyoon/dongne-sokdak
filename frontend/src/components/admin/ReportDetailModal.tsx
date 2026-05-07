'use client';

import { useState, useEffect } from 'react';
import { useReportManagementViewModel } from '@/features/admin/presentation/hooks/useReportManagementViewModel';
import { ReportDetail } from '@/features/admin/domain/entities';
import MarkerIcon from '@/shared/ui/MarkerIcon';
import { formatToAdministrativeAddress } from '@/lib/utils/addressUtils';

interface ReportDetailModalProps {
  reportId: string;
  isOpen: boolean;
  onClose: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'OPEN': return 'bg-red-100 text-red-800';
    case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
    case 'RESOLVED': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'OPEN': return '접수됨';
    case 'IN_PROGRESS': return '처리중';
    case 'RESOLVED': return '해결됨';
    default: return status;
  }
};

const getCategoryLabel = (category: string) => {
  switch (category) {
    case 'NOISE': return '소음';
    case 'TRASH': return '쓰레기';
    case 'FACILITY': return '시설';
    case 'TRAFFIC': return '교통';
    case 'OTHER': return '기타';
    default: return category;
  }
};

export default function ReportDetailModal({ reportId, isOpen, onClose }: ReportDetailModalProps) {
  const { fetchReportDetail, updateReportStatus, loading, error } = useReportManagementViewModel();
  const [reportDetail, setReportDetail] = useState<ReportDetail | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [adminComment, setAdminComment] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (isOpen && reportId) {
      loadReportDetail();
    }
  }, [isOpen, reportId]);

  const loadReportDetail = async () => {
    try {
      const detail = await fetchReportDetail(reportId);
      setReportDetail(detail);
      setNewStatus(detail.status);
      setAdminComment(detail.adminComment || '');
    } catch (error) {
      console.error('Failed to load report detail:', error);
    }
  };

  const handleStatusUpdate = async () => {
    if (!reportDetail || newStatus === reportDetail.status) return;
    
    try {
      setIsUpdating(true);
      await updateReportStatus(reportId, newStatus, adminComment);
      await loadReportDetail(); // 새로고침
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {loading && !reportDetail ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-red-800">{error}</div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                닫기
              </button>
            </div>
          </div>
        ) : reportDetail ? (
          <div className="p-6">
            {/* 헤더 */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{reportDetail.title}</h2>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(reportDetail.status)}`}>
                    {getStatusLabel(reportDetail.status)}
                  </span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                    {getCategoryLabel(reportDetail.category)}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  제보자: {reportDetail.userNickname} ({reportDetail.userEmail})
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 왼쪽 섹션 - 기본 정보 */}
              <div className="space-y-6">
                {/* 제보 내용 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">제보 내용</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">{reportDetail.description}</p>
                  </div>
                </div>

                {/* 이미지 */}
                {reportDetail.imageUrl && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">첨부 이미지</h3>
                    <div className="relative">
                      <img
                        src={reportDetail.imageUrl}
                        alt="제보 이미지"
                        className="w-full h-64 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setShowImageModal(true)}
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black bg-opacity-50 rounded-lg transition-opacity">
                        <span className="text-white text-sm font-medium">클릭하여 확대</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 위치 정보 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">위치 정보</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 mb-2 flex items-center">
                      <MarkerIcon category={reportDetail.category} className="w-4 h-5 mr-2" />
                      {formatToAdministrativeAddress(reportDetail.address || '')}
                    </p>
                    {reportDetail.location && (
                      <div className="h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                        <div className="text-center text-gray-600">
                          <div className="text-lg mb-2">🗺️</div>
                          <div className="text-sm">
                            위도: {reportDetail.location.lat.toFixed(6)}<br />
                            경도: {reportDetail.location.lng.toFixed(6)}
                          </div>
                          <div className="text-xs mt-2 text-gray-500">
                            카카오맵 연동 준비중
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 통계 정보 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">통계 정보</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600">{reportDetail.votesCount}</div>
                      <div className="text-sm text-blue-700">투표</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600">{reportDetail.commentsCount}</div>
                      <div className="text-sm text-green-700">댓글</div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-purple-600">{reportDetail.viewCount}</div>
                      <div className="text-sm text-purple-700">조회</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 오른쪽 섹션 - 관리 도구 */}
              <div className="space-y-6">
                {/* 상태 관리 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">상태 관리</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        상태 변경
                      </label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="OPEN">접수됨</option>
                        <option value="IN_PROGRESS">처리중</option>
                        <option value="RESOLVED">해결됨</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        관리자 코멘트
                      </label>
                      <textarea
                        value={adminComment}
                        onChange={(e) => setAdminComment(e.target.value)}
                        rows={3}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="처리 내용이나 코멘트를 입력하세요..."
                      />
                    </div>

                    <button
                      onClick={handleStatusUpdate}
                      disabled={isUpdating || newStatus === reportDetail.status}
                      className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                        newStatus !== reportDetail.status && !isUpdating
                          ? 'bg-blue-500 text-white hover:bg-blue-600'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {isUpdating ? '업데이트 중...' : '상태 업데이트'}
                    </button>
                  </div>
                </div>

                {/* 최근 댓글 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">최근 댓글</h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {reportDetail.recentComments && reportDetail.recentComments.length > 0 ? (
                      reportDetail.recentComments.map((comment) => (
                        <div key={comment.id} className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-medium text-gray-900">{comment.userNickname}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm">{comment.content}</p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        아직 댓글이 없습니다
                      </div>
                    )}
                  </div>
                </div>

                {/* 기본 정보 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">기본 정보</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">제보 ID:</span>
                      <span className="font-mono text-gray-900">{reportDetail.id.slice(0, 8)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">생성일:</span>
                      <span className="text-gray-900">{new Date(reportDetail.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">수정일:</span>
                      <span className="text-gray-900">{new Date(reportDetail.updatedAt).toLocaleString()}</span>
                    </div>
                    {reportDetail.assignedAdminNickname && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">담당자:</span>
                        <span className="text-gray-900">{reportDetail.assignedAdminNickname}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 하단 버튼 */}
            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* 이미지 확대 모달 */}
      {showImageModal && reportDetail?.imageUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-60">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 text-white text-2xl font-bold bg-black bg-opacity-50 w-10 h-10 rounded-full hover:bg-opacity-75 transition-colors"
            >
              ×
            </button>
            <img
              src={reportDetail.imageUrl}
              alt="제보 이미지 확대"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}