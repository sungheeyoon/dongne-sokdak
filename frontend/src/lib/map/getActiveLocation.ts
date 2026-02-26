type LatLng = { lat: number; lng: number }

export function getActiveLocation({
    focusedLocation,
    isInitialLoadDone,
    myNeighborhoodLocation,
    cachedLastCenter,
    userCurrentLocation,
    fallbackCenter,
}: {
    focusedLocation: LatLng | null
    isInitialLoadDone: boolean
    myNeighborhoodLocation: LatLng | null
    cachedLastCenter: LatLng | null
    userCurrentLocation: LatLng | null
    fallbackCenter: LatLng
}): LatLng {
    // 1. 사용자가 명시적으로 포커스한 위치
    if (focusedLocation) {
        return focusedLocation
    }

    // 2. 초기 로드 1회 → 내 동네
    if (!isInitialLoadDone && myNeighborhoodLocation) {
        return myNeighborhoodLocation
    }

    // 3. 마지막으로 보고 있던 위치 (페이지 복귀)
    if (cachedLastCenter) {
        return cachedLastCenter
    }

    // 4. 사용자 현재 위치
    if (userCurrentLocation) {
        return userCurrentLocation
    }

    // 5. 앱내 개발자가 설정한 기본 위치 (보험)
    return fallbackCenter
}
