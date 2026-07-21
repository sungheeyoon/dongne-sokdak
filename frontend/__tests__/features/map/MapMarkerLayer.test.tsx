import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'
import { MapMarkerLayer } from '@/features/map/presentation/components/MapMarkerLayer'
import React from 'react'

const { clustererProps } = vi.hoisted(() => ({
  clustererProps: { current: {} as Record<string, any> }
}))

vi.mock('react-kakao-maps-sdk', () => ({
  MarkerClusterer: ({ children, ...props }: { children: React.ReactNode } & Record<string, any>) => {
    clustererProps.current = props
    return <div data-testid="clusterer">{children}</div>
  }
}))

vi.mock('@/components/MemoizedMapMarker', () => ({
  default: ({ id, onClick }: { id: string, onClick: (id: string) => void }) => (
    <div data-testid="marker" data-id={id} onClick={() => onClick(id)} />
  )
}))

// map.setLevel/setCenter/panTo가 실제 지도 상태를 바꾸는 것처럼 흉내 내는 stateful adapter.
// 실제 카카오 SDK처럼 'idle' 리스너를 여러 개 동시에 등록할 수 있게 배열로 관리한다 —
// 애니메이션을 취소했을 때 오래된 리스너가 살아있어도 문제가 없는지 검증하기 위함.
function createStatefulAdapter(initialLevel: number, initialCenter = { lat: 0, lng: 0 }) {
  let level = initialLevel
  let center = initialCenter
  let idleHandlers: Array<() => void> = []

  return {
    state: {
      get level() { return level },
      get center() { return center },
    },
    getLevel: vi.fn(() => level),
    getCenter: vi.fn(() => center),
    setLevel: vi.fn((_map: any, l: number) => { level = l }),
    setCenter: vi.fn((_map: any, lat: number, lng: number) => { center = { lat, lng } }),
    panTo: vi.fn((_map: any, lat: number, lng: number) => { center = { lat, lng } }),
    setBounds: vi.fn(),
    addListener: vi.fn((_map: any, event: string, handler: () => void) => {
      if (event === 'idle') idleHandlers.push(handler)
    }),
    removeListener: vi.fn((_map: any, event: string, handler: () => void) => {
      if (event === 'idle') idleHandlers = idleHandlers.filter(h => h !== handler)
    }),
    fireIdle: () => {
      const snapshot = [...idleHandlers]
      snapshot.forEach(h => h())
    },
  }
}

