import { useCallback } from 'react';
import { useUIStore } from '@/shared/stores/useUIStore';

export function useMapController() {
    const {
        mapCenter, setMapCenter,
        currentMapBounds, setCurrentMapBounds,
        searchedLocation, setSearchedLocation,
        userCurrentLocation, setUserCurrentLocation,
        useMapBoundsFilter, setUseMapBoundsFilter,
        triggerMapSearch, setTriggerMapSearch,
        selectedMapMarker, setSelectedMapMarker
    } = useUIStore();

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
            setUseMapBoundsFilter(true);

            if (process.env.NODE_ENV === 'development') {
                console.log('🗺️ 맵 영역 이동 감지, 자동 갱신:', bounds);
            }
            setTriggerMapSearch(t => t + 1);

            return bounds;
        });
    }, [setCurrentMapBounds, setUseMapBoundsFilter, setTriggerMapSearch]);

    const resetToMyNeighborhood = useCallback(() => {
        setMapCenter(null);
        setSearchedLocation(null);
        setUserCurrentLocation(null);
        setCurrentMapBounds(null); // 맵 영역을 초기화하여 activeLocation이 내 동네로 이동하게 만듦
        setSelectedMapMarker(null);
        if (process.env.NODE_ENV === 'development') {
            console.log('🏠 내 동네로 돌아가기');
        }
    }, [setMapCenter, setSearchedLocation, setUserCurrentLocation, setCurrentMapBounds, setSelectedMapMarker]);

    const handleLocationSearch = useCallback((location: { lat: number; lng: number; address: string; placeName: string }) => {
        if (process.env.NODE_ENV === 'development') {
            console.log('🗺️ 위치 선택됨:', location.placeName);
            console.log('📍 좌표:', location.lat, location.lng);
        }

        setMapCenter({ lat: location.lat, lng: location.lng });
        setSearchedLocation({ placeName: location.placeName, address: location.address });
        setUserCurrentLocation(null);

        setUseMapBoundsFilter(true);

        setTimeout(() => {
            if (process.env.NODE_ENV === 'development') {
                console.log('🔄', location.placeName, '지역에서 제보 검색 시작');
            }
            setTriggerMapSearch(prev => prev + 1);
        }, 800);
    }, [setMapCenter, setSearchedLocation, setUserCurrentLocation, setUseMapBoundsFilter, setTriggerMapSearch]);

    return {
        mapCenter, setMapCenter,
        currentMapBounds, setCurrentMapBounds,
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
