import { describe, it, expect } from 'vitest'
import { distanceMeters } from '@/features/map/domain/geo'

// 서울 시청 부근, 위도 1도 ≈ 111,000m 기준 환산한 근사 오프셋 헬퍼.
// north()는 북쪽으로 offsetMeters만큼 떨어진 좌표를 반환한다.
const BASE = { lat: 37.5665, lng: 126.9780 }
function north(offsetMeters: number, from = BASE) {
  return { lat: from.lat + offsetMeters / 111_000, lng: from.lng }
}

describe('distanceMeters', () => {
  it('returns ~0 for the same coordinate', () => {
    expect(distanceMeters(BASE, BASE)).toBeCloseTo(0, 5)
  })

  it('matches the offset used to construct the test coordinate', () => {
    expect(distanceMeters(BASE, north(500))).toBeCloseTo(500, -1)
  })
})
