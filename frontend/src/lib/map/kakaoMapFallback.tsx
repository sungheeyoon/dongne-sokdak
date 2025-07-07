'use client'

import { useEffect, useState } from 'react'

// 카카오맵 대신 사용할 수 있는 임시 지도 컴포넌트
export default function KakaoMapFallback({ 
  reports, 
  height = '400px',
  center,
  onLocationSelect,
  onBoundsChange,
  showRegionSearchButton = true,
  onRegionSearch,
  isSearching = false
}: any) {
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    // 간단한 지도 대체재 구현
    setMapReady(true)
  }, [])

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onLocationSelect) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // 대략적인 좌표 계산 (서울 기준)
    const lat = 37.5665 + (rect.height / 2 - y) * 0.001
    const lng = 126.9780 + (x - rect.width / 2) * 0.001
    
    onLocationSelect({ lat, lng, address: '임시 주소' })
  }

  if (!mapReady) {
    return (
      <div style={{ height }} className="rounded-lg overflow-hidden border-2 border-gray-200 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-700 text-base font-medium mb-1">🗺️ 지도를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative" style={{ height }}>
      <div 
        style={{ height }} 
        className="rounded-lg overflow-hidden border-2 border-gray-200 bg-green-50 flex items-center justify-center cursor-pointer"
        onClick={handleMapClick}
      >
        <div className="text-center p-8">
          <div className="text-4xl mb-4">🗺️</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            임시 지도 (개발용)
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            카카오맵 API 키 도메인 제한으로 인해 임시 지도를 표시합니다.
          </p>
          <p className="text-blue-600 text-sm">
            📍 클릭하여 위치를 선택할 수 있습니다
          </p>
          
          {/* 마커 표시 */}
          <div className="mt-6 grid grid-cols-3 gap-4 text-xs">
            {reports.slice(0, 6).map((report: any, index: number) => (
              <div key={report.id} className="bg-white p-2 rounded border">
                <div className="text-blue-600 font-medium">📍 제보 {index + 1}</div>
                <div className="text-gray-600 truncate">{report.title}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 재검색 버튼 */}
      {showRegionSearchButton && (
        <div className="absolute top-2 md:top-4 left-1/2 transform -translate-x-1/2 z-10">
          <button
            onClick={onRegionSearch}
            disabled={isSearching}
            className={`px-3 md:px-4 py-2 rounded-lg font-medium shadow-lg transition-all flex items-center space-x-1 md:space-x-2 text-sm touch-manipulation ${
              isSearching 
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-xl active:scale-95'
            }`}
          >
            {isSearching ? (
              <>
                <div className="animate-spin rounded-full h-3 md:h-4 w-3 md:w-4 border-b-2 border-white"></div>
                <span className="hidden md:inline">검색 중...</span>
                <span className="md:hidden">검색중</span>
              </>
            ) : (
              <>
                <svg className="w-3 md:w-4 h-3 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden md:inline">이 지역 재검색</span>
                <span className="md:hidden">재검색</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 안내 메시지 */}
      <div className="absolute bottom-2 md:bottom-4 right-2 md:right-4 bg-yellow-100 border border-yellow-300 rounded-lg p-2 md:p-3 text-xs max-w-xs">
        <div className="font-medium mb-1 text-yellow-800">⚠️ 개발 모드</div>
        <div className="text-yellow-700">
          localhost:3000으로 접속하면 실제 카카오맵을 사용할 수 있습니다.
        </div>
      </div>
    </div>
  )
}