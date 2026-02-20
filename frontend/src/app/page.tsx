'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useUIStore } from '@/stores/useUIStore'
import Header from '@/components/Header'
import ReportCard from '@/components/ReportCard'
import { AuthDialog } from '@/components/auth/AuthDialog'
import ReportModal from '@/components/ReportModal'
import dynamic from 'next/dynamic'
import { ReportCategory, Report } from '@/types'
import { useQuery } from '@tanstack/react-query'
import { getReports, getReportsInBounds } from '@/lib/api/reports'
import { useMyProfile } from '@/hooks/useProfile'
import UnifiedSearch from '@/components/UnifiedSearch'
import { MapPin, FileText, X } from 'lucide-react'
import LoadingSpinner, { CardSkeleton } from '@/components/ui/LoadingSpinner'
import ErrorDisplay from '@/components/ui/ErrorDisplay'
import LocalhostGuide from '@/components/ui/LocalhostGuide'
import MarkerIcon from '@/components/ui/MarkerIcon'
import { CurrentRegionButton } from '@/components/ui'
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
    mapCenter, setMapCenter,
    searchedLocation, setSearchedLocation,
    userCurrentLocation, setUserCurrentLocation,
    currentMapBounds, setCurrentMapBounds,
    triggerMapSearch, setTriggerMapSearch,
    useMapBoundsFilter, setUseMapBoundsFilter,
    selectedMapMarker, setSelectedMapMarker
  } = useUIStore()

  // 행정동 기반 동네 표시명 계산 함수
  const getNeighborhoodDisplayName = (profile: { neighborhood?: { address: string; place_name: string } }) => {
    if (!profile?.neighborhood) return '내 동네'

    const adminAddress = formatToAdministrativeAddress(profile.neighborhood.address)
    return adminAddress && adminAddress !== '주소 없음' ? adminAddress : profile.neighborhood.place_name
  }

  const [selectedCategory, setSelectedCategory] = useState<string>('all')
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


  // 현재 사용 중인 위치 (우선순위: 마지막으로 드래그한 영역 > 지역검색 위치 > 내 동네 > 사용자 현재 위치)
  const activeLocation = useMemo(() => {
    // 1. 가장 마지막으로 보고 있던 맵 영역이 있다면, 그 영역의 정중앙을 복구
    if (useMapBoundsFilter && currentMapBounds) {
      return {
        lat: (currentMapBounds.north + currentMapBounds.south) / 2,
        lng: (currentMapBounds.east + currentMapBounds.west) / 2
      }
    }
    // 2. 지역 검색으로 설정된 위치가 있으면 그것을 우선 사용
    if (mapCenter) {
      return mapCenter
    }
    // 3. 그 다음은 내 동네, 사용자 현재 위치 순
    return myNeighborhoodLocation ?? userCurrentLocation ?? null
  }, [useMapBoundsFilter, currentMapBounds, mapCenter, myNeighborhoodLocation, userCurrentLocation])

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
    setCurrentMapBounds(prev => {
      // Check if the bounds actually changed significantly (tolerance for accidental small drags)
      // 0.002 degrees is approximately 200 meters. 
      if (prev &&
        Math.abs(prev.north - bounds.north) < 0.002 &&
        Math.abs(prev.south - bounds.south) < 0.002 &&
        Math.abs(prev.east - bounds.east) < 0.002 &&
        Math.abs(prev.west - bounds.west) < 0.002) {
        return prev;
      }
      // 맵 이동 시 즉시 바운딩 박스 검색 시작
      setUseMapBoundsFilter(true)

      // 디바운싱: 지도를 드래그하는 도중에는 계속 호출되지 않고 적당한 타이밍에 갱신
      if (process.env.NODE_ENV === 'development') {
        console.log('🗺️ 맵 영역 이동 감지, 자동 갱신:', bounds)
      }
      setTriggerMapSearch(t => t + 1)

      return bounds;
    })
  }, [])

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
        <AuthDialog />
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
                  {/* [이 지역 재검색] 버튼 삭제: 맵 이동시 자동 로딩됨 */}
                </div>
              </div>
            </div>

            <MapComponent
              reports={displayReports}
              height="450px"
              center={activeLocation ?? undefined}
              onBoundsChange={handleMapBoundsChange}
              onMarkerClick={handleMarkerClick}
              selectedMarkerId={selectedMapMarker?.id}
            />
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