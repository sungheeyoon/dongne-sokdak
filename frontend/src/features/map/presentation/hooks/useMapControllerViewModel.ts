import { useCallback } from 'react'
import { useUIStore } from '@/shared/stores/useUIStore'

export function useMapControllerViewModel() {
    const {
        focusedLocation, setFocusedLocation,
        mapZoom, setMapZoom,
        currentMapBounds, setCurrentMapBounds,
        searchedLocation, setSearchedLocation,
        userCurrentLocation, setUserCurrentLocation,
        useMapBoundsFilter, setUseMapBoundsFilter,
        triggerMapSearch, setTriggerMapSearch,
        selectedMapMarker, setSelectedMapMarker,
    } = useUIStore()

    // 지도 영역(bounds)이 바뀌면 해당 영역 기준으로 제보를 다시 검색한다
    const handleMapBoundsChange = useCallback((bounds: { north: number; south: number; east: number; west: number }) => {
        setCurrentMapBounds(bounds)
        setUseMapBoundsFilter(true)
        setTriggerMapSearch(t => t + 1)
    }, [setCurrentMapBounds, setUseMapBoundsFilter, setTriggerMapSearch])

    // 검색·위치 상태를 모두 초기화하고 지도 초점을 명시적으로 내 동네 좌표로 옮긴다.
    // 내 동네가 없으면 포커스를 비워 fallback 후보값으로 위임한다.
    // "내 동네 변경 저장"과 "내 동네로 돌아가기"는 둘 다 명시적 사용자 의도이므로 이 함수를 공유한다 (ADR-0003).
    const resetToMyNeighborhood = useCallback((neighborhoodLocation?: { lat: number; lng: number } | null) => {
        setFocusedLocation(neighborhoodLocation ?? null)
        setSearchedLocation(null)
        setUserCurrentLocation(null)
        setCurrentMapBounds(null)
        setSelectedMapMarker(null)
        if (process.env.NODE_ENV === 'development') {
            console.log('🏠 내 동네로 이동')
        }
    }, [setFocusedLocation, setSearchedLocation, setUserCurrentLocation, setCurrentMapBounds, setSelectedMapMarker])

    // 검색으로 선택된 위치를 지도 초점으로 설정하고, 잠시 후 그 지역 기준으로 재검색한다
    const handleLocationSearch = useCallback((location: { lat: number; lng: number; address: string; placeName: string }) => {
        if (process.env.NODE_ENV === 'development') {
            console.log('🗺️ 위치 선택됨:', location.placeName)
            console.log('📍 좌표:', location.lat, location.lng)
        }

        setFocusedLocation({ lat: location.lat, lng: location.lng })
        setSearchedLocation({ placeName: location.placeName, address: location.address })
        setUserCurrentLocation(null)

        setUseMapBoundsFilter(true)

        setTimeout(() => {
            if (process.env.NODE_ENV === 'development') {
                console.log('🔄', location.placeName, '지역에서 제보 검색 시작')
            }
            setTriggerMapSearch(prev => prev + 1)
        }, 800)
    }, [setFocusedLocation, setSearchedLocation, setUserCurrentLocation, setUseMapBoundsFilter, setTriggerMapSearch])

    return {
        focusedLocation,
        mapZoom, setMapZoom,
        currentMapBounds,
        searchedLocation,
        userCurrentLocation,
        useMapBoundsFilter, setUseMapBoundsFilter,
        triggerMapSearch, setTriggerMapSearch,
        selectedMapMarker, setSelectedMapMarker,

        handleMapBoundsChange,
        resetToMyNeighborhood,
        handleLocationSearch,
    }
}
