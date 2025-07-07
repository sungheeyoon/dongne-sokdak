'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import ReportCard from '@/components/ReportCard'
import AuthModal from '@/components/AuthModal'
import ReportModal from '@/components/ReportModal'
import dynamic from 'next/dynamic'
import { ReportCategory } from '@/types'
import { useQuery } from '@tanstack/react-query'
import { getReports } from '@/lib/api/reports'
import { useMyProfile } from '@/hooks/useProfile'
import { useAuth } from '@/hooks/useAuth'
import { MapPin, Search } from 'lucide-react'
import LocationSearch from '@/components/map/LocationSearch'

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-100 rounded-lg animate-pulse"></div>
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searchInput, setSearchInput] = useState<string>('')
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null)
  const [searchedLocation, setSearchedLocation] = useState<{ placeName: string; address: string } | null>(null)
  const [currentMapBounds, setCurrentMapBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null)
  const [mapReports, setMapReports] = useState<any[]>([])
  const [isLoadingMapReports, setIsLoadingMapReports] = useState(false)

  // 사용자 정보 및 프로필 가져오기
  const { user } = useAuth()
  const { data: profile } = useMyProfile()
  
  // 내 동네 위치 (로그인된 사용자의 설정된 동네)
  const myNeighborhoodLocation = profile?.neighborhood ? {
    lat: profile.neighborhood.lat,
    lng: profile.neighborhood.lng
  } : null

  // 검색용 전체 제보 데이터 가져오기
  const { 
    data: allReports = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['reports', selectedCategory, searchQuery],
    queryFn: () => getReports({
      category: selectedCategory === 'all' ? undefined : selectedCategory as ReportCategory,
      search: searchQuery || undefined,
      limit: 100 
    }),
    refetchInterval: 30000,
    retry: 1,
  })

  // 맵 영역 기반 제보 조회
  const loadMapReports = async (bounds: { north: number; south: number; east: number; west: number }) => {
    if (!bounds) return

    setIsLoadingMapReports(true)
    try {
      const { getReportsInBounds } = await import('@/lib/api/reports')
      const reports = await getReportsInBounds({
        ...bounds,
        category: selectedCategory === 'all' ? undefined : selectedCategory as ReportCategory,
        limit: 100
      })
      setMapReports(reports)
      console.log('🗺️ 맵 영역 제보 로드됨:', reports.length, '개')
    } catch (error) {
      console.error('맵 영역 제보 로드 실패:', error)
    } finally {
      setIsLoadingMapReports(false)
    }
  }

  // 맵 bounds 변경 핸들러
  const handleMapBoundsChange = (bounds: { north: number; south: number; east: number; west: number }) => {
    setCurrentMapBounds(bounds)
    // 초기 로드
    if (mapReports.length === 0) {
      loadMapReports(bounds)
    }
  }

  // "이 지역 재검색" 핸들러
  const handleRegionSearch = () => {
    if (currentMapBounds) {
      loadMapReports(currentMapBounds)
    }
  }

  // 위치 검색 핸들러
  const handleLocationSearch = (location: { lat: number; lng: number; address: string; placeName: string }) => {
    console.log('🗺️ 검색된 위치:', location)
    setMapCenter({ lat: location.lat, lng: location.lng })
    setSearchedLocation({ placeName: location.placeName, address: location.address })
  }

  // 위치 검색 초기화
  const resetLocationSearch = () => {
    setMapCenter(null)
    setSearchedLocation(null)
  }

  // 검색 핸들러
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchQuery(searchInput.trim())
  }

  const clearSearch = () => {
    setSearchInput('')
    setSearchQuery('')
  }

  // 현재 사용 중인 위치
  const activeLocation = mapCenter || myNeighborhoodLocation || { lat: 37.5665, lng: 126.9780 }

  // 표시할 제보 (맵 영역 기반)
  const displayReports = mapReports.length > 0 ? mapReports : allReports

  console.log('📊 Total reports:', allReports.length, 'Map reports:', mapReports.length)

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <AuthModal />
        <ReportModal />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">데이터를 불러오는 중 오류가 발생했습니다.</p>
            <p className="text-gray-500 text-sm mb-4">{(error as Error).message}</p>
            <button 
              onClick={() => refetch()}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
            >
              다시 시도
            </button>
          </div>
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
        
        {/* 동네 설정 영역 */}
        <div className="mb-8 p-6 bg-white rounded-xl shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <MapPin className="h-5 w-5 text-blue-600 mr-2" />
              지역 검색
            </h2>
            
            {/* 현재 위치 상태 */}
            <div className="text-sm">
              {searchedLocation ? (
                <span className="text-blue-600 flex items-center">
                  📍 {searchedLocation.placeName}
                  <button
                    onClick={resetLocationSearch}
                    className="ml-2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </span>
              ) : myNeighborhoodLocation && profile?.neighborhood ? (
                <span className="text-green-600">🏠 {profile.neighborhood.place_name}</span>
              ) : (
                <span className="text-gray-500">📍 서울 중심</span>
              )}
            </div>
          </div>

          {/* 지역 검색창 */}
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

          {/* 안내 메시지 */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
            <p className="text-blue-800 font-medium mb-1">💡 카카오맵 방식으로 개선된 지역 검색</p>
            <ul className="text-blue-700 text-xs space-y-1 ml-4">
              <li>• 지역을 검색하거나 맵을 움직여 원하는 지역으로 이동</li>
              <li>• 맵에서 "이 지역 재검색" 버튼을 눌러 해당 영역의 제보 확인</li>
              <li>• 같은 위치의 여러 제보는 클러스터로 표시</li>
            </ul>
          </div>
        </div>

        {/* 지도 섹션 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {searchedLocation ? `${searchedLocation.placeName} 지역 제보` : 
               myNeighborhoodLocation && profile?.neighborhood ? `${profile.neighborhood.place_name} 지역 제보` :
               '서울 중심 지역 제보'}
            </h2>
            <div className="text-sm text-gray-600">
              {isLoadingMapReports ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  지역 제보 로딩 중...
                </span>
              ) : (
                <span>맵 영역: {mapReports.length}개 제보</span>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="h-96 bg-gray-100 rounded-lg animate-pulse"></div>
          ) : (
            <MapComponent 
              reports={mapReports} 
              height="500px"
              center={activeLocation}
              onBoundsChange={handleMapBoundsChange}
              onRegionSearch={handleRegionSearch}
              showRegionSearchButton={true}
            />
          )}
        </div>

        {/* 검색 및 필터 영역 */}
        <div className="mb-6">
          {/* 검색바 */}
          <form onSubmit={handleSearch} className="max-w-2xl mb-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
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
                    className="mr-2 text-gray-400 hover:text-gray-600 p-1"
                  >
                    ✕
                  </button>
                )}
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-lg font-semibold transition-colors"
                >
                  검색
                </button>
              </div>
            </div>
          </form>

          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              {searchQuery ? '검색 결과' : '제보 목록'}
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({displayReports.length}개)
              </span>
            </h2>
            
            {/* 카테고리 필터 */}
            <div className="flex space-x-2">
              {categories.map((category) => (
                <button
                  key={category.value}
                  onClick={() => setSelectedCategory(category.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${
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
              <div key={i} className="bg-gray-100 rounded-lg h-48 animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayReports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        )}

        {!isLoading && displayReports.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">
              이 지역에 제보가 없습니다. 첫 번째 제보를 올려보세요!
            </p>
            <p className="text-sm text-gray-400">
              로그인 후 제보하기 버튼을 눌러 새로운 제보를 작성해보세요.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
