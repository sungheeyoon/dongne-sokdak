import { describe, it, expect } from 'vitest'
import { computeProximityGroups, distanceMeters } from '@/features/map/domain/proximityGrouping'

interface FakeReport {
  id: string
  location: { lat: number; lng: number }
}

// 서울 시청 부근, 위도 1도 ≈ 111,000m 기준 환산한 근사 오프셋 헬퍼.
// north()는 북쪽으로 offsetMeters만큼 떨어진 좌표를 반환한다.
const BASE = { lat: 37.5665, lng: 126.9780 }
function north(offsetMeters: number, from = BASE) {
  return { lat: from.lat + offsetMeters / 111_000, lng: from.lng }
}

function report(id: string, location: { lat: number; lng: number }): FakeReport {
  return { id, location }
}

describe('computeProximityGroups', () => {
  it('returns one group per report when nothing is nearby', () => {
    const reports = [
      report('a', BASE),
      report('b', north(1000)), // 1km away — nowhere near 30m
    ]

    const groups = computeProximityGroups(reports)

    expect(groups).toHaveLength(2)
    expect(groups.every(g => g.members.length === 1)).toBe(true)
  })

  it('merges reports within the radius into a single group', () => {
    const reports = [
      report('a', BASE),
      report('b', north(10)), // 10m away
      report('c', north(20)), // 20m away
    ]

    const groups = computeProximityGroups(reports, 30)

    expect(groups).toHaveLength(1)
    expect(groups[0].members.map(m => m.id).sort()).toEqual(['a', 'b', 'c'])
  })

  it('does not chain transitively past the seed radius', () => {
    // a-b: 20m (within radius of seed a). b-c: 20m from b, but 40m from seed a —
    // must NOT be pulled into a's group just because it's close to b.
    const reports = [
      report('a', BASE),
      report('b', north(20)),
      report('c', north(40)),
    ]

    const groups = computeProximityGroups(reports, 30)

    expect(groups).toHaveLength(2)
    const groupA = groups.find(g => g.members.some(m => m.id === 'a'))!
    expect(groupA.members.map(m => m.id).sort()).toEqual(['a', 'b'])
    const groupC = groups.find(g => g.members.some(m => m.id === 'c'))!
    expect(groupC.members.map(m => m.id)).toEqual(['c'])
  })

  it('places the group center at the average coordinate of its members', () => {
    const reports = [
      report('a', BASE),
      report('b', north(20)),
    ]

    const groups = computeProximityGroups(reports, 30)

    expect(groups).toHaveLength(1)
    expect(groups[0].center.lat).toBeCloseTo((BASE.lat + north(20).lat) / 2, 10)
    expect(groups[0].center.lng).toBeCloseTo(BASE.lng, 10)
  })

  it('gives every group a stable id derived from its seed report', () => {
    const reports = [report('seed-report', BASE)]

    const groups = computeProximityGroups(reports, 30)

    expect(groups[0].id).toBe('proximity-seed-report')
  })

  it('returns an empty array for no reports', () => {
    expect(computeProximityGroups([])).toEqual([])
  })
})

describe('distanceMeters', () => {
  it('returns ~0 for the same coordinate', () => {
    expect(distanceMeters(BASE, BASE)).toBeCloseTo(0, 5)
  })

  it('matches the offset used to construct the test coordinate', () => {
    expect(distanceMeters(BASE, north(500))).toBeCloseTo(500, -1)
  })
})
