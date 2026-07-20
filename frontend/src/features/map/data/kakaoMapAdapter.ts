import { waitForKakaoMaps } from '@/lib/map/kakaoMapUtils'

export class KakaoMapAdapter {
    async ready(): Promise<boolean> {
        return waitForKakaoMaps()
    }

    panTo(map: any, lat: number, lng: number): void {
        map.panTo(new window.kakao.maps.LatLng(lat, lng))
    }

    setCenter(map: any, lat: number, lng: number): void {
        map.setCenter(new window.kakao.maps.LatLng(lat, lng))
    }

    setLevel(map: any, level: number, options?: { animate?: { duration: number } }): void {
        map.setLevel(level, options)
    }

    getBounds(map: any): { north: number; south: number; east: number; west: number } | null {
        const bounds = map.getBounds()
        if (!bounds) return null

        const sw = bounds.getSouthWest()
        const ne = bounds.getNorthEast()
        return {
            south: sw.getLat(),
            west: sw.getLng(),
            north: ne.getLat(),
            east: ne.getLng(),
        }
    }

    getCenter(map: any): { lat: number; lng: number } {
        const center = map.getCenter()
        return { lat: center.getLat(), lng: center.getLng() }
    }

    getLevel(map: any): number {
        return map.getLevel()
    }

    addListener(map: any, event: string, handler: (...args: any[]) => void): void {
        window.kakao.maps.event.addListener(map, event, handler)
    }

    removeListener(map: any, event: string, handler: (...args: any[]) => void): void {
        window.kakao.maps.event.removeListener(map, event, handler)
    }
}

export const defaultKakaoMapAdapter = new KakaoMapAdapter()
