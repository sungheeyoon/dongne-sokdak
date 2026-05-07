import { useCallback } from 'react';
import { useUIStore } from '@/shared/stores/useUIStore';

export function useMapController() {
    const {
        mapCenter, setMapCenter,
        mapZoom, setMapZoom,
        currentMapBounds, setCurrentMapBounds,
        currentMapCenter, setCurrentMapCenter,
        searchedLocation, setSearchedLocation,
        userCurrentLocation, setUserCurrentLocation,
        useMapBoundsFilter, setUseMapBoundsFilter,
        triggerMapSearch, setTriggerMapSearch,
        selectedMapMarker, setSelectedMapMarker
    } = useUIStore();

    const handleMapBoundsChange = useCallback((bounds: { north: number; south: number; east: number; west: number }, center?: { lat: number, lng: number }) => {
        setCurrentMapBounds(bounds);
        if (center) {
            setCurrentMapCenter(center);
        }
        setUseMapBoundsFilter(true);
        setTriggerMapSearch(t => t + 1);
    }, [setCurrentMapBounds, setCurrentMapCenter, setUseMapBoundsFilter, setTriggerMapSearch]);

    const resetToMyNeighborhood = useCallback(() => {
        setMapCenter(null);
        setSearchedLocation(null);
        setUserCurrentLocation(null);
        setCurrentMapBounds(null); // 맵 영역을 초기화하여 activeLocation이 내 동네로 이동하게 만듦
        setCurrentMapCenter(null);
        setSelectedMapMarker(null);
        if (process.env.NODE_ENV === 'development') {
            if (process.env.NODE_ENV === 'development') console.log('🏠 내 동네로 돌아가기');
        }
    }, [setMapCenter, setSearchedLocation, setUserCurrentLocation, setCurrentMapBounds, setCurrentMapCenter, setSelectedMapMarker]);

    const handleLocationSearch = useCallback((location: { lat: number; lng: number; address: string; placeName: string }) => {
        if (process.env.NODE_ENV === 'development') {
            if (process.env.NODE_ENV === 'development') console.log('🗺️ 위치 선택됨:', location.placeName);
            if (process.env.NODE_ENV === 'development') console.log('📍 좌표:', location.lat, location.lng);
        }

        setMapCenter({ lat: location.lat, lng: location.lng });
        setSearchedLocation({ placeName: location.placeName, address: location.address });
        setUserCurrentLocation(null);

        setUseMapBoundsFilter(true);

        setTimeout(() => {
            if (process.env.NODE_ENV === 'development') {
                if (process.env.NODE_ENV === 'development') console.log('🔄', location.placeName, '지역에서 제보 검색 시작');
            }
            setTriggerMapSearch(prev => prev + 1);
        }, 800);
    }, [setMapCenter, setSearchedLocation, setUserCurrentLocation, setUseMapBoundsFilter, setTriggerMapSearch]);

    return {
        mapCenter, setMapCenter,
        mapZoom, setMapZoom,
        currentMapBounds, setCurrentMapBounds,
        currentMapCenter, setCurrentMapCenter,
        searchedLocation, setSearchedLocation,
        userCurrentLocation, setUserCurrentLocation,
        useMapBoundsFilter, setUseMapBoundsFilter,
        triggerMapSearch, setTriggerMapSearch,
        selectedMapMarker, setSelectedMapMarker,

        handleMapBoundsChange,
        resetToMyNeighborhood,
        handleLocationSearch,
    };
}
