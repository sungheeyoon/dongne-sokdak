import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MapMarkerLayer } from '@/features/map/presentation/components/MapMarkerLayer'
import React from 'react'

vi.mock('react-kakao-maps-sdk', () => ({
  MarkerClusterer: ({ children }: { children: React.ReactNode }) => <div data-testid="clusterer">{children}</div>
}))

vi.mock('@/components/MemoizedMapMarker', () => ({
  default: ({ id }: { id: string }) => <div data-testid="marker" data-id={id} />
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
})
