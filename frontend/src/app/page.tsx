'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Header from '@/components/Header'
import ReportCard from '@/components/ReportCard'
import AuthModal from '@/components/AuthModal'
import ReportModal from '@/components/ReportModal'
import dynamic from 'next/dynamic'
import { ReportCategory, Report } from '@/types'
import { useQuery } from '@tanstack/react-query'
import { getReports, getReportsInBounds } from '@/lib/api/reports'
import { useMyProfile } from '@/hooks/useProfile'
import UnifiedSearch from '@/components/UnifiedSearch'
import { MapPin, FileText } from 'lucide-react'
import LoadingSpinner, { CardSkeleton } from '@/components/ui/LoadingSpinner'
import ErrorDisplay from '@/components/ui/ErrorDisplay'
import LocalhostGuide from '@/components/ui/LocalhostGuide'
import MarkerIcon from '@/components/ui/MarkerIcon'
import { CurrentRegionButton } from '@/components/ui'
import { formatToAdministrativeAddress } from '@/lib/utils/addressUtils'

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
      <LoadingSpinner message="지도를 불러오는 중..." />
    </div>
  )
})

const categories = [
  { value: 'all', label: '전체' },
  { value: ReportCategory.NOISE, label: '소음' },
  { value: ReportCategory.TRASH, label: '쓰레기' },
  { value: ReportCategory.FACILITY, label: '시설물' },
  { value: ReportCategory.TRAFFIC, label: '교통' },
  { value: ReportCategory.OTHER, label: '기타' }
]

