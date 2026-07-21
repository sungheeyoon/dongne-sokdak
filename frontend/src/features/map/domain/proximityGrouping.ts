import { Coordinates } from './entities'
import { distanceMeters } from './geo'

export const PROXIMITY_GROUP_RADIUS_METERS = 30

export interface ProximityGroup<T> {
  id: string
  center: Coordinates
  members: T[]
}

function centerOf(members: { location: Coordinates }[]): Coordinates {
  const sum = members.reduce(
    (acc, m) => ({ lat: acc.lat + m.location.lat, lng: acc.lng + m.location.lng }),
    { lat: 0, lng: 0 }
  )
  return { lat: sum.lat / members.length, lng: sum.lng / members.length }
}

// 그리디 시드 기반 그룹핑: 아직 그룹에 속하지 않은 항목을 시드로 삼아, 시드로부터
// radiusMeters 이내인 것만 같은 그룹에 편입한다. 체인(전이적 연결)은 하지 않으므로
// 그룹의 반경은 항상 시드 기준 radiusMeters 이내로 유지된다 (ADR-0008).
export function computeProximityGroups<T extends { id: string; location: Coordinates }>(
  items: T[],
  radiusMeters: number = PROXIMITY_GROUP_RADIUS_METERS
): ProximityGroup<T>[] {
  const groups: ProximityGroup<T>[] = []
  const assigned = new Array(items.length).fill(false)

  for (let i = 0; i < items.length; i++) {
    if (assigned[i]) continue
    const seed = items[i]
    const members: T[] = [seed]
    assigned[i] = true

    for (let j = i + 1; j < items.length; j++) {
      if (assigned[j]) continue
      if (distanceMeters(seed.location, items[j].location) <= radiusMeters) {
        members.push(items[j])
        assigned[j] = true
      }
    }

    groups.push({
      id: `proximity-${seed.id}`,
      center: centerOf(members),
      members,
    })
  }

  return groups
}
