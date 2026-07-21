import { useEffect, useState, useMemo, useCallback, useRef, useTransition } from 'react'
import { MarkerClusterer } from 'react-kakao-maps-sdk'
import { Report as ReportType } from '@/types'
import MemoizedMapMarker from '@/components/MemoizedMapMarker'
import { KakaoMapAdapter, defaultKakaoMapAdapter } from '@/features/map/data/kakaoMapAdapter'
import { computeProximityGroups, ProximityGroup } from '@/features/map/domain/proximityGrouping'
import { ProximityGroupMarker } from '@/features/map/presentation/components/ProximityGroupMarker'
import { ProximityGroupSheet } from '@/features/map/presentation/components/ProximityGroupSheet'
import {
  CLUSTER_BADGE_SIZE_PX,
  CLUSTER_BADGE_COLOR,
  CLUSTER_BADGE_SHADOW,
  CLUSTER_BADGE_BORDER,
} from '@/features/map/presentation/components/clusterBadgeStyle'

// Kakao의 setLevel 애니메이션은 현재 레벨과의 차이가 2 이하일 때만 동작하므로,
// 그보다 큰 점프는 이 값만큼씩 끊어서 체이닝한다.
const MAX_ANIMATABLE_LEVEL_STEP = 2
const ANIMATION_STEP_DURATION_MS = 300
// 이미 그 좌표에 있다고 볼 수 있는 오차 범위 (MapComponent의 alreadyThere 판정과 동일한 기준).
const SAME_POSITION_EPSILON = 0.0001

// 표시 단계 경계 (ADR-0008): zoom >= NATIVE_CLUSTER_MIN_LEVEL은 카카오 네이티브 클러스터,
// PROXIMITY_GROUP_MIN_LEVEL <= zoom < NATIVE_CLUSTER_MIN_LEVEL은 근접 그룹 마커,
// 그 아래는 그룹을 무시하고 개별 마커만 그린다. PROXIMITY_GROUP_MIN_LEVEL은 기존 개별
// 마커 클릭이 포커스하던 레벨(3)을 그대로 재사용한다.
const NATIVE_CLUSTER_MIN_LEVEL = 5
const PROXIMITY_GROUP_MIN_LEVEL = 3

const CLUSTER_CALCULATOR = [10, 30, 50]
const CLUSTER_STYLES = [
  { // 10개 미만 — 근접 그룹 마커(ProximityGroupMarker)와 동일한 배지 값을 공유한다 (ADR-0008).
    width: `${CLUSTER_BADGE_SIZE_PX}px`, height: `${CLUSTER_BADGE_SIZE_PX}px`,
    background: CLUSTER_BADGE_COLOR,
    borderRadius: `${CLUSTER_BADGE_SIZE_PX / 2}px`,
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    lineHeight: `${CLUSTER_BADGE_SIZE_PX}px`,
    boxShadow: CLUSTER_BADGE_SHADOW,
    border: CLUSTER_BADGE_BORDER
  },
  { // 30개 미만
    width: '50px', height: '50px',
    background: 'rgba(59, 130, 246, 0.9)',
    borderRadius: '25px',
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    lineHeight: '50px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: '2px solid white'
  },
  { // 50개 미만
    width: '60px', height: '60px',
    background: 'rgba(37, 99, 235, 1)',
    borderRadius: '30px',
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    lineHeight: '60px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: '3px solid white'
  },
  { // 50개 이상
    width: '70px', height: '70px',
    background: 'rgba(29, 78, 216, 1)',
    borderRadius: '35px',
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    lineHeight: '70px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: '3px solid white'
  }
]

// 클러스터 경계가 화면에 다 펼쳐지는 레벨을 구한다. 카카오 SDK는 이 계산을 직접 노출하지
// 않으므로, setBounds로 순간적으로 맞춰본 뒤 getLevel로 읽고 원래 상태로 되돌린다 —
// 동기적으로 끝나기 때문에 화면에는 보이지 않는다.
function getFitLevel(map: any, adapter: KakaoMapAdapter, bounds: any): number {
  const originalCenter = adapter.getCenter(map)
  const originalLevel = adapter.getLevel(map)

  adapter.setBounds(map, bounds)
  const fitLevel = adapter.getLevel(map)

  adapter.setLevel(map, originalLevel)
  adapter.setCenter(map, originalCenter.lat, originalCenter.lng)

  return fitLevel
}

