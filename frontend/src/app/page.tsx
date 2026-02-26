'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useUIStore } from '@/stores/useUIStore'
import Header from '@/components/Header'
import ReportCard from '@/components/ReportCard'
import { AuthDialog } from '@/components/auth/AuthDialog'
import ReportModal from '@/components/ReportModal'
import dynamic from 'next/dynamic'
import { ReportCategory, Report } from '@/types'
import { useMyProfile } from '@/hooks/useProfile'
import { useMapController } from '@/hooks/useMapController'
import { getActiveLocation } from '@/lib/map/getActiveLocation'
import { useReports } from '@/hooks/useReports'
import { reverseGeocode } from '@/lib/map/reverseGeocode'
import UnifiedSearch from '@/components/UnifiedSearch'
import { MapPin, FileText, X } from 'lucide-react'
import LoadingSpinner, { CardSkeleton } from '@/components/ui/LoadingSpinner'
import ErrorDisplay from '@/components/ui/ErrorDisplay'
import LocalhostGuide from '@/components/ui/LocalhostGuide'
import MarkerIcon from '@/components/ui/MarkerIcon'
import { CurrentRegionButton, RefreshSearchButton } from '@/components/ui'
import { UiButton as Button, UiCard as Card } from '@/components/ui'
import { formatToAdministrativeAddress } from '@/lib/utils/addressUtils'
import { cn } from '@/lib/utils'

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
  const {
    openReportModal,
    searchQuery, setSearchQuery,
    searchMode, setSearchMode,
  } = useUIStore()

  const {
    mapCenter,
    searchedLocation,
    userCurrentLocation,
    currentMapBounds,
    triggerMapSearch, setTriggerMapSearch,
    useMapBoundsFilter, setUseMapBoundsFilter,
    selectedMapMarker, setSelectedMapMarker,
    handleMapBoundsChange,
    resetToMyNeighborhood,
    handleLocationSearch,
  } = useMapController()

  // 행정동 기반 동네 표시명 계산 함수
  const getNeighborhoodDisplayName = (profile: { neighborhood?: { address: string; place_name: string } }) => {
    if (!profile?.neighborhood) return '내 동네'

    const adminAddress = formatToAdministrativeAddress(profile.neighborhood.address)
    return adminAddress && adminAddress !== '주소 없음' ? adminAddress : profile.neighborhood.place_name
  }

  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedLocation, setSelectedLocation] = useState<string>('') // 선택된 위치명

  // 사용자 정보 및 프로필 가져오기
  const { data: profile, isLoading: isLoadingProfile } = useMyProfile()

  // 내 동네 위치 (로그인된 사용자의 설정된 동네)
  const myNeighborhoodLocation = useMemo(() => {
    return profile?.neighborhood ? {
      lat: profile.neighborhood.lat,
      lng: profile.neighborhood.lng
    } : null
  }, [profile?.neighborhood])

  const { data: displayReports = [], isLoading, error, refetch } = useReports({
    mode: (searchMode === 'text' && searchQuery) ? 'all' : (useMapBoundsFilter ? 'bounds' : 'all'),
    category: selectedCategory,
    searchQuery,
    bounds: currentMapBounds,
    trigger: triggerMapSearch
  })


  // 첫 로드 여부를 추적하여 초기 내 동네 이동을 1회 보장
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false)

  // 현재 사용 중인 위치
  const activeLocation = useMemo(() => {
    let cachedLastCenter = null;
    if (useMapBoundsFilter && currentMapBounds) {
      cachedLastCenter = {
        lat: (currentMapBounds.north + currentMapBounds.south) / 2,
        lng: (currentMapBounds.east + currentMapBounds.west) / 2
      };
    }

    return getActiveLocation({
      focusedLocation: mapCenter,
      isInitialLoadDone,
      myNeighborhoodLocation,
      cachedLastCenter,
      userCurrentLocation,
      // fallback을 서울시청 대신 내 동네가 있으면 내 동네로, 없으면 서울시청으로 설정
      fallbackCenter: myNeighborhoodLocation || { lat: 37.5665, lng: 126.9780 }
    });
  }, [mapCenter, isInitialLoadDone, myNeighborhoodLocation, useMapBoundsFilter, currentMapBounds, userCurrentLocation])

  useEffect(() => {
    if (!isInitialLoadDone && myNeighborhoodLocation) {
      setIsInitialLoadDone(true)
    }
  }, [myNeighborhoodLocation, isInitialLoadDone])

  // 마커 클릭 핸들러
  const handleMarkerClick = async (group: { id: string; location: { lat: number; lng: number }; count: number; reports: Report[] }) => {
    setSelectedMapMarker(group)
    const name = await reverseGeocode(group.location.lat, group.location.lng)
    setSelectedLocation(name)
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

  // 검색어가 비워지면 지도 내 검색(bounds) 모드로 자동 복귀
  useEffect(() => {
    if (searchMode === 'text' && !searchQuery && !useMapBoundsFilter) {
      setUseMapBoundsFilter(true)
      setTriggerMapSearch(prev => prev + 1)
    }
  }, [searchQuery, searchMode, useMapBoundsFilter, setUseMapBoundsFilter, setTriggerMapSearch])

  // getCategoryLabel 함수 제거 - 사용하지 않음

  // 개발용 디버깅 제거 (성능 최적화)

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <AuthDialog />
        <ReportModal />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorDisplay
            error={error}
            title="제보 데이터를 불러올 수 없습니다"
            onRetry={() => refetch()}
          />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <AuthDialog />
      <ReportModal />

      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
            우리 동네 <span className="text-primary">소식</span>을 한눈에
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            불편사항부터 훈훈한 미담까지, 이웃과 함께 나누는 실시간 동네 리포트
          </p>
        </div>

        {/* 지도 섹션 */}
        <div className="mb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                {searchedLocation ? `${searchedLocation.placeName} 주변` :
                  myNeighborhoodLocation && profile ? `${getNeighborhoodDisplayName(profile)} 주변` :
                    '동네 이슈 지도'}
              </h2>
            </div>
            {(searchedLocation || userCurrentLocation || useMapBoundsFilter) && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetToMyNeighborhood}
                className="self-start"
              >
                {myNeighborhoodLocation ? '내 동네로 돌아가기' : '검색 초기화'}
              </Button>
            )}
          </div>

          <Card className="overflow-hidden border-muted/50 shadow-md">
            <div className="p-4 border-b bg-muted/30">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* 검색 모드 탭 */}
                <div className="flex bg-muted p-1 rounded-lg w-fit shrink-0">
                  <button
                    onClick={() => setSearchMode('location')}
                    className={cn(
                      "flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold transition-all",
                      searchMode === 'location' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <MapPin className="h-4 w-4" />
                    <span>위치</span>
                  </button>
                  <button
                    onClick={() => setSearchMode('text')}
                    className={cn(
                      "flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold transition-all",
                      searchMode === 'text' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <FileText className="h-4 w-4" />
                    <span>제보</span>
                  </button>
                </div>

                <div className="flex flex-1 flex-col md:flex-row gap-2">
                  <UnifiedSearch
                    searchMode={searchMode}
                    onLocationSelect={handleLocationSearch}
                    onTextSearch={(query) => setSearchQuery(query)}
                    className="flex-1"
                  />
                  <RefreshSearchButton
                    onClick={() => setTriggerMapSearch(prev => prev + 1)}
                    loading={isLoading}
                    className="md:w-auto h-[42px]"
                  />
                </div>
              </div>
            </div>

            {isLoadingProfile ? (
              <div className="h-[450px] bg-gray-100 rounded-b-lg flex flex-col items-center justify-center">
                <LoadingSpinner message="내 동네 위치를 확인하는 중..." />
              </div>
            ) : (
              <MapComponent
                reports={displayReports}
                height="450px"
                center={activeLocation ?? undefined}
                onBoundsChange={handleMapBoundsChange}
                onMarkerClick={handleMarkerClick}
                selectedMarkerId={selectedMapMarker?.id}
              />
            )}
          </Card>
        </div>

        {/* 선택된 마커 섹션 */}
        {selectedMapMarker && (
          <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Card className="border-primary/20 shadow-lg ring-1 ring-primary/5">
              <div className="p-6 border-b bg-primary/5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <MapPin className="h-6 w-6 text-primary" />
                    {selectedLocation}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    이 지점에 <span className="font-bold text-foreground">{selectedMapMarker.count}개</span>의 제보가 있습니다
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedMapMarker(null)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {selectedMapMarker.reports.map((report) => (
                    <ReportCard key={report.id} report={report} />
                  ))}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* 제보 목록 영역 */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                {searchQuery ? `'${searchQuery}' 검색 결과` : (useMapBoundsFilter ? '현재 지역 이슈' : '실시간 동네 제보')}
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                총 {displayReports.length}개의 리포트가 발견되었습니다
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5 bg-muted/50 p-1.5 rounded-xl border border-muted w-fit">
              {categories.map((category) => (
                <button
                  key={category.value}
                  onClick={() => {
                    setSelectedCategory(category.value)
                    if (useMapBoundsFilter) setTriggerMapSearch(prev => prev + 1)
                  }}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all",
                    selectedCategory === category.value
                      ? "bg-background text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-background/50"
                  )}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <CardSkeleton key={i} />
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
            <Card className="p-12 text-center border-dashed">
              <div className="max-w-xs mx-auto space-y-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-bold">제보가 없습니다</h3>
                <p className="text-muted-foreground">
                  {useMapBoundsFilter ? '이 지역엔 아직 등록된 제보가 없네요. 첫 번째 제보자가 되어보세요!' : '검색 결과가 없습니다.'}
                </p>
                <Button onClick={openReportModal} className="w-full">첫 제보 작성하기</Button>
              </div>
            </Card>
          )}
        </div>
      </main>

      {/* localhost 접속 가이드 */}
      <LocalhostGuide />
    </div>
  )
}