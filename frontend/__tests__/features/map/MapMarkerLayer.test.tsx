import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'
import { MapMarkerLayer } from '@/features/map/presentation/components/MapMarkerLayer'
import React from 'react'

vi.mock('react-kakao-maps-sdk', () => ({
  MarkerClusterer: ({ children }: { children: React.ReactNode }) => <div data-testid="clusterer">{children}</div>
}))

vi.mock('@/components/MemoizedMapMarker', () => ({
  default: ({ id, onClick }: { id: string, onClick: (id: string) => void }) => (
    <div data-testid="marker" data-id={id} onClick={() => onClick(id)} />
  )
}))

describe('MapMarkerLayer', () => {
  const generateReports = (count: number, bounds: { north: number, south: number, east: number, west: number }) => {
    const reports = []
    for (let i = 0; i < count; i++) {
      reports.push({
        id: `r-${i}`,
        location: {
          lat: bounds.south + (bounds.north - bounds.south) * Math.random(),
          lng: bounds.west + (bounds.east - bounds.west) * Math.random()
        }
      })
    }
    return reports as any[]
  }

  it('should cull markers outside of bounds', () => {
    // Current bounds
    const bounds = { north: 37.6, south: 37.4, east: 127.1, west: 126.9 }
    
    // Generate 50 inside, 50 outside
    const insideReports = generateReports(50, bounds)
    const outsideReports = generateReports(50, { north: 38.6, south: 38.4, east: 128.1, west: 127.9 })
    
    const allReports = [...insideReports, ...outsideReports]

    const { getAllByTestId } = render(
      <MapMarkerLayer 
        map={null} 
        reports={allReports} 
        currentBounds={bounds} 
        onMarkerClick={vi.fn()} 
      />
    )

    const markers = getAllByTestId('marker')
    expect(markers.length).toBe(50) // Only the 50 inside should be rendered
  })

  it('should handle marker click and call map panTo and setLevel if needed', async () => {
    vi.useFakeTimers()

    const mockMap = {
      panTo: vi.fn(),
      getLevel: vi.fn().mockReturnValue(6), // current level 6 > target level 3
      setLevel: vi.fn()
    }

    const mockReport = {
      id: 'test-1',
      location: { lat: 37.5, lng: 127.0 },
      category: 'INFRASTRUCTURE'
    } as any

    const onMarkerClick = vi.fn()

    // Mock kakao maps window object
    window.kakao = {
      maps: {
        LatLng: class {
          lat: number;
          lng: number;
          constructor(lat: number, lng: number) {
            this.lat = lat;
            this.lng = lng;
          }
        } as any
      }
    } as any

    const { getByTestId } = render(
      <MapMarkerLayer 
        map={mockMap} 
        reports={[mockReport]} 
        currentBounds={null} 
        onMarkerClick={onMarkerClick} 
      />
    )

    const marker = getByTestId('marker')
    
    act(() => {
      fireEvent.click(marker)
    })

    expect(mockMap.panTo).toHaveBeenCalled()
    expect(onMarkerClick).toHaveBeenCalledWith(mockReport)

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(mockMap.setLevel).toHaveBeenCalledWith(3, { animate: { duration: 500 } })

    vi.useRealTimers()
  })
})