describe('MapMarkerLayer', () => {
  beforeEach(() => {
    clustererProps.current = {}
  })

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
    const bounds = { north: 37.6, south: 37.4, east: 127.1, west: 126.9 }

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
    expect(markers.length).toBe(50)
  })

  it('should pan to the clicked marker, then only start the zoom animation once the pan actually settles (idle), never on a guessed timer', () => {
    const mockMap = {}
    const adapter = createStatefulAdapter(6) // current level 6 > target level 3

    const mockReport = {
      id: 'test-1',
      location: { lat: 37.5, lng: 127.0 },
      category: 'INFRASTRUCTURE'
    } as any

    const onMarkerClick = vi.fn()

    const { getByTestId } = render(
      <MapMarkerLayer
        map={mockMap}
        reports={[mockReport]}
        currentBounds={null}
        onMarkerClick={onMarkerClick}
        adapter={adapter as any}
      />
    )

    const marker = getByTestId('marker')

    act(() => {
      fireEvent.click(marker)
    })

    expect(adapter.panTo).toHaveBeenCalledWith(mockMap, 37.5, 127.0)
    expect(onMarkerClick).toHaveBeenCalledWith(mockReport)
    // Zoom must not start before the pan has settled.
    expect(adapter.setLevel).not.toHaveBeenCalled()

    // Pan settles.
    act(() => {
      adapter.fireIdle()
    })

    // 6 -> 3 is a 3-level jump; Kakao only animates <=2 levels at once, so it must
    // step through an intermediate level (6 -> 4) rather than jumping straight to 3.
    expect(adapter.setLevel).toHaveBeenCalledWith(mockMap, 4, { animate: { duration: 300 } })
    expect(adapter.state.level).toBe(4)

    // First zoom step settles.
    act(() => {
      adapter.fireIdle()
    })

    expect(adapter.setLevel).toHaveBeenLastCalledWith(mockMap, 3, { animate: { duration: 300 } })
    expect(adapter.state.level).toBe(3)

    // Reaching the target level ends the chain — no further setLevel calls.
    act(() => {
      adapter.fireIdle()
    })
    expect(adapter.setLevel).toHaveBeenCalledTimes(2)
  })

  it('should not animate zoom or wait for idle when already at the target level and position', () => {
    const mockMap = {}
    const adapter = createStatefulAdapter(3, { lat: 37.5, lng: 127.0 })

    const mockReport = {
      id: 'test-1',
      location: { lat: 37.5, lng: 127.0 },
      category: 'INFRASTRUCTURE'
    } as any

    const { getByTestId } = render(
      <MapMarkerLayer
        map={mockMap}
        reports={[mockReport]}
        currentBounds={null}
        onMarkerClick={vi.fn()}
        adapter={adapter as any}
      />
    )

    act(() => {
      fireEvent.click(getByTestId('marker'))
    })

    expect(adapter.panTo).not.toHaveBeenCalled()
    expect(adapter.setLevel).not.toHaveBeenCalled()
  })

  it('should disable the SDK default click-zoom and take over cluster clicks itself', () => {
    const adapter = createStatefulAdapter(8)

    render(
      <MapMarkerLayer
        map={{}}
        reports={[]}
        currentBounds={null}
        onMarkerClick={vi.fn()}
        adapter={adapter as any}
      />
    )

    expect(clustererProps.current.disableClickZoom).toBe(true)
    expect(typeof clustererProps.current.onClusterclick).toBe('function')
  })

  it('should animate the clicked cluster into view, zooming to the level its bounds fit into rather than one fixed step', () => {
    const mockMap = {}
    const adapter = createStatefulAdapter(8)
    // The SDK computes the "fit" level synchronously as a side effect of setBounds —
    // stand in for that the way the real Kakao map would.
    adapter.setBounds.mockImplementation(() => { adapter.setLevel(mockMap, 4) })

    render(
      <MapMarkerLayer
        map={mockMap}
        reports={[]}
        currentBounds={null}
        onMarkerClick={vi.fn()}
        adapter={adapter as any}
      />
    )

    const mockCluster = {
      getBounds: () => 'fake-bounds',
      getCenter: () => ({ getLat: () => 37.55, getLng: () => 127.05 }),
    }

    act(() => {
      clustererProps.current.onClusterclick(null, mockCluster)
    })

    // Measured the fit level via a synchronous measure-then-revert against the real bounds...
    expect(adapter.setBounds).toHaveBeenCalledWith(mockMap, 'fake-bounds')
    // ...and left the map exactly where it started before animating anything.
    expect(adapter.state.level).toBe(8)
    expect(adapter.panTo).toHaveBeenCalledWith(mockMap, 37.55, 127.05)
    expect(adapter.setLevel).not.toHaveBeenCalledWith(mockMap, expect.any(Number), { animate: expect.anything() })

    act(() => {
      adapter.fireIdle()
    })

    // 8 -> 4 is a 4-level jump: steps through 6 first (max 2 levels per animate call).
    expect(adapter.setLevel).toHaveBeenCalledWith(mockMap, 6, { animate: { duration: 300 } })

    act(() => {
      adapter.fireIdle()
    })

    expect(adapter.setLevel).toHaveBeenLastCalledWith(mockMap, 4, { animate: { duration: 300 } })
    expect(adapter.state.level).toBe(4)
  })

  it('should cancel an in-flight focus animation when a new marker is clicked before it settles', () => {
    const mockMap = {}
    const adapter = createStatefulAdapter(6)

    const reportA = { id: 'a', location: { lat: 37.5, lng: 127.0 }, category: 'INFRASTRUCTURE' } as any
    const reportB = { id: 'b', location: { lat: 37.6, lng: 127.1 }, category: 'INFRASTRUCTURE' } as any

    const { getAllByTestId } = render(
      <MapMarkerLayer
        map={mockMap}
        reports={[reportA, reportB]}
        currentBounds={null}
        onMarkerClick={vi.fn()}
        adapter={adapter as any}
      />
    )

    act(() => {
      fireEvent.click(getAllByTestId('marker')[0])
    })
    expect(adapter.panTo).toHaveBeenLastCalledWith(mockMap, 37.5, 127.0)

    // A second click supersedes the first before its pan ever settles.
    act(() => {
      fireEvent.click(getAllByTestId('marker')[1])
    })
    expect(adapter.panTo).toHaveBeenLastCalledWith(mockMap, 37.6, 127.1)

    // The stale idle handler from the first animation must not still drive a zoom step.
    act(() => {
      adapter.fireIdle()
    })

    expect(adapter.setLevel).toHaveBeenCalledWith(mockMap, 4, { animate: { duration: 300 } })
    expect(adapter.setLevel).toHaveBeenCalledTimes(1)
  })
})
