'use client'

import { useEffect, useState } from 'react'
import { Map } from 'react-kakao-maps-sdk'
import { Report as ReportType } from '@/types'
import { useLocationViewModel } from '@/features/map/presentation/hooks/useLocationViewModel'
import { useKakaoMapBounds } from '@/features/map/presentation/hooks/useKakaoMapBounds'
import { MapMarkerLayer } from '@/features/map/presentation/components/MapMarkerLayer'
import { KakaoMapAdapter, defaultKakaoMapAdapter } from '@/features/map/data/kakaoMapAdapter'
import { RefreshSearchButton } from '@/shared/ui/RegionSearchButton'

// panTo 애니메이션이 끝날 때까지 기다린 뒤 커밋한다 — Kakao SDK 이벤트만으로는
// "프로그래매틱 이동"과 "사용자 드래그"를 구분할 수 없어 이벤트에 의존하지 않는다 (ADR-0007).
const PAN_SETTLE_DELAY_MS = 500
const ALREADY_THERE_COMMIT_DELAY_MS = 100

interface MapComponentProps {
  reports: ReportType[]
  center?: { lat: number; lng: number }
  zoom?: number
  height?: string
  onLocationSelect?: (location: { lat: number; lng: number; address?: string }) => void
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void
  onZoomChange?: (zoom: number) => void
  onMarkerClick?: (report: ReportType) => void
  onGroupClick?: (reports: ReportType[], center: { lat: number; lng: number }) => void
  selectedMarkerId?: string
  adapter?: KakaoMapAdapter
  isBoundsQueryLoading?: boolean
}

export default function MapComponent({
  reports,
  center = { lat: 37.5665, lng: 126.9780 },
  zoom = 3,
  height = '400px',
  onLocationSelect,
  onBoundsChange,
  onZoomChange,
  onMarkerClick,
  onGroupClick,
  selectedMarkerId,
  adapter = defaultKakaoMapAdapter,
  isBoundsQueryLoading = false
}: MapComponentProps) {
  const safeCenter = center && center.lat && center.lng ? center : { lat: 37.5665, lng: 126.9780 }
  const [map, setMap] = useState<any>(null)
  const { reverseGeocode } = useLocationViewModel()

  const {
    currentBounds,
    isDirty,
    dispatchBoundsUpdate,
    handleMapBoundsChange,
    handleDragEnd,
    handleZoomChange
  } = useKakaoMapBounds(map, onBoundsChange, onZoomChange, adapter)

  // 기본 지도 로드가 완료되었을 때 정확히 1회의 Data Fetch를 보장
  useEffect(() => {
    if (map) {
      dispatchBoundsUpdate(true)
    }
  }, [map, dispatchBoundsUpdate])

  // center prop 변경 시 맵 이동 — "이미 그 위치인지"는 지도의 실제 현재 위치
  // (adapter.getCenter)와 비교해야 한다. 마지막으로 요청했던 좌표와 비교하면,
  // 사용자가 드래그로 지도를 옮긴 뒤 같은 좌표로 돌아가려 할 때(예: 내 동네로
  // 돌아가기) 요청 좌표 자체는 안 바뀌었다는 이유로 panTo를 건너뛰어 버린다.
  useEffect(() => {
    if (!map || !center) return

    const actualCenter = adapter.getCenter(map)
    const alreadyThere =
      Math.abs(actualCenter.lat - center.lat) < 0.0001 &&
      Math.abs(actualCenter.lng - center.lng) < 0.0001

    if (alreadyThere) {
      setTimeout(() => {
        dispatchBoundsUpdate(true)
      }, ALREADY_THERE_COMMIT_DELAY_MS)
      return
    }

    adapter.panTo(map, center.lat, center.lng)
    // 지도 초점 이동은 명시적 사용자 의도이므로, 애니메이션이 끝난 뒤 바로 커밋한다 (ADR-0007).
    setTimeout(() => {
      dispatchBoundsUpdate(true)
    }, PAN_SETTLE_DELAY_MS)
  }, [center, map, dispatchBoundsUpdate, adapter])

  // 지도 클릭 이벤트 (제보 위치 선택용)
  const handleMapClick = async (event: any) => {
    if (!onLocationSelect) return
    const { latLng } = event
    const lat = latLng.getLat()
    const lng = latLng.getLng()

    try {
      const address = await reverseGeocode({ lat, lng })
      onLocationSelect({ lat, lng, address })
    } catch (error) {
      onLocationSelect({ lat, lng, address: '' })
    }
  }

  const onInternalMarkerClick = (report: ReportType) => {
    if (onMarkerClick) {
      onMarkerClick(report)
    }
  }

  return (
    <div className="relative" style={{ height }}>
      <div style={{ height }} className="rounded-lg overflow-hidden border-2 border-gray-200 touch-manipulation kakao-map-container">
        <Map
          center={safeCenter}
          style={{ width: '100%', height: '100%' }}
          level={zoom}
          onCreate={setMap}
          onClick={handleMapClick}
          onBoundsChanged={handleMapBoundsChange}
          onZoomChanged={handleZoomChange}
          onDragEnd={handleDragEnd}
        >
          {map && (
            <MapMarkerLayer
              map={map}
              reports={reports}
              currentBounds={currentBounds}
              selectedMarkerId={selectedMarkerId}
              onMarkerClick={onInternalMarkerClick}
              onGroupClick={onGroupClick}
              adapter={adapter}
            />
          )}
        </Map>
      </div>
      {isDirty && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <RefreshSearchButton
            onClick={() => dispatchBoundsUpdate(true)}
            loading={isBoundsQueryLoading}
            size="sm"
            className="shadow-lg"
          />
        </div>
      )}
    </div>
  )
}
