'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUIStore } from '@/shared/stores/useUIStore'
import Header from '@/components/Header'
import ReportCard from '@/features/reports/presentation/components/ReportCard'
import { AuthDialog } from '@/features/auth/presentation/components/AuthDialog'
import { Report as ReportType } from '@/types'
import ReportModal from '@/features/reports/presentation/components/ReportModal'
import dynamic from 'next/dynamic'
import { useProfileViewModel } from '@/features/profile/presentation/hooks/useProfileViewModel'
import { useAuthViewModel } from '@/features/auth/presentation/hooks/useAuthViewModel'
import { useMapReportsViewModel, useListReportsViewModel } from '@/features/reports/presentation/hooks/useReportsViewModel'
import ReportList from '@/features/reports/presentation/components/ReportList'
import CategoryFilterChips from '@/features/reports/presentation/components/CategoryFilterChips'
import HomeViewModeTabs, { HomeViewMode } from '@/features/map/presentation/components/HomeViewModeTabs'
import { useLocationViewModel } from '@/features/map/presentation/hooks/useLocationViewModel'
import { useMapControllerViewModel } from '@/features/map/presentation/hooks/useMapControllerViewModel'
import { useMapFocusViewModel } from '@/features/map/presentation/hooks/useMapFocusViewModel'
import MapInitializationGate, { MapLoadingFallback } from '@/features/map/presentation/components/MapInitializationGate'
import UnifiedSearch from '@/components/UnifiedSearch'
import { MapPin, FileText, X, AlertTriangle } from 'lucide-react'
import LocalhostGuide from '@/shared/ui/LocalhostGuide'
import { UiButton as Button, UiCard as Card, UiErrorState } from '@/shared/ui'
import { useIsDesktop } from '@/shared/hooks/useMediaQuery'
import { formatToAdministrativeAddress } from '@/lib/utils/addressUtils'
import { cn } from '@/lib/utils'
import { toast } from 'react-hot-toast'

const MapComponent = dynamic(() => import('@/features/map/presentation/components/MapComponent'), {
  ssr: false,
  loading: () => <MapLoadingFallback />
})

// 데스크톱 지도 높이 — 첫 화면에서 첫 카드 행의 상단이 보이도록 제한한다 (UI_V2_CONTRACT.md §7.2)
const DESKTOP_MAP_HEIGHT = 'clamp(400px, 46vh, 480px)'
// 모바일 지도 모드 — 고정 450px 패널이 아니라 남은 세로 공간을 쓴다 (§7.3)
const MOBILE_MAP_HEIGHT = 'calc(100dvh - 13rem)'

