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

vi.mock('@/features/map/presentation/components/ProximityGroupMarker', () => ({
  ProximityGroupMarker: ({ count, onClick }: { count: number, onClick: () => void }) => (
    <div data-testid="proximity-group-marker" data-count={count} onClick={onClick} />
  )
}))

// map.setLevel/setCenter/panTo가 실제 지도 상태를 바꾸는 것처럼 흉내 내는 stateful adapter.
// 실제 카카오 SDK처럼 'idle' 리스너를 여러 개 동시에 등록할 수 있게 배열로 관리한다 —
// 애니메이션을 취소했을 때 오래된 리스너가 살아있어도 문제가 없는지 검증하기 위함.
function createStatefulAdapter(initialLevel: number, initialCenter = { lat: 0, lng: 0 }) {
  let level = initialLevel
  let center = initialCenter
  let idleHandlers: Array<() => void> = []
  let zoomChangedHandlers: Array<() => void> = []

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
      if (event === 'zoom_changed') zoomChangedHandlers.push(handler)
    }),
    removeListener: vi.fn((_map: any, event: string, handler: () => void) => {
      if (event === 'idle') idleHandlers = idleHandlers.filter(h => h !== handler)
      if (event === 'zoom_changed') zoomChangedHandlers = zoomChangedHandlers.filter(h => h !== handler)
    }),
    fireIdle: () => {
      const snapshot = [...idleHandlers]
      snapshot.forEach(h => h())
    },
    // 실제 카카오처럼, 레벨을 바꾸고 나서 zoom_changed 구독자에게 알린다.
    zoomTo: (l: number) => {
      level = l
      const snapshot = [...zoomChangedHandlers]
      snapshot.forEach(h => h())
    },
  }
}