export default function Home() {

  // 행정동 기반 동네 표시명 계산 함수
  const getNeighborhoodDisplayName = (profile: { neighborhood?: { address: string; place_name: string } }) => {
    if (!profile?.neighborhood) return '내 동네'
    
    const adminAddress = formatToAdministrativeAddress(profile.neighborhood.address)
    return adminAddress && adminAddress !== '주소 없음' ? adminAddress : profile.neighborhood.place_name
  }

  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searchMode, setSearchMode] = useState<'location' | 'text'>('location')
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null)
  const [searchedLocation, setSearchedLocation] = useState<{ placeName: string; address: string } | null>(null)
  const [userCurrentLocation, setUserCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
  // Location permission status 제거 - 사용하지 않음
  const [currentMapBounds, setCurrentMapBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null)
  const [triggerMapSearch, setTriggerMapSearch] = useState(0) // 수동 검색 트리거
  const [useMapBoundsFilter, setUseMapBoundsFilter] = useState(false) // 맵 영역 필터 (내부 사용)
  const [selectedMapMarker, setSelectedMapMarker] = useState<{ id: string; location: { lat: number; lng: number }; count: number; reports: Report[] } | null>(null) // 선택된 마커 정보
  const [selectedLocation, setSelectedLocation] = useState<string>('') // 선택된 위치명

  // 사용자 정보 및 프로필 가져오기
  const { data: profile } = useMyProfile()
  
  // 내 동네 위치 (로그인된 사용자의 설정된 동네)
  const myNeighborhoodLocation = useMemo(() => {
    return profile?.neighborhood ? {
      lat: profile.neighborhood.lat,
      lng: profile.neighborhood.lng
    } : null
  }, [profile?.neighborhood])

  // 내 동네 제보 데이터 가져오기 (기본 방식)
  const { 
    data: allReports = [], 
    isLoading: isLoadingAllReports, 
    error: allReportsError,
    refetch: refetchAllReports 
  } = useQuery<Report[], Error>({
    queryKey: ['reports', selectedCategory, searchQuery],
    queryFn: async (): Promise<Report[]> => getReports({
      category: selectedCategory === 'all' ? undefined : selectedCategory as ReportCategory,
      search: searchQuery || undefined,
      limit: 100
    }),
    refetchInterval: false,
    refetchOnWindowFocus: false, // 윈도우 포커스 시 리페치 비활성화
    refetchOnMount: false, // 마운트 시 리페치 비활성화 (캐시 우선)
    retry: 1,
    enabled: !useMapBoundsFilter,
    staleTime: 5 * 60 * 1000, // 5분간 신선함 유지
    gcTime: 10 * 60 * 1000 // 10분간 캐시 보관
  })

  // 현재 맵 영역 기준 제보 데이터 가져오기 (수동 트리거 방식)
  const { 
    data: mapBoundsReports = [], 
    isLoading: isLoadingMapReports, 
    error: mapReportsError,
    refetch: refetchMapReports,
    isFetching: isFetchingMapReports
  } = useQuery<Report[], Error>({
    queryKey: ['mapBoundsReports', triggerMapSearch, selectedCategory],
    queryFn: async (): Promise<Report[]> => {
      if (!currentMapBounds || !useMapBoundsFilter) return []
      return getReportsInBounds({
        north: currentMapBounds.north,
        south: currentMapBounds.south,
        east: currentMapBounds.east,
        west: currentMapBounds.west,
        category: selectedCategory === 'all' ? undefined : selectedCategory as ReportCategory,
        limit: 200
      })
    },
    refetchInterval: false,
    refetchOnWindowFocus: false, // 윈도우 포커스 시 리페치 비활성화
    refetchOnMount: false, // 마운트 시 리페치 비활성화
    retry: 1,
    enabled: useMapBoundsFilter && !!currentMapBounds && triggerMapSearch > 0,
    staleTime: 3 * 60 * 1000, // 3분간 신선함 유지
    gcTime: 10 * 60 * 1000 // 10분간 캐시 보관
  })


  // 현재 사용 중인 위치 (우선순위: 지역검색 위치 > 내 동네 > 사용자 현재 위치)
  const activeLocation = useMemo(() => {
    // 지역 검색으로 설정된 위치가 있으면 그것을 우선 사용
    if (mapCenter) {
      return mapCenter
    }
    // 그 다음은 내 동네, 사용자 현재 위치 순
    return myNeighborhoodLocation ?? userCurrentLocation ?? null
  }, [mapCenter, myNeighborhoodLocation, userCurrentLocation])

  // 표시할 제보 결정 (타입 안전하게)
  const displayReports: Report[] = useMapBoundsFilter 
    ? (mapBoundsReports ?? []) 
    : (allReports ?? [])
  const isLoading = useMapBoundsFilter ? isLoadingMapReports : isLoadingAllReports
  const error = useMapBoundsFilter ? mapReportsError : allReportsError

  // getCurrentLocation 함수 제거 - 사용하지 않음

  // 위치 검색 핸들러 
  const handleLocationSearch = (location: { lat: number; lng: number; address: string; placeName: string }) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🗺️ 위치 선택됨:', location.placeName)
      console.log('📍 좌표:', location.lat, location.lng)
    }
    
    // 1. 지도 중심을 선택된 위치로 설정
    setMapCenter({ lat: location.lat, lng: location.lng })
    setSearchedLocation({ placeName: location.placeName, address: location.address })
    setUserCurrentLocation(null)
    
    // 2. 맵 영역 필터 모드로 변경 (선택된 위치 기준)
    setUseMapBoundsFilter(true)
    
    // 3. 지도 이동 후 해당 위치에서 제보 검색 (즉시 실행)
    setTimeout(() => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄', location.placeName, '지역에서 제보 검색 시작')
      }
      setTriggerMapSearch(prev => prev + 1)
    }, 800) // 지도 이동 시간 단축
  }

  // 내 동네로 돌아가기 (맵 검색 상태 초기화)
  const resetToMyNeighborhood = () => {
    setMapCenter(null)
    setSearchedLocation(null)
    setUserCurrentLocation(null)
    setUseMapBoundsFilter(false) // 맵 영역 필터 비활성화하여 기본 제보 표시
    setSelectedMapMarker(null) // 선택된 마커도 초기화
    if (process.env.NODE_ENV === 'development') {
      console.log('🏠 내 동네로 돌아가기')
    }
  }

  // 맵 영역 변경 핸들러
  const handleMapBoundsChange = useCallback((bounds: { north: number; south: number; east: number; west: number }) => {
    setCurrentMapBounds(bounds)
    
    // 맵 영역 필터가 활성화된 상태에서만 로그 출력 (개발 환경에서만)
    if (useMapBoundsFilter && process.env.NODE_ENV === 'development') {
      console.log('🗺️ 맵 영역 변경:', bounds)
    }
  }, [useMapBoundsFilter])

  // 이 지역 재검색 핸들러 (현재 맵 영역 기준)
  const handleRegionSearch = () => {
    if (!currentMapBounds) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ 맵 bounds가 아직 준비되지 않음')
      }
      alert('지도가 아직 로딩 중입니다. 잠시 후 다시 시도해주세요.')
      return
    }
    
    // 현재 맵 중심 좌표 계산
    const currentCenter = {
      lat: (currentMapBounds.north + currentMapBounds.south) / 2,
      lng: (currentMapBounds.east + currentMapBounds.west) / 2
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 이 지역 재검색 시작')
      console.log('📍 현재 맵 중심:', currentCenter)
      console.log('🗺️ 맵 영역:', currentMapBounds)
    }
    
    // 현재 맵 중심을 mapCenter로 설정하여 해당 위치를 고정
    setMapCenter(currentCenter)
    
    // 맵 영역 필터 활성화하여 현재 지역의 제보만 검색
    setUseMapBoundsFilter(true) // 맵 영역 필터 활성화
    setTriggerMapSearch(prev => prev + 1) // 검색 트리거 증가
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ 이 지역 재검색 설정 완료 - 맵 영역 기준 제보 검색 시작')
    }
  }

  // 마커 클릭 핸들러
  const handleMarkerClick = (group: { id: string; location: { lat: number; lng: number }; count: number; reports: Report[] }) => {
    console.log('📥 Page: handleMarkerClick 호출됨', group)
    console.log('📊 Page: group 데이터 구조:', {
      id: group?.id,
      count: group?.count,
      reports: group?.reports?.length,
      location: group?.location
    })
    
    setSelectedMapMarker(group)
    console.log('✅ Page: setSelectedMapMarker 설정 완료')
    
    // 역지오코딩으로 건물명/도로명 가져오기
    if (typeof window !== 'undefined' && window.kakao && window.kakao.maps) {
      const geocoder = new window.kakao.maps.services.Geocoder()
      
      geocoder.coord2Address(group.location.lng, group.location.lat, (result: { address?: { address_name: string }; road_address?: { road_name: string; building_name: string; address_name: string } }[], status: string) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const addr = result[0]
          let locationName = ''
          
          // 우선순위: 도로명 주소 > 건물명 > 행정동
          if (addr.road_address) {
            // 도로명 주소에서 건물명이나 도로명 추출
            const roadName = addr.road_address.road_name
            const buildingName = addr.road_address.building_name
            
            if (buildingName) {
              locationName = buildingName
            } else if (roadName) {
              locationName = `${roadName} 일대`
            } else {
              locationName = addr.road_address.address_name.split(' ').slice(-2).join(' ')
            }
          } else if (addr.address) {
            // 지번 주소에서 동네명 추출
            const addressParts = addr.address.address_name.split(' ')
            locationName = addressParts.slice(-2).join(' ')
          }
          
          setSelectedLocation(locationName || '선택한 위치')
          console.log('📍 Page: 위치명 설정 완료:', locationName)
        } else {
          setSelectedLocation('선택한 위치')
          console.log('📍 Page: 기본 위치명 설정')
        }
      })
    } else {
      setSelectedLocation('선택한 위치')
      console.log('📍 Page: 카카오맵 없어서 기본 위치명 설정')
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 마커 클릭:', group)
    }
  }

  // selectedMapMarker 상태 변화 디버깅
  useEffect(() => {
    console.log('🔄 Page: selectedMapMarker 상태 변화:', selectedMapMarker)
    if (selectedMapMarker) {
      console.log('📊 Page: selectedMapMarker 상세:', {
        id: selectedMapMarker.id,
        count: selectedMapMarker.count,
        reports: selectedMapMarker.reports?.map((r: { id: string; title: string }) => ({ id: r.id, title: r.title }))
      })
    }
  }, [selectedMapMarker])

  // getCategoryLabel 함수 제거 - 사용하지 않음

  // 개발용 디버깅 제거 (성능 최적화)

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <AuthModal />
        <ReportModal />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorDisplay
            error={error}
            title="제보 데이터를 불러올 수 없습니다"
            onRetry={() => useMapBoundsFilter ? refetchMapReports() : refetchAllReports()}
          />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <AuthModal />
      <ReportModal />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        

        {/* 지도 섹션 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {searchedLocation ? `${searchedLocation.placeName} 근처 제보` : 
               myNeighborhoodLocation && profile ? `${getNeighborhoodDisplayName(profile)} 근처 제보` :
               userCurrentLocation ? '내 위치 근처 제보' :
               useMapBoundsFilter ? '현재 지도 영역 제보' : '제보 지도'}
            </h2>
            {(searchedLocation || userCurrentLocation || useMapBoundsFilter) && (
              <button
                onClick={resetToMyNeighborhood}
                className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                {myNeighborhoodLocation ? '내 동네로 돌아가기' : '검색 초기화'}
              </button>
            )}
          </div>

          {/* 통합 검색창 */}
          <div className="mb-4">
            {/* 검색 모드 탭 */}
            <div className="flex mb-3 bg-gray-100 rounded-lg p-1 max-w-lg">
              <button
                onClick={() => setSearchMode('location')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-all flex-1 justify-center ${
                  searchMode === 'location'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <MapPin className="h-4 w-4" />
                <span>위치 검색</span>
              </button>
              <button
                onClick={() => setSearchMode('text')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-all flex-1 justify-center ${
                  searchMode === 'text'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>제보 검색</span>
              </button>
            </div>

            {/* 검색 입력창과 현재 지역 검색 버튼을 같은 행에 배치 */}
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
              <UnifiedSearch
                searchMode={searchMode}
                onLocationSelect={handleLocationSearch}
                onTextSearch={(query) => setSearchQuery(query)}
                className="max-w-lg flex-1"
              />
              
              {/* 이 지역 재검색 버튼 */}
              <CurrentRegionButton
                onClick={handleRegionSearch}
                loading={isFetchingMapReports}
                disabled={!currentMapBounds}
                loadingText="검색 중..."
              />
            </div>
            
            {searchedLocation && (
              <div className="mt-2 text-sm text-gray-600 flex items-center">
                <MarkerIcon className="w-3 h-4 mr-1" />
                {searchedLocation.address}
              </div>
            )}
          </div>
          
          <MapComponent 
            reports={displayReports} 
            height="400px"
            center={activeLocation ?? undefined}
            onBoundsChange={handleMapBoundsChange}
            onMarkerClick={handleMarkerClick}
            selectedMarkerId={selectedMapMarker?.id}
          />
        </div>

        {/* 선택된 마커의 제보들 표시 */}
        {selectedMapMarker && (
          <div className="mb-8 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* 헤더 */}
            <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <MapPin className="w-5 h-5 text-blue-600 mr-2" />
                    {selectedLocation || '선택한 위치'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedMapMarker.count}개의 제보가 있습니다
                  </p>
                </div>
                <button
                  onClick={() => setSelectedMapMarker(null)}
                  className="text-gray-500 hover:text-gray-700 transition-colors p-2 hover:bg-white/50 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* 제보 목록 */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(selectedMapMarker.reports || []).map((report: Report) => (
                  <ReportCard key={report.id} report={report} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 검색 및 필터 영역 */}
        <div className="mb-6">

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900">
              {searchQuery ? '검색 결과' : (useMapBoundsFilter ? '현재 지도 영역 제보' : '내 동네 제보')}
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({displayReports.length}개)
              </span>
              {isFetchingMapReports && useMapBoundsFilter && (
                <span className="text-sm font-normal text-blue-600 ml-2">
                  🔄 업데이트 중...
                </span>
              )}
            </h2>
            
            {/* 카테고리 필터 - 모바일 최적화 */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.value}
                  onClick={() => {
                    setSelectedCategory(category.value)
                    // 맵 영역 필터가 활성화된 상태에서 카테고리 변경 시 재검색
                    if (useMapBoundsFilter) {
                      setTriggerMapSearch(prev => prev + 1)
                    }
                  }}
                  className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all border touch-manipulation ${
                    selectedCategory === category.value
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {searchQuery && (
            <div className="mt-2 text-sm text-gray-600">
              <span className="font-medium">&apos;{searchQuery}&apos;</span> 검색 결과: {displayReports.length}개
            </div>
          )}
        </div>

        {/* 제보 목록 */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayReports.map((report) => (
              <div key={report.id} className="relative">
                <ReportCard report={report} />
              </div>
            ))}
          </div>
        )}

        {!isLoading && displayReports.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">
              {useMapBoundsFilter 
                ? '현재 지도 영역에 제보가 없습니다. 지도를 이동하거나 다른 지역을 검색해보세요!' 
                : '해당 조건의 제보가 없습니다.'
              }
            </p>
            <p className="text-sm text-gray-400">
              로그인 후 제보하기 버튼을 눌러 새로운 제보를 작성해보세요.
            </p>
          </div>
        )}
      </main>
      
      {/* localhost 접속 가이드 */}
      <LocalhostGuide />
    </div>
  )
}