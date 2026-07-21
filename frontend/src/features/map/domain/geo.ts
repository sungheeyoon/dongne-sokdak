import { Coordinates } from './entities'

const EARTH_RADIUS_METERS = 6_371_000

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