export default function Home() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const {
    openReportModal, openAuthModal,
    pendingIntent, setPendingIntent,
    searchQuery, setSearchQuery, searchMode, setSearchMode,
  } = useUIStore()

  const {
    focusedLocation,
    mapZoom, setMapZoom,
    currentMapBounds,
    searchedLocation,
    userCurrentLocation,
    useMapBoundsFilter, setUseMapBoundsFilter,
    triggerMapSearch, setTriggerMapSearch,
    selectedMapMarkers, setSelectedMapMarkers,
    handleMapBoundsChange,
    resetToMyNeighborhood,
    handleLocationSearch,
  } = useMapControllerViewModel()

  // 지도가 내 동네 좌표에서 500m 넘게 멀어졌는지 — "내 동네로 돌아가기" 버튼 노출 조건에 쓰인다.
  // MapComponent가 실시간으로 갱신해 올려보낸다 (grilling 세션에서 합의된 설계).
  const [isFarFromHome, setIsFarFromHome] = useState(false)

  // 모바일 홈의 기본 콘텐츠는 제보 피드이며, 지도는 명시적 전환으로만 연다 (UI_V2_CONTRACT.md §7.3).
  // 데스크톱은 지도와 현재 영역 제보를 함께 보여주므로 전환 자체가 없다.
  const isDesktop = useIsDesktop()
  const [mobileViewMode, setMobileViewMode] = useState<HomeViewMode>('feed')
  const showMap = isDesktop || mobileViewMode === 'map'
  const showFeed = isDesktop || mobileViewMode === 'feed'

  // 행정동 기반 동네 표시명 계산 함수
  const getNeighborhoodDisplayName = (profile: { neighborhood?: { address: string; placeName: string } }) => {
    if (!profile?.neighborhood) return '내 동네'

    const adminAddress = formatToAdministrativeAddress(profile.neighborhood.address)
    return adminAddress && adminAddress !== '주소 없음' ? adminAddress : profile.neighborhood.placeName
  }

  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedLocation, setSelectedLocation] = useState<string>('') // 선택된 위치명

  const { profile, isLoading: isLoadingProfile } = useProfileViewModel()
  const { user, initialized: isAuthInitialized } = useAuthViewModel()
  const { reverseGeocode, searchPlaces, isSearching } = useLocationViewModel()

  // 내 동네 위치 (로그인된 사용자의 설정된 동네)
  const myNeighborhoodLocation = useMemo(() => {
    return profile?.neighborhood ? {
      lat: profile.neighborhood.lat,
      lng: profile.neighborhood.lng
    } : null
  }, [profile?.neighborhood])

  // Pagination 상태
  const [paginationPage, setPaginationPage] = useState<number>(1)

  // 상단 지도 마커용 경량/대량 데이터 페칭 (페이지네이션 없음)
  const { reports: mapReports = [], isLoading: isMapLoading, currentLimit: mapLimit } = useMapReportsViewModel({
    mode: (searchMode === 'text' && searchQuery) ? 'all' : (useMapBoundsFilter ? 'bounds' : 'all'),
    category: selectedCategory,
    searchQuery,
    bounds: currentMapBounds,
    trigger: triggerMapSearch,
    zoom: mapZoom
  })

  // 하단 리스트용 상세/소량 페이징 데이터 페칭
  const {
    reports: listReports = [],
    totalCount,
    totalPages,
    currentPage,
    isLoading: isListLoading,
    error,
    refetch
  } = useListReportsViewModel({
    mode: (searchMode === 'text' && searchQuery) ? 'all' : (useMapBoundsFilter ? 'bounds' : 'all'),
    category: selectedCategory,
    searchQuery,
    bounds: currentMapBounds,
    trigger: triggerMapSearch,
    page: paginationPage
  })

  // 필터, 범위 조건 등이 변경되면 무조건 페이지 리셋
  useEffect(() => {
    setPaginationPage(1)
  }, [currentMapBounds, selectedCategory, searchQuery, triggerMapSearch, searchMode, useMapBoundsFilter])

  // 소셜 로그인 콜백 실패 시 토스트로 안내 (route.ts가 ?authError=1을 붙여 리다이렉트)
  useEffect(() => {
    if (searchParams.get('authError')) {
      toast.error('소셜 로그인에 실패했습니다. 다시 시도해주세요.')
      router.replace('/')
    }
  }, [searchParams, router])

  // 제보 데이터 최대치 도달 시 토스트 경고 표시 (UX 피드백)
  useEffect(() => {
    if (mapReports.length > 0 && mapLimit && mapReports.length >= mapLimit) {
      toast('지도를 확대하시면 더 자세한 위치의 제보를 볼 수 있어요.', {
        id: 'map-limit-toast',
        icon: 'ℹ️',
        duration: 4000
      })
    }
  }, [mapReports.length, mapLimit])

  // 익명 주민이 시도했던 제보 작성으로 로그인 후 복귀한다 (UI_V2_CONTRACT.md §8)
  useEffect(() => {
    if (user && pendingIntent === 'compose-report') {
      setPendingIntent(null)
      openReportModal()
    }
  }, [user, pendingIntent, setPendingIntent, openReportModal])

  // 현재 사용 중인 위치 (외부 통제: 검색된 위치, 내 동네, 등)
  const mapFocus = useMapFocusViewModel({
    focusedLocation,
    myNeighborhoodLocation,
    userCurrentLocation,
    isAuthInitialized,
    isLoadingProfile,
  })

  // 마커 클릭 핸들러 — 단일 제보를 "선택된 마커 섹션"에 채운다.
  const handleMarkerClick = async (report: ReportType) => {
    setSelectedMapMarkers([report])
    const name = await reverseGeocode({ lat: report.location.lat, lng: report.location.lng })
    setSelectedLocation(name || '선택한 위치')
  }

  // 근접 그룹 클릭 핸들러 — 팝업 없이 같은 "선택된 마커 섹션"에 그룹 멤버 전체를 채운다 (ADR-0008).
  const handleGroupClick = async (reports: ReportType[], center: { lat: number; lng: number }) => {
    setSelectedMapMarkers(reports)
    const name = await reverseGeocode(center)
    setSelectedLocation(name || '선택한 위치')
  }

  // 검색어가 비워지면 지도 내 검색(bounds) 모드로 자동 복귀
  useEffect(() => {
    if (searchMode === 'text' && !searchQuery && !useMapBoundsFilter) {
      setUseMapBoundsFilter(true)
      setTriggerMapSearch((prev: number) => prev + 1)
    }
  }, [searchQuery, searchMode, useMapBoundsFilter, setUseMapBoundsFilter, setTriggerMapSearch])

  // 카테고리 변경은 명시적 사용자 의도이므로 영역 조회를 커밋한다 (ADR-0007).
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    if (useMapBoundsFilter) setTriggerMapSearch((prev: number) => prev + 1)
  }

  // 익명 주민에게는 데이터 오류가 아니라 로그인 안내를 주고, 원래 의도를 기억한다 (UI_V2_CONTRACT.md §8).
  const handleComposeReport = () => {
    if (user) {
      openReportModal()
      return
    }

    setPendingIntent('compose-report')
    openAuthModal('signin')
    toast('로그인하면 제보를 작성할 수 있어요.', { id: 'compose-requires-login' })
  }

  const contextLabel = searchedLocation
    ? `${searchedLocation.placeName} 주변`
    : (myNeighborhoodLocation && profile ? `${getNeighborhoodDisplayName(profile)} 주변` : '동네 이슈 지도')

  const feedHeading = searchQuery
    ? `'${searchQuery}' 검색 결과`
    : (useMapBoundsFilter ? '현재 지역 제보' : '실시간 동네 제보')

  const canReturnToNeighborhood = Boolean(searchedLocation || userCurrentLocation || isFarFromHome)

  const selectedMarkersSection = selectedMapMarkers && selectedMapMarkers.length > 0 ? (
    <Card className="overflow-hidden shadow-e2">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-brand-subtle p-4">
        <div className="min-w-0">
          <h3 className="type-h3 flex items-center gap-2">
            <MapPin className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
            <span className="truncate">{selectedLocation}</span>
          </h3>
          <p className="type-caption text-muted-foreground mt-1">
            {selectedMapMarkers.length === 1
              ? '이 지점의 단일 제보입니다'
              : `이 지점의 제보 ${selectedMapMarkers.length}건입니다`}
          </p>
        </div>
        <Button variant="ghost" size="icon" aria-label="선택 해제" onClick={() => setSelectedMapMarkers(null)}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
        {selectedMapMarkers.map((report) => (
          <ReportCard key={report.id} report={report as any} />
        ))}
      </div>
    </Card>
  ) : null

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <AuthDialog />
      <ReportModal />

      <main className="container mx-auto px-4 py-6 lg:py-8">
        {/* 탐색 컨텍스트 — 지금 무엇을 보고 있는지 첫 줄에서 말한다 */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="type-h2 flex min-w-0 items-center gap-2">
            <MapPin className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
            <span className="truncate">{contextLabel}</span>
          </h1>
          {canReturnToNeighborhood && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => resetToMyNeighborhood(myNeighborhoodLocation)}
            >
              {myNeighborhoodLocation ? '내 동네로 돌아가기' : '검색 초기화'}
            </Button>
          )}
        </div>

        {/* 모바일 전용 — 피드/지도 전환. 표현만 바꾸고 영역 조회를 실행하지 않는다 (ADR-0007) */}
        {!isDesktop && (
          <HomeViewModeTabs
            mode={mobileViewMode}
            onModeChange={setMobileViewMode}
            className="mb-4"
          />
        )}

        {/* 검색 — 위치/제보 모드 */}
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex w-fit shrink-0 gap-1 rounded-full bg-surface-muted p-1">
            <button
              type="button"
              onClick={() => setSearchMode('location')}
              aria-pressed={searchMode === 'location'}
              className={cn(
                'flex min-h-11 items-center gap-2 rounded-full px-4 type-label transition-colors',
                searchMode === 'location' ? 'bg-surface text-brand shadow-e1' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <MapPin className="h-4 w-4" aria-hidden="true" />
              위치
            </button>
            <button
              type="button"
              onClick={() => setSearchMode('text')}
              aria-pressed={searchMode === 'text'}
              className={cn(
                'flex min-h-11 items-center gap-2 rounded-full px-4 type-label transition-colors',
                searchMode === 'text' ? 'bg-surface text-brand shadow-e1' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              제보
            </button>
          </div>

          <UnifiedSearch
            searchMode={searchMode}
            onLocationSelect={handleLocationSearch}
            onTextSearch={(query) => setSearchQuery(query)}
            searchPlaces={searchPlaces}
            isSearching={isSearching}
            className="flex-1"
          />
        </div>

        {showMap && (
          <div className="mb-6 space-y-4">
            <Card className="overflow-hidden">
              <MapInitializationGate
                isAuthInitialized={isAuthInitialized}
                isLoadingProfile={isLoadingProfile}
                height={isDesktop ? DESKTOP_MAP_HEIGHT : MOBILE_MAP_HEIGHT}
                compact={!isDesktop}
              >
                <MapComponent
                  reports={mapReports}
                  height={isDesktop ? DESKTOP_MAP_HEIGHT : MOBILE_MAP_HEIGHT}
                  zoom={5} // 초기 줌: 동네 단위(3)는 너무 확대되어 주변을 좀 더 넓게 보여줌
                  center={mapFocus ?? undefined}
                  onBoundsChange={handleMapBoundsChange}
                  onZoomChange={setMapZoom}
                  onMarkerClick={handleMarkerClick as any}
                  onGroupClick={handleGroupClick as any}
                  selectedMarkerId={selectedMapMarkers?.length === 1 ? (selectedMapMarkers[0] as any)?.id : undefined}
                  isBoundsQueryLoading={isMapLoading || isListLoading}
                  myNeighborhoodLocation={myNeighborhoodLocation}
                  onFarFromHomeChange={setIsFarFromHome}
                />
              </MapInitializationGate>
            </Card>

            {selectedMarkersSection}
          </div>
        )}

        {showFeed && (
          <section className="space-y-4 pb-24 lg:pb-0" aria-label="제보 목록">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="type-h2">{feedHeading}</h2>
                <p className="type-body-sm text-muted-foreground mt-1" aria-live="polite">
                  제보 {totalCount}건
                </p>
              </div>

              <CategoryFilterChips
                value={selectedCategory}
                onChange={handleCategoryChange}
                className="lg:justify-end"
              />
            </div>

            {error ? (
              <UiErrorState
                icon={<AlertTriangle className="h-7 w-7" aria-hidden="true" />}
                title="제보를 불러오지 못했어요"
                description="검색어와 카테고리, 마지막으로 조회한 지역은 그대로 유지돼요"
                primaryAction={{ label: '다시 시도', onClick: () => refetch() }}
              />
            ) : (
            <ReportList
              reports={listReports}
              isLoading={isListLoading}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setPaginationPage}
              emptyMessage={
                <Card className="border-dashed p-10 text-center">
                  <div className="mx-auto max-w-xs space-y-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted">
                      <FileText className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <h3 className="type-h3">
                      {searchQuery ? `'${searchQuery}' 검색 결과가 없어요` : '이 지역에는 아직 제보가 없어요'}
                    </h3>
                    <p className="type-body-sm text-muted-foreground">
                      {searchQuery
                        ? '다른 검색어를 써보거나 카테고리 필터를 해제해보세요'
                        : '첫 번째 제보를 남기거나 지도를 옮겨 다른 곳을 살펴보세요'}
                    </p>
                    <Button className="w-full" onClick={handleComposeReport}>제보하기</Button>
                  </div>
                </Card>
              }
            />
            )}
          </section>
        )}
      </main>

      {/* 모바일 제보하기 — 안전 영역을 지키고 마지막 카드를 가리지 않는다 (UI_V2_CONTRACT.md §3.7) */}
      {!isDesktop && mobileViewMode === 'feed' && (
        <div
          data-testid="mobile-compose-cta"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-4 pt-3 pb-safe backdrop-blur"
        >
          <Button size="lg" className="w-full" onClick={handleComposeReport}>제보하기</Button>
        </div>
      )}

      {/* localhost 접속 가이드 */}
      <LocalhostGuide />
    </div>
  )
}
