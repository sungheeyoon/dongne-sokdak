import { Coordinates } from './entities'

const EARTH_RADIUS_METERS = 6_371_000

export interface GeoBounds {
    north: number
    south: number
    east: number
    west: number
}

function toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180
}

export function distanceMeters(a: Coordinates, b: Coordinates): number {
    const dLat = toRadians(b.lat - a.lat)
    const dLng = toRadians(b.lng - a.lng)
    const lat1 = toRadians(a.lat)
    const lat2 = toRadians(b.lat)

    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2

    return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * 지도 SDK가 아직 마운트되지 않은 피드 첫 화면을 위한 근사 사각 영역.
 * 위·경도 각도 차이를 실제 미터 거리로 환산하므로 서울 밖에서도 같은 반경을 유지한다.
 */
export function boundsAround(center: Coordinates, radiusMeters: number): GeoBounds {
    const angularDistance = radiusMeters / EARTH_RADIUS_METERS
    const latitudeDelta = angularDistance * (180 / Math.PI)
    const longitudeScale = Math.max(0.01, Math.cos(toRadians(center.lat)))
    const longitudeDelta = (angularDistance / longitudeScale) * (180 / Math.PI)

    return {
        north: Math.min(90, center.lat + latitudeDelta),
        south: Math.max(-90, center.lat - latitudeDelta),
        east: Math.min(180, center.lng + longitudeDelta),
        west: Math.max(-180, center.lng - longitudeDelta),
    }
}