interface MapMarkerLayerProps {
  map: any
  reports: ReportType[]
  currentBounds: { north: number; south: number; east: number; west: number } | null
  selectedMarkerId?: string
  onMarkerClick: (report: ReportType) => void
  adapter?: KakaoMapAdapter
}

export function MapMarkerLayer({
  map,
  reports,
  currentBounds,
  selectedMarkerId,
  onMarkerClick,
  adapter = defaultKakaoMapAdapter
}: MapMarkerLayerProps) {
  // 개별 마커를 클러스터링하기 위한 데이터 준비
  const validReports = useMemo(() => {
    return reports.filter(r => r.location && typeof r.location.lat === 'number' && typeof r.location.lng === 'number');
  }, [reports]);

  // 안정적인 참조를 위해 ref에 보관
  const validReportsRef = useRef(validReports)
  useEffect(() => {
    validReportsRef.current = validReports
  }, [validReports])

  // Concurrent UI 스케줄링 (React 18)
  const [, startTransition] = useTransition()
  const [transitionReports, setTransitionReports] = useState<ReportType[]>([])

  useEffect(() => {
    startTransition(() => {
      setTransitionReports(validReports)
    })
  }, [validReports])

  // Viewport DOM Culling 로직
  const isReportInBounds = useCallback((lat: number, lng: number) => {
    if (!currentBounds) return true
    const padding = 0.005
    return (
      lat >= currentBounds.south - padding &&
      lat <= currentBounds.north + padding &&
      lng >= currentBounds.west - padding &&
      lng <= currentBounds.east + padding
    )
  }, [currentBounds])

  const visibleReports = useMemo(
    () => transitionReports.filter(r => isReportInBounds(r.location.lat, r.location.lng)),
    [transitionReports, isReportInBounds]
  )

  // 표시 단계 판정을 위한 현재 줌 레벨. map이 아직 없으면 null로 두고 'far' 단계로
  // 취급한다 (기존 동작과 동일하게 전체를 그린다).
  const [zoomLevel, setZoomLevel] = useState<number | null>(null)

  useEffect(() => {
    if (!map) return

    setZoomLevel(adapter.getLevel(map))

    const handleZoomChanged = () => setZoomLevel(adapter.getLevel(map))
    adapter.addListener(map, 'zoom_changed', handleZoomChanged)
    return () => adapter.removeListener(map, 'zoom_changed', handleZoomChanged)
  }, [map, adapter])

  const tier: 'far' | 'near' | 'close' = useMemo(() => {
    if (zoomLevel === null || zoomLevel >= NATIVE_CLUSTER_MIN_LEVEL) return 'far'
    if (zoomLevel >= PROXIMITY_GROUP_MIN_LEVEL) return 'near'
    return 'close'
  }, [zoomLevel])

  // 근접 그룹(ADR-0008)은 reports가 바뀔 때만 재계산한다 — bounds(팬/드래그)로는 재계산
  // 하지 않는다. visibleReports로 계산하면 뷰포트가 움직일 때마다 그룹 소속 자체가
  // 흔들리므로(경계 밖으로 나간 멤버가 조용히 그룹에서 빠지는 등), 반드시 bounds 컬링
  // 이전의 transitionReports를 기준으로 계산한다.
  const proximityGroups = useMemo(() => computeProximityGroups(transitionReports), [transitionReports])

  // 렌더링 단계에서만 뷰포트 밖 그룹을 걸러낸다 — 그룹 소속은 그대로 두고 화면에 그릴지만 결정.
  const visibleProximityGroups = useMemo(
    () => proximityGroups.filter(g => isReportInBounds(g.center.lat, g.center.lng)),
    [proximityGroups, isReportInBounds]
  )

  const [openGroup, setOpenGroup] = useState<ProximityGroup<ReportType> | null>(null)

  // 이 컴포넌트가 진행 중인 pan+zoom 애니메이션 중 "현재 유효한" 것을 가리키는 토큰.
  // 애니메이션 도중 다른 마커/클러스터를 클릭하면 토큰이 갱신되어, 먼저 걸려 있던
  // idle 리스너가 뒤늦게 발동해도 그 애니메이션은 조용히 멈춘다.
  const animationTokenRef = useRef(0)

  const animatedPanAndZoom = useCallback((target: { lat: number; lng: number }, targetLevel: number) => {
    if (!map) return
    const token = ++animationTokenRef.current
    const isSuperseded = () => animationTokenRef.current !== token

    const stepZoom = () => {
      if (isSuperseded()) return

      const currentLevel = adapter.getLevel(map)
      if (currentLevel === targetLevel) return

      const direction = targetLevel < currentLevel ? -1 : 1
      const step = Math.min(MAX_ANIMATABLE_LEVEL_STEP, Math.abs(targetLevel - currentLevel))
      const nextLevel = currentLevel + direction * step

      const handleZoomIdle = () => {
        adapter.removeListener(map, 'idle', handleZoomIdle)
        if (!isSuperseded()) stepZoom()
      }
      adapter.addListener(map, 'idle', handleZoomIdle)
      adapter.setLevel(map, nextLevel, { animate: { duration: ANIMATION_STEP_DURATION_MS } })
    }

    const current = adapter.getCenter(map)
    const alreadyThere =
      Math.abs(current.lat - target.lat) < SAME_POSITION_EPSILON &&
      Math.abs(current.lng - target.lng) < SAME_POSITION_EPSILON

    if (alreadyThere) {
      stepZoom()
      return
    }

    const handlePanIdle = () => {
      adapter.removeListener(map, 'idle', handlePanIdle)
      if (!isSuperseded()) stepZoom()
    }
    adapter.addListener(map, 'idle', handlePanIdle)
    adapter.panTo(map, target.lat, target.lng)
  }, [map, adapter])

  const handleMarkerClick = useCallback((reportId: string) => {
    const report = validReportsRef.current.find(r => r.id === reportId)
    if (!report) return

    if (map) {
      const currentLevel = adapter.getLevel(map)
      const targetLevel = Math.min(currentLevel, 3)
      animatedPanAndZoom({ lat: report.location.lat, lng: report.location.lng }, targetLevel)
    }

    onMarkerClick(report)
  }, [map, onMarkerClick, adapter, animatedPanAndZoom])

  // 카카오 SDK 기본 클러스터 클릭 동작은 애니메이션 없이 즉시 레벨을 바꾼다.
  // disableClickZoom으로 그 동작을 끄고, 클러스터 경계가 다 펼쳐지는 레벨까지
  // 직접 애니메이션으로 이동시킨다.
  const handleClusterClick = useCallback((_target: unknown, cluster: any) => {
    if (!map) return

    const bounds = cluster.getBounds()
    const center = cluster.getCenter()
    const targetLevel = getFitLevel(map, adapter, bounds)

    animatedPanAndZoom({ lat: center.getLat(), lng: center.getLng() }, targetLevel)
  }, [map, adapter, animatedPanAndZoom])

  // 근접 그룹(2건 이상)은 줌인해도 갈라지지 않으므로(ADR-0008), 클러스터 클릭과 달리
  // pan/zoom 없이 바로 바텀시트를 연다.
  const handleGroupClick = useCallback((group: ProximityGroup<ReportType>) => {
    setOpenGroup(group)
  }, [])

  const handleSelectReportFromSheet = useCallback((report: ReportType) => {
    setOpenGroup(null)
    onMarkerClick(report)
  }, [onMarkerClick])

  const renderIndividualMarker = (report: ReportType) => (
    <MemoizedMapMarker
      key={report.id}
      id={report.id}
      lat={report.location.lat}
      lng={report.location.lng}
      category={report.category}
      isSelected={selectedMarkerId === report.id}
      onClick={handleMarkerClick}
    />
  )

  return (
    <>
      {tier === 'far' && (
        <MarkerClusterer
          averageCenter={true}
          minLevel={NATIVE_CLUSTER_MIN_LEVEL}
          calculator={CLUSTER_CALCULATOR}
          styles={CLUSTER_STYLES}
          disableClickZoom={true}
          onClusterclick={handleClusterClick}
        >
          {visibleReports.map(renderIndividualMarker)}
        </MarkerClusterer>
      )}

      {tier === 'near' && visibleProximityGroups.map((group) =>
        group.members.length >= 2 ? (
          <ProximityGroupMarker
            key={group.id}
            center={group.center}
            count={group.members.length}
            onClick={() => handleGroupClick(group)}
          />
        ) : (
          renderIndividualMarker(group.members[0])
        )
      )}

      {tier === 'close' && visibleReports.map(renderIndividualMarker)}

      {openGroup && (
        <ProximityGroupSheet
          group={openGroup}
          onClose={() => setOpenGroup(null)}
          onSelectReport={handleSelectReportFromSheet}
        />
      )}
    </>
  )
}
