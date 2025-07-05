'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { Map, MapMarker, MapInfoWindow, MarkerClusterer } from 'react-kakao-maps-sdk'
import { Report } from '@/types'
import { checkKakaoMapStatus, waitForKakaoMaps, analyzeKakaoMapError } from '@/lib/map/kakaoMapUtils'
import { formatToAdministrativeAddress, isSameAdministrativeArea } from '@/lib/utils/addressUtils'
import dynamic from 'next/dynamic'

// Fallback 컴포넌트를 동적으로 로드
const KakaoMapFallback = dynamic(() => import('@/lib/map/kakaoMapFallback'), {
  ssr: false
})

// 카카오맵 로딩 확인
declare global {
  interface Window {
    kakao: any;
  }
}

interface GroupedReport {
  id: string
  reports: Report[]
  location: { lat: number; lng: number }
  address: string
  count: number
  primaryCategory: string
}

interface MapComponentProps {
  reports: Report[]
  center?: { lat: number; lng: number }
  zoom?: number
  height?: string
  onLocationSelect?: (location: { lat: number; lng: number; address?: string }) => void
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void
  showRegionSearchButton?: boolean
  onRegionSearch?: () => void
  isSearching?: boolean
}

export default function MapComponent({ 
  reports, 
  center = { lat: 37.5665, lng: 126.9780 }, // 서울시청 기본값
  zoom = 3, // 동네 단위에 적합한 줌 레벨 (3 = 약 1-2km 범위)
  height = '400px',
  onLocationSelect,
  onBoundsChange,
  showRegionSearchButton = true,
  onRegionSearch,
  isSearching = false
}: MapComponentProps) {
  // center prop이 null인 경우 기본값 사용
  const safeCenter = center && center.lat && center.lng ? center : { lat: 37.5665, lng: 126.9780 }
  const [map, setMap] = useState<any>(null)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<GroupedReport | null>(null)
  const [kakaoLoaded, setKakaoLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [currentBounds, setCurrentBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null)
  const [useKakaoFallback, setUseKakaoFallback] = useState(false)

  // 행정동 기준으로 제보들을 그룹핑
  const groupedReports = useMemo(() => {
    const groups: { [key: string]: GroupedReport } = {}
    
    reports.forEach(report => {
      // 행정동 기반 주소로 변환
      const adminAddress = formatToAdministrativeAddress(report.address || '')
      
      // 행정동 + 대략적인 좌표로 그룹핑 키 생성
      const lat = report.location.lat.toFixed(3) // 소수점 3자리로 근사치 그룹핑
      const lng = report.location.lng.toFixed(3)
      const groupKey = adminAddress !== '주소 없음' ? adminAddress : `${lat},${lng}`
      
      if (groups[groupKey]) {
        groups[groupKey].reports.push(report)
        groups[groupKey].count++
      } else {
        groups[groupKey] = {
          id: groupKey,
          reports: [report],
          location: report.location,
          address: adminAddress,
          count: 1,
          primaryCategory: report.category
        }
      }
    })
    
    return Object.values(groups)
  }, [reports])

  // 카카오맵 로딩 확인
  useEffect(() => {
    console.log('🗺️ MapComponent 마운트됨')
    
    // IP 주소로 접근하는지 확인
    const isIPAccess = typeof window !== 'undefined' && 
      (window.location.hostname.match(/^\d+\.\d+\.\d+\.\d+$/) || 
       window.location.hostname === '172.24.19.106')
    
    if (isIPAccess) {
      console.log('🔄 IP 주소 접근 감지, fallback 지도 사용')
      setUseKakaoFallback(true)
      return
    }
    
    checkKakaoMapStatus()
    
    const initializeKakaoMap = async () => {
      try {
        console.log('🔄 카카오맵 API 로딩 시작...')
        
        // API 키 확인
        const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY
        if (!apiKey) {
          console.log('🔄 API 키 없음, fallback 사용')
          setUseKakaoFallback(true)
          return
        }

        const isLoaded = await waitForKakaoMaps()
        if (isLoaded) {
          console.log('🎉 카카오맵 초기화 완료!')
          setKakaoLoaded(true)
        } else {
          console.error('❌ 카카오맵 로드 실패, fallback 사용')
          const issues = analyzeKakaoMapError()
          console.error('🔧 문제점들:', issues)
          
          // 일정 시간 후 fallback으로 전환
          setTimeout(() => {
            setUseKakaoFallback(true)
          }, 2000)
        }
      } catch (error) {
        console.error('❌ 카카오맵 초기화 중 예외 발생, fallback 사용:', error)
        setUseKakaoFallback(true)
      }
    }
    
    // 페이지 로드 후 약간의 지연을 두고 초기화
    const timer = setTimeout(initializeKakaoMap, 500)
    
    return () => clearTimeout(timer)
  }, [])

  // 사용자 현재 위치 가져오기
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          console.log('📍 사용자 현재 위치:', location)
        },
        (error) => {
          console.warn('위치 정보를 가져올 수 없습니다:', error)
        }
      )
    }
  }, [])

  // 맵 bounds 변경 핸들러
  const handleMapBoundsChange = () => {
    if (!map) return

    try {
      const bounds = map.getBounds()
      const swLatLng = bounds.getSouthWest()
      const neLatLng = bounds.getNorthEast()
      
      const newBounds = {
        south: swLatLng.getLat(),
        west: swLatLng.getLng(),
        north: neLatLng.getLat(),
        east: neLatLng.getLng()
      }
      
      setCurrentBounds(newBounds)
      
      // 부모 컴포넌트에 bounds 변경 알림
      if (onBoundsChange) {
        onBoundsChange(newBounds)
      }
    } catch (error) {
      console.error('맵 bounds 계산 오류:', error)
    }
  }

  // 맵 이동 완료 이벤트 등록
  useEffect(() => {
    if (!map) return

    // 맵 이동 완료 시 bounds 업데이트
    const handleDragEnd = () => {
      handleMapBoundsChange()
    }

    const handleZoomChanged = () => {
      handleMapBoundsChange()
    }

    // 카카오맵 이벤트 등록
    window.kakao.maps.event.addListener(map, 'dragend', handleDragEnd)
    window.kakao.maps.event.addListener(map, 'zoom_changed', handleZoomChanged)

    // 초기 bounds 설정
    setTimeout(handleMapBoundsChange, 500)

    return () => {
      // 이벤트 제거
      window.kakao.maps.event.removeListener(map, 'dragend', handleDragEnd)
      window.kakao.maps.event.removeListener(map, 'zoom_changed', handleZoomChanged)
    }
  }, [map, onBoundsChange])

  // 지도 클릭 이벤트 (제보 위치 선택용)
  const handleMapClick = async (event: any) => {
    if (!onLocationSelect) return

    const { latLng } = event
    const lat = latLng.getLat()
    const lng = latLng.getLng()

    // 선택된 마커/인포윈도우 닫기
    setSelectedReport(null)
    setSelectedGroup(null)

    // 역지오코딩으로 행정동 주소 가져오기
    const geocoder = new window.kakao.maps.services.Geocoder()
    
    geocoder.coord2Address(lng, lat, (result: any, status: any) => {
      let address = ''
      if (status === window.kakao.maps.services.Status.OK) {
        const addr = result[0]
        // 행정동 우선 표시
        if (addr.address && addr.address.region_3depth_name) {
          const gu = addr.address.region_2depth_name
          const dong = addr.address.region_3depth_name
          const guName = gu.includes('구') ? gu : `${gu}구`
          address = `${guName} ${dong}`
        } else {
          // 기본 주소 사용 후 행정동 형태로 변환
          const fullAddress = addr.road_address ? 
            addr.road_address.address_name : 
            addr.address.address_name
          address = formatToAdministrativeAddress(fullAddress)
        }
      }

      onLocationSelect({ lat, lng, address })
    })
  }

  // 마커 카테고리별 색상
  const getMarkerColor = (category: string) => {
    const colors = {
      NOISE: '#FF6B6B',
      TRASH: '#4ECDC4', 
      FACILITY: '#45B7D1',
      TRAFFIC: '#96CEB4',
      OTHER: '#FECA57'
    }
    return colors[category as keyof typeof colors] || colors.OTHER
  }

  // 개선된 마커 이미지 생성 (숫자 포함)
  const createGroupMarkerImage = (group: GroupedReport) => {
    const color = getMarkerColor(group.primaryCategory)
    const canvas = document.createElement('canvas')
    canvas.width = group.count > 1 ? 40 : 30
    canvas.height = group.count > 1 ? 40 : 35
    const ctx = canvas.getContext('2d')!
    
    if (group.count > 1) {
      // 여러 제보가 있는 경우 - 원형 마커에 숫자 표시
      const centerX = 20
      const centerY = 20
      const radius = 18
      
      // 외곽 테두리
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
      ctx.stroke()
      
      // 배경 원
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
      ctx.fill()
      
      // 숫자 텍스트
      ctx.fillStyle = 'white'
      ctx.font = 'bold 14px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(group.count.toString(), centerX, centerY)
    } else {
      // 단일 제보인 경우 - 기본 마커 모양
      const centerX = 15
      const markerY = 15
      
      // 마커 핀 모양
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(centerX, markerY, 12, 0, 2 * Math.PI)
      ctx.fill()
      
      // 하단 뾰족한 부분
      ctx.beginPath()
      ctx.moveTo(centerX, markerY + 8)
      ctx.lineTo(centerX - 5, markerY + 18)
      ctx.lineTo(centerX + 5, markerY + 18)
      ctx.closePath()
      ctx.fill()
      
      // 내부 점
      ctx.fillStyle = 'white'
      ctx.beginPath()
      ctx.arc(centerX, markerY, 4, 0, 2 * Math.PI)
      ctx.fill()
    }
    
    return {
      src: canvas.toDataURL(),
      size: { width: group.count > 1 ? 40 : 30, height: group.count > 1 ? 40 : 35 },
      options: { offset: { x: group.count > 1 ? 20 : 15, y: group.count > 1 ? 20 : 35 } }
    }
  }

  // 행정동 기반 주소 변환
  const getAdministrativeAddress = (report: Report): string => {
    return formatToAdministrativeAddress(report.address || '')
  }

  // 인포윈도우 닫기 핸들러
  const closeInfoWindow = () => {
    setSelectedReport(null)
    setSelectedGroup(null)
  }

  // 그룹 마커 클릭 핸들러
  const handleGroupMarkerClick = (group: GroupedReport) => {
    if (group.count === 1) {
      setSelectedReport(group.reports[0])
      setSelectedGroup(null)
    } else {
      setSelectedGroup(group)
      setSelectedReport(null)
    }
  }

  // 카카오맵 로딩 상태 확인
  if (mapError) {
    return (
      <div style={{ height }} className="rounded-lg overflow-hidden border-2 border-red-200 flex items-center justify-center bg-red-50">
        <div className="text-center p-4">
          <div className="text-red-600 text-3xl mb-3">🗺️</div>
          <p className="text-red-800 font-medium mb-2">지도 로드 실패</p>
          <p className="text-red-600 text-sm mb-4 max-w-xs">{mapError}</p>
          
          {/* 디버그 정보 */}
          <details className="text-left mb-4 max-w-sm">
            <summary className="text-xs text-red-700 cursor-pointer mb-2">디버그 정보 보기</summary>
            <div className="text-xs text-red-600 bg-red-100 p-2 rounded">
              <div>API 키 존재: {process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY ? '✅' : '❌'}</div>
              <div>브라우저: {typeof window !== 'undefined' ? '✅' : '❌'}</div>
              <div>스크립트 태그: {typeof window !== 'undefined' && document.querySelector('script[src*="dapi.kakao.com"]') ? '✅' : '❌'}</div>
              <div>카카오 객체: {typeof window !== 'undefined' && window.kakao ? '✅' : '❌'}</div>
              <div>Maps 객체: {typeof window !== 'undefined' && window.kakao?.maps ? '✅' : '❌'}</div>
            </div>
          </details>
          
          <div className="space-y-2">
            <button 
              onClick={() => {
                setMapError(null)
                setKakaoLoaded(false)
                setTimeout(() => window.location.reload(), 100)
              }}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium touch-manipulation"
            >
              페이지 새로고침
            </button>
            <div className="text-xs text-red-500">
              💡 계속 문제가 발생하면 브라우저 캐시를 삭제해보세요
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Fallback 지도 사용
  if (useKakaoFallback) {
    return (
      <KakaoMapFallback 
        reports={reports}
        height={height}
        center={safeCenter}
        onLocationSelect={onLocationSelect}
        onBoundsChange={onBoundsChange}
        showRegionSearchButton={showRegionSearchButton}
        onRegionSearch={onRegionSearch}
        isSearching={isSearching}
      />
    )
  }

  if (!kakaoLoaded) {
    return (
      <div style={{ height }} className="rounded-lg overflow-hidden border-2 border-gray-200 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-700 text-base font-medium mb-1">🗺️ 지도를 불러오는 중...</p>
          <p className="text-gray-500 text-sm">카카오맵 API 로딩 중</p>
          <div className="mt-3 text-xs text-gray-400">
            최대 15초 소요 | 문제 발생 시 대체 지도로 전환
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative" style={{ height }}>
      <div style={{ height }} className="rounded-lg overflow-hidden border-2 border-gray-200 touch-manipulation">
        <Map
          center={safeCenter}
          style={{ width: '100%', height: '100%' }}
          level={zoom}
          onCreate={setMap}
          onClick={handleMapClick}
        >
          {/* 그룹화된 마커들 */}
          {groupedReports.map((group) => (
            <MapMarker
              key={group.id}
              position={{ lat: group.location.lat, lng: group.location.lng }}
              onClick={() => handleGroupMarkerClick(group)}
              image={createGroupMarkerImage(group)}
            />
          ))}

          {/* 선택된 단일 제보 정보창 */}
          {selectedReport && (
            <MapInfoWindow
              position={{ 
                lat: selectedReport.location.lat, 
                lng: selectedReport.location.lng 
              }}
              onClose={closeInfoWindow}
            >
              <div className="p-3 md:p-4 max-w-xs md:max-w-sm bg-white rounded-lg shadow-sm border">
                <div className="flex items-center justify-between mb-2 md:mb-3">
                  <div className="flex items-center">
                    <span className="inline-block w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: getMarkerColor(selectedReport.category) }}></span>
                    <span className="text-xs text-gray-500 font-medium uppercase">
                      {selectedReport.category}
                    </span>
                  </div>
                  <button 
                    onClick={closeInfoWindow}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1 touch-manipulation"
                  >
                    ✕
                  </button>
                </div>
                
                <h4 className="font-semibold text-sm mb-2 line-clamp-2 text-gray-900">
                  {selectedReport.title}
                </h4>
                
                <p className="text-xs text-gray-600 mb-2 md:mb-3 line-clamp-3">
                  {selectedReport.description}
                </p>
                
                <div className="border-t pt-2">
                  <p className="text-xs text-gray-500 mb-2 flex items-center">
                    <span className="mr-1">📍</span>
                    <span className="truncate">{getAdministrativeAddress(selectedReport)}</span>
                  </p>
                  
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between text-xs text-gray-500 gap-1 md:gap-0">
                    <div className="flex items-center space-x-3">
                      <span className="flex items-center touch-manipulation">
                        <span className="mr-1">👍</span>
                        {selectedReport.voteCount || 0}
                      </span>
                      <span className="flex items-center touch-manipulation">
                        <span className="mr-1">💬</span>
                        {selectedReport.commentCount || 0}
                      </span>
                    </div>
                    <span>{new Date(selectedReport.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </MapInfoWindow>
          )}

          {/* 선택된 그룹 제보 리스트 */}
          {selectedGroup && (
            <MapInfoWindow
              position={{ 
                lat: selectedGroup.location.lat, 
                lng: selectedGroup.location.lng 
              }}
              onClose={closeInfoWindow}
            >
              <div className="p-3 md:p-4 max-w-sm md:max-w-md bg-white rounded-lg shadow-sm border">
                <div className="flex items-center justify-between mb-2 md:mb-3">
                  <div className="flex items-center">
                    <span className="inline-block w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: getMarkerColor(selectedGroup.primaryCategory) }}></span>
                    <h4 className="font-semibold text-sm text-gray-900">
                      이 지역 제보 {selectedGroup.count}개
                    </h4>
                  </div>
                  <button 
                    onClick={closeInfoWindow}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1 touch-manipulation"
                  >
                    ✕
                  </button>
                </div>
                
                <p className="text-xs text-gray-500 mb-2 md:mb-3 flex items-center">
                  <span className="mr-1">📍</span>
                  <span className="truncate">{getAdministrativeAddress(selectedGroup.reports[0])}</span>
                </p>
                
                <div className="border-t pt-2 md:pt-3">
                  <div className="space-y-2 md:space-y-3 max-h-48 md:max-h-60 overflow-y-auto">
                    {selectedGroup.reports.map((report, index) => (
                      <div key={report.id} className={`pb-2 md:pb-3 ${index < selectedGroup.reports.length - 1 ? 'border-b border-gray-100' : ''}`}>
                        <div className="flex items-start space-x-2 md:space-x-3">
                          <span className="inline-block w-2 h-2 rounded-full mt-2 flex-shrink-0" 
                                style={{ backgroundColor: getMarkerColor(report.category) }}></span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center mb-1">
                              <span className="text-xs text-gray-500 uppercase mr-2">{report.category}</span>
                            </div>
                            <h5 className="text-xs font-medium line-clamp-2 mb-1 md:mb-2 text-gray-900">
                              {report.title}
                            </h5>
                            <p className="text-xs text-gray-600 line-clamp-2 mb-1 md:mb-2">
                              {report.description}
                            </p>
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between text-xs text-gray-400 gap-1 md:gap-0">
                              <div className="flex items-center space-x-2">
                                <span className="touch-manipulation">👍 {report.voteCount || 0}</span>
                                <span className="touch-manipulation">💬 {report.commentCount || 0}</span>
                              </div>
                              <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </MapInfoWindow>
          )}
        </Map>
      </div>

      {/* 개선된 이 지역 재검색 버튼 - 모바일 최적화 */}
      {showRegionSearchButton && currentBounds && (
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

      {/* 범례 - 모바일 최적화 */}
      <div className="absolute bottom-2 md:bottom-4 right-2 md:right-4 bg-white rounded-lg shadow-lg p-2 md:p-3 text-xs">
        <div className="font-medium mb-1 md:mb-2 text-xs md:text-sm">🗺️ 범례</div>
        <div className="space-y-1">
          <div className="flex items-center">
            <div className="w-3 md:w-4 h-3 md:h-4 rounded-full bg-blue-500 mr-1 md:mr-2 flex items-center justify-center text-white text-xs">1</div>
            <span className="text-xs">단일 제보</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 md:w-4 h-3 md:h-4 rounded-full bg-red-500 mr-1 md:mr-2 flex items-center justify-center text-white text-xs">N</div>
            <span className="text-xs hidden md:inline">다중 제보 (클릭하면 목록 표시)</span>
            <span className="text-xs md:hidden">다중 제보</span>
          </div>
        </div>
      </div>
    </div>
  )
}