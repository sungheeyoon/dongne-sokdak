import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useMapFocusViewModel } from '@/features/map/presentation/hooks/useMapFocusViewModel'

type LatLng = { lat: number; lng: number }
type Props = {
    focusedLocation: LatLng | null
    myNeighborhoodLocation: LatLng | null
    userCurrentLocation: LatLng | null
    isAuthInitialized: boolean
    isLoadingProfile: boolean
}

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.9780 }
const neighborhood = { lat: 2, lng: 2 }

describe('useMapFocusViewModel (내 동네 fallback freeze)', () => {
    it('does not freeze the fallback while auth session is still restoring, even if profile isLoading reads false', () => {
        const { result, rerender } = renderHook<LatLng, Props>(
            (props) => useMapFocusViewModel(props),
            {
                initialProps: {
                    focusedLocation: null,
                    myNeighborhoodLocation: null,
                    userCurrentLocation: null,
                    isAuthInitialized: false,
                    isLoadingProfile: false, // profileQuery is merely disabled (enabled: !!user), not actually done
                },
            }
        )

        // Auth resolves and now reveals the real neighborhood — since the fallback
        // was never frozen, it must still be free to pick this up.
        rerender({
            focusedLocation: null,
            myNeighborhoodLocation: neighborhood,
            userCurrentLocation: null,
            isAuthInitialized: true,
            isLoadingProfile: false,
        })

        expect(result.current).toEqual(neighborhood)
    })

    it('freezes the fallback to my neighborhood once auth is initialized and profile has loaded', () => {
        const { result, rerender } = renderHook<LatLng, Props>(
            (props) => useMapFocusViewModel(props),
            {
                initialProps: {
                    focusedLocation: null,
                    myNeighborhoodLocation: neighborhood,
                    userCurrentLocation: null,
                    isAuthInitialized: true,
                    isLoadingProfile: false,
                },
            }
        )

        expect(result.current).toEqual(neighborhood)

        // Neighborhood disappearing afterwards (e.g. deleted) must not move the map (ADR-0003).
        rerender({
            focusedLocation: null,
            myNeighborhoodLocation: null,
            userCurrentLocation: null,
            isAuthInitialized: true,
            isLoadingProfile: false,
        })

        expect(result.current).toEqual(neighborhood)
    })

    it('falls back to the hardcoded default center for a logged-out user once auth is initialized', () => {
        const { result } = renderHook(() => useMapFocusViewModel({
            focusedLocation: null,
            myNeighborhoodLocation: null,
            userCurrentLocation: null,
            isAuthInitialized: true,
            isLoadingProfile: false,
        }))

        expect(result.current).toEqual(DEFAULT_CENTER)
    })

    it('always prefers an explicitly focused location regardless of freeze state', () => {
        const { result } = renderHook(() => useMapFocusViewModel({
            focusedLocation: { lat: 9, lng: 9 },
            myNeighborhoodLocation: neighborhood,
            userCurrentLocation: null,
            isAuthInitialized: false,
            isLoadingProfile: false,
        }))

        expect(result.current).toEqual({ lat: 9, lng: 9 })
    })

    it('does not freeze while the profile query is actually fetching', () => {
        const { result, rerender } = renderHook<LatLng, Props>(
            (props) => useMapFocusViewModel(props),
            {
                initialProps: {
                    focusedLocation: null,
                    myNeighborhoodLocation: null,
                    userCurrentLocation: null,
                    isAuthInitialized: true,
                    isLoadingProfile: true,
                },
            }
        )

        rerender({
            focusedLocation: null,
            myNeighborhoodLocation: neighborhood,
            userCurrentLocation: null,
            isAuthInitialized: true,
            isLoadingProfile: false,
        })

        expect(result.current).toEqual(neighborhood)
    })
})
