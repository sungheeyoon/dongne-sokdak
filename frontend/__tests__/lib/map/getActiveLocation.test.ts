import { describe, it, expect } from 'vitest'
import { getActiveLocation } from '@/lib/map/getActiveLocation'

const fallbackCenter = { lat: 37.5665, lng: 126.9780 }

describe('getActiveLocation (지도 초점 resolution)', () => {
    it('prefers an explicitly focused location over everything else', () => {
        const result = getActiveLocation({
            focusedLocation: { lat: 1, lng: 1 },
            isInitialLoadDone: true,
            myNeighborhoodLocation: { lat: 2, lng: 2 },
            userCurrentLocation: { lat: 3, lng: 3 },
            fallbackCenter
        })

        expect(result).toEqual({ lat: 1, lng: 1 })
    })

    it('falls back to my neighborhood on the first load only', () => {
        const result = getActiveLocation({
            focusedLocation: null,
            isInitialLoadDone: false,
            myNeighborhoodLocation: { lat: 2, lng: 2 },
            userCurrentLocation: { lat: 3, lng: 3 },
            fallbackCenter
        })

        expect(result).toEqual({ lat: 2, lng: 2 })
    })

    it('does not return to my neighborhood after the initial load has completed', () => {
        const result = getActiveLocation({
            focusedLocation: null,
            isInitialLoadDone: true,
            myNeighborhoodLocation: { lat: 2, lng: 2 },
            userCurrentLocation: { lat: 3, lng: 3 },
            fallbackCenter
        })

        expect(result).toEqual({ lat: 3, lng: 3 })
    })

    it('falls back to the user current location when neighborhood is unavailable', () => {
        const result = getActiveLocation({
            focusedLocation: null,
            isInitialLoadDone: true,
            myNeighborhoodLocation: null,
            userCurrentLocation: { lat: 3, lng: 3 },
            fallbackCenter
        })

        expect(result).toEqual({ lat: 3, lng: 3 })
    })

    it('falls back to the fallback center when nothing else is available', () => {
        const result = getActiveLocation({
            focusedLocation: null,
            isInitialLoadDone: true,
            myNeighborhoodLocation: null,
            userCurrentLocation: null,
            fallbackCenter
        })

        expect(result).toEqual(fallbackCenter)
    })
})