describe('MapMarkerLayer', () => {
  beforeEach(() => {
    clustererProps.current = {}
  })

  const generateReports = (
    count: number,
    bounds: { north: number, south: number, east: number, west: number },
    idPrefix: string
  ) => {
    const columns = Math.ceil(Math.sqrt(count))
    return Array.from({ length: count }, (_, index) => {
      const row = Math.floor(index / columns)
      const column = index % columns
      return {
        id: `${idPrefix}-${index}`,
        location: {
          lat: bounds.south + (bounds.north - bounds.south) * ((row + 1) / (columns + 1)),
          lng: bounds.west + (bounds.east - bounds.west) * ((column + 1) / (columns + 1))
        }
      }
    }) as any[]
  }

  it('renders only 80 in-viewport markers from a deterministic 500-report input', () => {
    const bounds = { north: 37.6, south: 37.4, east: 127.1, west: 126.9 }

    const insideReports = generateReports(80, bounds, 'inside')
    const outsideReports = generateReports(
      420,
      { north: 38.6, south: 38.4, east: 128.1, west: 127.9 },
      'outside'
    )

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
    expect(allReports).toHaveLength(500)
    expect(markers).toHaveLength(80)
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

describe('MapMarkerLayer — proximity group display tiers (ADR-0008)', () => {
  const near = (id: string, offsetMeters: number) => ({
    id,
    location: { lat: 37.5665 + offsetMeters / 111_000, lng: 126.9780 },
    category: 'INFRASTRUCTURE'
  }) as any

  it('renders the native Kakao clusterer at zoom >= 5, ignoring proximity groups', () => {
    const adapter = createStatefulAdapter(5)
    const reports = [near('a', 0), near('b', 10)] // 10m apart — would group at a lower zoom

    const { getByTestId, queryByTestId } = render(
      <MapMarkerLayer
        map={{}}
        reports={reports}
        currentBounds={null}
        onMarkerClick={vi.fn()}
        adapter={adapter as any}
      />
    )

    expect(getByTestId('clusterer')).toBeInTheDocument()
    expect(queryByTestId('proximity-group-marker')).not.toBeInTheDocument()
  })

  it('merges reports within 30m into a single proximity group marker at zoom 3-4', () => {
    const adapter = createStatefulAdapter(4)
    const reports = [near('a', 0), near('b', 10), near('c', 1000)] // c is 1km away, stays separate

    const { getByTestId, getAllByTestId } = render(
      <MapMarkerLayer
        map={{}}
        reports={reports}
        currentBounds={null}
        onMarkerClick={vi.fn()}
        adapter={adapter as any}
      />
    )

    const groupMarker = getByTestId('proximity-group-marker')
    expect(groupMarker.getAttribute('data-count')).toBe('2')
    // c has no neighbor within 30m, so it renders as a plain individual marker.
    expect(getAllByTestId('marker')).toHaveLength(1)
  })

  it('ignores proximity groups and renders every report individually below zoom 3', () => {
    const adapter = createStatefulAdapter(2)
    const reports = [near('a', 0), near('b', 10)] // 10m apart — would group at zoom 3-4

    const { getAllByTestId, queryByTestId } = render(
      <MapMarkerLayer
        map={{}}
        reports={reports}
        currentBounds={null}
        onMarkerClick={vi.fn()}
        adapter={adapter as any}
      />
    )

    expect(queryByTestId('proximity-group-marker')).not.toBeInTheDocument()
    expect(getAllByTestId('marker')).toHaveLength(2)
  })

  it('calls onGroupClick with every member and the group center on group click, without panning or zooming the map', () => {
    const adapter = createStatefulAdapter(4)
    const reports = [near('a', 0), near('b', 10)]
    const onGroupClick = vi.fn()

    const { getByTestId } = render(
      <MapMarkerLayer
        map={{}}
        reports={reports}
        currentBounds={null}
        onMarkerClick={vi.fn()}
        onGroupClick={onGroupClick}
        adapter={adapter as any}
      />
    )

    act(() => {
      fireEvent.click(getByTestId('proximity-group-marker'))
    })

    expect(onGroupClick).toHaveBeenCalledTimes(1)
    const [members, center] = onGroupClick.mock.calls[0]
    expect(members.map((m: any) => m.id).sort()).toEqual(['a', 'b'])
    expect(center.lat).toBeCloseTo((reports[0].location.lat + reports[1].location.lat) / 2, 10)
    expect(center.lng).toBeCloseTo(reports[0].location.lng, 10)
    expect(adapter.panTo).not.toHaveBeenCalled()
    expect(adapter.setLevel).not.toHaveBeenCalled()
  })

  it('does nothing on group click when onGroupClick is not provided', () => {
    const adapter = createStatefulAdapter(4)
    const reports = [near('a', 0), near('b', 10)]

    const { getByTestId } = render(
      <MapMarkerLayer
        map={{}}
        reports={reports}
        currentBounds={null}
        onMarkerClick={vi.fn()}
        adapter={adapter as any}
      />
    )

    expect(() => {
      act(() => {
        fireEvent.click(getByTestId('proximity-group-marker'))
      })
    }).not.toThrow()

    expect(adapter.panTo).not.toHaveBeenCalled()
    expect(adapter.setLevel).not.toHaveBeenCalled()
  })

  it('keeps group membership stable across bounds/pan changes, only culling offscreen groups from rendering', () => {
    const adapter = createStatefulAdapter(4)
    const reports = [near('a', 0), near('b', 10)] // 10m apart — one group of 2

    const boundsContainingBoth = { north: 90, south: -90, east: 180, west: -180 }
    const { getByTestId, rerender, queryByTestId } = render(
      <MapMarkerLayer
        map={{}}
        reports={reports}
        currentBounds={boundsContainingBoth}
        onMarkerClick={vi.fn()}
        adapter={adapter as any}
      />
    )

    expect(getByTestId('proximity-group-marker').getAttribute('data-count')).toBe('2')

    // Pan so the bounds now only contain report 'a' — 'b' scrolls out of view.
    // Group membership must NOT change just because the viewport moved: the group marker
    // should either still report both members, or (if its center falls outside bounds) be
    // culled from rendering entirely — but it must never silently shrink to a stale count.
    const boundsExcludingB = { north: 37.5666, south: 37.5664, east: 126.9781, west: 126.9779 }
    rerender(
      <MapMarkerLayer
        map={{}}
        reports={reports}
        currentBounds={boundsExcludingB}
        onMarkerClick={vi.fn()}
        adapter={adapter as any}
      />
    )

    const marker = queryByTestId('proximity-group-marker')
    if (marker) {
      expect(marker.getAttribute('data-count')).toBe('2')
    }
  })

  it('switches tiers reactively when the zoom level changes', () => {
    const adapter = createStatefulAdapter(6) // starts far
    const reports = [near('a', 0), near('b', 10)]

    const { getByTestId, queryByTestId } = render(
      <MapMarkerLayer
        map={{}}
        reports={reports}
        currentBounds={null}
        onMarkerClick={vi.fn()}
        adapter={adapter as any}
      />
    )

    expect(getByTestId('clusterer')).toBeInTheDocument()

    act(() => {
      adapter.zoomTo(4) // zoom in into the proximity-group tier
    })

    expect(queryByTestId('clusterer')).not.toBeInTheDocument()
    expect(getByTestId('proximity-group-marker')).toBeInTheDocument()
  })
})
