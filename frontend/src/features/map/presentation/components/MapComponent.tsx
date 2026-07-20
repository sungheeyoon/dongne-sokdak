'use client'

import { useEffect, useState } from 'react'
import { Map } from 'react-kakao-maps-sdk'
import { Report as ReportType } from '@/types'
import { useLocationViewModel } from '@/features/map/presentation/hooks/useLocationViewModel'
import { useKakaoMapBounds } from '@/features/map/presentation/hooks/useKakaoMapBounds'
import { MapMarkerLayer } from '@/features/map/presentation/components/MapMarkerLayer'
import { KakaoMapAdapter, defaultKakaoMapAdapter } from '@/features/map/data/kakaoMapAdapter'

interface MapComponentProps {
  reports: ReportType[]
  center?: { lat: number; lng: number }
  zoom?: number
  height?: string
  onLocationSelect?: (location: { lat: number; lng: number; address?: string }) => void
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void
  onZoomChange?: (zoom: number) => void
  onMarkerClick?: (report: ReportType) => void
  selectedMarkerId?: string
  adapter?: KakaoMapAdapter
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
  selectedMarkerId,
  adapter = defaultKakaoMapAdapter
}: MapComponentProps) {
  const safeCenter = center && center.lat && center.lng ? center : { lat: 37.5665, lng: 126.9780 }
  const [map, setMap] = useState<any>(null)
  const [kakaoLoaded, setKakaoLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [lastSetCenter, setLastSetCenter] = useState<{ lat: number, lng: number } | null>(null)
  const { reverseGeocode } = useLocationViewModel()

  const {
    currentBounds,
    dispatchBoundsUpdate,
    handleMapBoundsChange,
    handleDragEnd,
    handleZoomChange
  } = useKakaoMapBounds(map, onBoundsChange, onZoomChange, adapter)

  // 카카오맵 로딩 확인
  useEffect(() => {
    let cancelled = false

    const initializeKakaoMap = async () => {
      const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY
      if (!apiKey) {
        setMapError('카카오맵 API 키가 설정되지 않았습니다')
        return
      }

      try {
        const isReady = await adapter.ready()
        if (cancelled) return

        if (isReady) {
          setKakaoLoaded(true)
        } else {
          setMapError('카카오 SDK 로딩 실패')
        }
      } catch (error) {
        if (!cancelled) setMapError('카카오맵 초기화 오류')
      }
    }

    const timer = setTimeout(initializeKakaoMap, 1000)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [adapter])

  // 기본 지도 로드가 완료되었을 때 정확히 1회의 Data Fetch를 보장
  useEffect(() => {
    if (map) {
      dispatchBoundsUpdate(true)
    }
  }, [map, dispatchBoundsUpdate])

  // center prop 변경 시 맵 이동
  useEffect(() => {
    if (!map || !center) return

    if (lastSetCenter &&
      Math.abs(lastSetCenter.lat - center.lat) < 0.0001 &&
      Math.abs(lastSetCenter.lng - center.lng) < 0.0001) {
      setTimeout(() => {
        handleMapBoundsChange()
      }, 100)
      return
    }

    adapter.panTo(map, center.lat, center.lng)
    setLastSetCenter(center)
  }, [center, map, handleMapBoundsChange, lastSetCenter, adapter])

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

  if (mapError) {
    return (
      <div style={{ height }} className="rounded-lg overflow-hidden border-2 border-red-200 flex items-center justify-center bg-red-50">
        <div className="text-center p-4">
          <div className="text-red-600 text-3xl mb-3">🗺️</div>
          <p className="text-red-800 font-medium mb-2">지도 로드 실패</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
          >
            페이지 새로고침
          </button>
        </div>
      </div>
    )
  }

  if (!kakaoLoaded) {
    return (
      <div style={{ height }} className="rounded-lg overflow-hidden border-2 border-gray-200 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-700 text-base font-medium">🗺️ 동네속닥 지도 로딩 중...</p>
        </div>
      </div>
    )
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
              adapter={adapter}
            />
          )}
        </Map>
      </div>
    </div>
  )
}
