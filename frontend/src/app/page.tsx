'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import ReportCard from '@/components/ReportCard'
import AuthModal from '@/components/AuthModal'
import ReportModal from '@/components/ReportModal'
import dynamic from 'next/dynamic'
import { ReportCategory, Report } from '@/types'
import { useQuery } from '@tanstack/react-query'
import { getReports, getReportsInBounds } from '@/lib/api/reports'
import { useMyProfile } from '@/hooks/useProfile'
import { useAuth } from '@/hooks/useAuth'
import { MapPin, Users, Navigation } from 'lucide-react'
import LocationSearch from '@/components/map/LocationSearch'
import LoadingSpinner, { CardSkeleton } from '@/components/ui/LoadingSpinner'
import ErrorDisplay from '@/components/ui/ErrorDisplay'
import LocalhostGuide from '@/components/ui/LocalhostGuide'
import { extractNeighborhoodFromAddress } from '@/lib/utils/neighborhoodUtils'

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
  const getNeighborhoodDisplayName = (profile: any) => {
    if (!profile?.neighborhood) return '내 동네'
    const neighborhoodInfo = extractNeighborhoodFromAddress(profile.neighborhood.address)
    if (neighborhoodInfo.neighborhood && /\d+동$/.test(neighborhoodInfo.neighborhood)) {
      return neighborhoodInfo.neighborhood
    }
    if (neighborhoodInfo.neighborhood && neighborhoodInfo.neighborhood.endsWith('동')) {
      return neighborhoodInfo.neighborhood
    }
    if (neighborhoodInfo.neighborhood && /\d*가$/.test(neighborhoodInfo.neighborhood)) {
      return neighborhoodInfo.neighborhood
    }
    return neighborhoodInfo.neighborhood || profile.neighborhood.place_name
  }

  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searchInput, setSearchInput] = useState<string>('')
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null)
  const [searchedLocation, setSearchedLocation] = useState<{ placeName: string; address: string } | null>(null)
  const [userCurrentLocation, setUserCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<'unknown' | 'granted' | 'denied' | 'loading'>('unknown')
  const [currentMapBounds, setCurrentMapBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null)
  const [useMapBoundsFilter, setUseMapBoundsFilter] = useState(false)
  const [isMapSearching, setIsMapSearching] = useState(false)

  // 사용자 정보 및 프로필 가져오기
  const { user } = useAuth()
  const { data: profile } = useMyProfile()
  
  // 내 동네 위치 (로그인된 사용자의 설정된 동네)
  const myNeighborhoodLocation = profile?.neighborhood ? {
    lat: profile.neighborhood.lat,
    lng: profile.neighborhood.lng
  } : null

  // 전체 제보 데이터 가져오기 (기본 방식)
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
    refetchInterval: 30000,
    retry: 1,
    enabled: !useMapBoundsFilter // 맵 영역 필터가 비활성화된 경우에만 실행
  })

  // 맵 영역 기준 제보 데이터 가져오기 (새로운 방식)
  const { 
    data: mapBoundsReports = [], 
    isLoading: isLoadingMapReports, 
    error: mapReportsError,
    refetch: refetchMapReports,
    isFetching: isFetchingMapReports
  } = useQuery<Report[], Error>({
    queryKey: ['mapBoundsReports', currentMapBounds, selectedCategory],
    queryFn: async (): Promise<Report[]> => {
      if (!currentMapBounds) return []
      return getReportsInBounds({
        north: currentMapBounds.north,
        south: currentMapBounds.south,
        east: currentMapBounds.east,
        west: currentMapBounds.west,
        category: selectedCategory === 'all' ? undefined : selectedCategory as ReportCategory,
        limit: 200
      })
    },
    refetchInterval: 30000,
    retry: 1,
    enabled: useMapBoundsFilter && !!currentMapBounds, // 맵 영역 필터가 활성화되고 bounds가 있는 경우에만 실행
  })

  // useEffect로 검색 상태 관리
  useEffect(() => {
    if (!isFetchingMapReports && isMapSearching) {
      setIsMapSearching(false)
    }
  }, [isFetchingMapReports, isMapSearching])

  // 현재 사용 중인 위치 (우선순위: 검색된 위치 > 내 동네 > 사용자 설정 위치)
  const activeLocation: { lat: number; lng: number } | null = mapCenter ?? myNeighborhoodLocation ?? userCurrentLocation ?? null

  // 표시할 제보 결정 (타입 안전하게)
  const displayReports: Report[] = useMapBoundsFilter 
    ? (mapBoundsReports ?? []) 
    : (allReports ?? [])
  const isLoading = useMapBoundsFilter ? isLoadingMapReports : isLoadingAllReports
  const error = useMapBoundsFilter ? mapReportsError : allReportsError

  // 현재 위치 가져오기 함수
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      alert('이 브라우저는 위치 서비스를 지원하지 않습니다.')
      return
    }

    setLocationPermissionStatus('loading')

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
          }
        )
      })

      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      }

      setUserCurrentLocation(location)
      setLocationPermissionStatus('granted')
      setMapCenter(null) // 검색된 위치 초기화
      setSearchedLocation(null)

      console.log('📍 현재 위치 설정:', location)
      
    } catch (error: any) {
      console.error('위치 가져오기 실패:', error)
      setLocationPermissionStatus('denied')
      
      let errorMessage = '현재 위치를 가져올 수 없습니다.'
      
      switch(error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = '위치 접근 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.'
          break
        case error.POSITION_UNAVAILABLE:
          errorMessage = '위치 정보를 사용할 수 없습니다.'
          break
        case error.TIMEOUT:
          errorMessage = '위치 정보 요청 시간이 초과되었습니다.'
          break
      }
      
      alert(errorMessage)
    }
  }

  // 위치 검색 핸들러
  const handleLocationSearch = (location: { lat: number; lng: number; address: string; placeName: string }) => {
    console.log('🗺️ 검색된 위치:', location)
    setMapCenter({ lat: location.lat, lng: location.lng })
    setSearchedLocation({ placeName: location.placeName, address: location.address })
    setUserCurrentLocation(null) // 현재 위치 초기화
  }

  // 위치 검색 초기화 (내 동네로 돌아가기)
  const resetLocationSearch = () => {
    setMapCenter(null)
    setSearchedLocation(null)
    setUserCurrentLocation(null)
    setUseMapBoundsFilter(false)
    setIsMapSearching(false)
  }

  // 맵 영역 변경 핸들러
  const handleMapBoundsChange = (bounds: { north: number; south: number; east: number; west: number }) => {
    setCurrentMapBounds(bounds)
    if (useMapBoundsFilter) {
      console.log('🗺️ 맵 영역 변경:', bounds)
    }
  }

  // 이 지역 재검색 핸들러 (개선된 버전)
  const handleRegionSearch = () => {
    if (currentMapBounds) {
      setIsMapSearching(true) // 검색 시작 상태로 설정
      setUseMapBoundsFilter(true)
      console.log('🔄 이 지역 재검색 활성화')
      
      // React Query가 자동으로 refetch하므로 별도 호출 불필요
      // refetchMapReports()는 onSettled에서 로딩 상태를 해제함
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchQuery(searchInput.trim())
  }

  const clearSearch = () => {
    setSearchInput('')
    setSearchQuery('')
  }

  console.log('📊 Current reports:', displayReports.length)
  console.log('📊 Map bounds filter:', useMapBoundsFilter)
  console.log('📊 Map searching:', isMapSearching)

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
        
        {/* 위치 설정 영역 */}
        <div className="mb-8 p-4 md:p-6 bg-white rounded-xl shadow-sm border">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-3">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 flex items-center">
              <MapPin className="h-5 w-5 text-blue-600 mr-2" />
              지역 설정
            </h2>
            
            {/* 위치 상태 표시 및 현재 위치 버튼 */}
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-3 w-full md:w-auto">
              {/* 위치 상태 */}
              <div className="text-sm">
                {searchedLocation ? (
                  <span className="text-blue-600">📍 {searchedLocation.placeName}</span>
                ) : myNeighborhoodLocation ? (
                  <span className="text-green-600">🏠 {getNeighborhoodDisplayName(profile)}</span>
                ) : userCurrentLocation ? (
                  <span className="text-green-600">📍 내 위치 설정됨</span>
                ) : (
                  <span className="text-gray-500">📍 위치 없음</span>
                )}
              </div>
              
              {/* 현재 위치 버튼 */}
              <button
                onClick={getCurrentLocation}
                disabled={locationPermissionStatus === 'loading'}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-manipulation ${
                  userCurrentLocation
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : locationPermissionStatus === 'denied'
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                } ${locationPermissionStatus === 'loading' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {locationPermissionStatus === 'loading' ? (
                  <span className="flex items-center space-x-1">
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-current"></div>
                    <span>확인중...</span>
                  </span>
                ) : userCurrentLocation ? (
                  '🎯 내 위치 사용중'
                ) : locationPermissionStatus === 'denied' ? (
                  '❌ 위치 권한 없음'
                ) : (
                  '📍 현재 위치로'
                )}
              </button>
            </div>
          </div>

          {/* 필터 방식 선택 */}
          <div className="mb-4">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="filterMode"
                  checked={!useMapBoundsFilter}
                  onChange={() => {
                    setUseMapBoundsFilter(false)
                    setIsMapSearching(false)
                  }}
                  className="form-radio"
                />
                <span className="text-sm">전체 제보 보기</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="filterMode"
                  checked={useMapBoundsFilter}
                  onChange={() => setUseMapBoundsFilter(true)}
                  className="form-radio"
                />
                <span className="text-sm">지도 영역 제보만 보기 (카카오맵 방식)</span>
              </label>
            </div>
          </div>

          {/* 통계 정보 */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                <span>현재 표시: {displayReports.length}개</span>
              </div>
              <div>필터 방식: {useMapBoundsFilter ? '지도 영역' : '전체'}</div>
              {currentMapBounds && useMapBoundsFilter && (
                <div className="text-blue-600">
                  {isMapSearching || isFetchingMapReports ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-current mr-1"></div>
                      검색 중...
                    </span>
                  ) : (
                    '🗺️ 영역 기반 조회 중'
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 위치 권한 안내 */}
          {locationPermissionStatus === 'denied' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm mt-4">
              <div className="flex items-start space-x-2">
                <span className="text-red-600">🚫</span>
                <div className="flex-1">
                  <p className="text-red-800 font-medium mb-1">위치 접근 권한이 필요합니다</p>
                  <p className="text-red-700 mb-3">현재 위치 기반 서비스를 이용하려면 위치 권한을 허용해주세요.</p>
                  
                  <div className="bg-white p-3 rounded border border-red-300">
                    <p className="text-red-800 font-medium mb-2">🔧 위치 권한 허용 방법:</p>
                    <ol className="text-red-700 text-xs space-y-1">
                      <li>1. 주소창 왼쪽의 🔒 자물쇠 아이콘을 클릭</li>
                      <li>2. "위치" 항목을 "허용"으로 변경</li>
                      <li>3. 페이지를 새로고침하거나 다시 "📍 현재 위치로" 버튼 클릭</li>
                    </ol>
                  </div>
                  
                  <p className="text-red-600 mt-2">
                    💡 또는 위의 검색창에서 지역명을 검색하여 해당 동네의 제보를 확인할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 지도 섹션 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {searchedLocation ? `${searchedLocation.placeName} 근처 제보` : 
               myNeighborhoodLocation ? `${getNeighborhoodDisplayName(profile)} 근처 제보` :
               userCurrentLocation ? '내 위치 근처 제보' :
               useMapBoundsFilter ? '지도 영역 제보' : '제보 지도'}
            </h2>
            {(searchedLocation || userCurrentLocation) && (
              <button
                onClick={resetLocationSearch}
                className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                {myNeighborhoodLocation ? '내 동네로 돌아가기' : '검색 초기화'}
              </button>
            )}
          </div>

          {/* 지역 검색창 */}
          <div className="mb-4">
            <LocationSearch
              onLocationSelect={handleLocationSearch}
              placeholder="동네, 건물명, 지번을 검색하여 해당 지역 제보를 확인하세요"
              className="max-w-lg"
            />
            {searchedLocation && (
              <div className="mt-2 text-sm text-gray-600">
                📍 {searchedLocation.address}
              </div>
            )}
          </div>
          
          {isLoading ? (
            <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
              <LoadingSpinner size="lg" message="제보 데이터를 불러오는 중..." />
            </div>
          ) : (
            <MapComponent 
              reports={displayReports} 
              height="400px"
              center={activeLocation ?? undefined}
              onBoundsChange={handleMapBoundsChange}
              showRegionSearchButton={true}
              onRegionSearch={handleRegionSearch}
              isSearching={isMapSearching || isFetchingMapReports}
            />
          )}
        </div>

        {/* 검색 및 필터 영역 */}
        <div className="mb-6">
          {/* 검색바 */}
          <form onSubmit={handleSearch} className="max-w-2xl mb-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 text-lg">🔍</span>
              </div>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="block w-full pl-10 pr-20 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 placeholder-gray-500"
                placeholder="제보 제목이나 내용으로 검색..."
              />
              <div className="absolute inset-y-0 right-0 flex items-center">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="mr-2 text-gray-400 hover:text-gray-600 p-1 touch-manipulation"
                  >
                    ✕
                  </button>
                )}
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 md:px-4 py-2 rounded-r-lg font-semibold transition-colors touch-manipulation"
                >
                  검색
                </button>
              </div>
            </div>
          </form>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900">
              {searchQuery ? '검색 결과' : (useMapBoundsFilter ? '지도 영역 제보' : '전체 제보')}
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({displayReports.length}개)
              </span>
              {(isMapSearching || isFetchingMapReports) && useMapBoundsFilter && (
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
                  onClick={() => setSelectedCategory(category.value)}
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
              <span className="font-medium">'{searchQuery}'</span> 검색 결과: {displayReports.length}개
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
                ? '이 지역에 제보가 없습니다. 지도를 이동하거나 전체 제보를 확인해보세요!' 
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