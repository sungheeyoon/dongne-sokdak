import { useEffect, useState, useMemo, useCallback, useRef, useTransition } from 'react'
import { MarkerClusterer } from 'react-kakao-maps-sdk'
import { Report as ReportType } from '@/types'
import MemoizedMapMarker from '@/components/MemoizedMapMarker'

const CLUSTER_CALCULATOR = [10, 30, 50]
const CLUSTER_STYLES = [
  { // 10개 미만
    width: '40px', height: '40px',
    background: 'rgba(59, 130, 246, 0.8)',
    borderRadius: '20px',
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    lineHeight: '40px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: '2px solid white'
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

interface MapMarkerLayerProps {
  map: any
  reports: ReportType[]
  currentBounds: { north: number; south: number; east: number; west: number } | null
  selectedMarkerId?: string
  onMarkerClick: (report: ReportType) => void
}

export function MapMarkerLayer({
  map,
  reports,
  currentBounds,
  selectedMarkerId,
  onMarkerClick
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

  const handleMarkerClick = useCallback((reportId: string) => {
    const report = validReportsRef.current.find(r => r.id === reportId)
    if (!report) return

    if (map) {
      const moveLatLng = new window.kakao.maps.LatLng(report.location.lat, report.location.lng)
      map.panTo(moveLatLng)

      const currentLevel = map.getLevel()
      const targetLevel = Math.max(currentLevel, 3)

      if (currentLevel > targetLevel) {
        setTimeout(() => {
          map.setLevel(targetLevel, { animate: { duration: 500 } })
        }, 200)
      }
    }

    onMarkerClick(report)
  }, [map, onMarkerClick])

  return (
    <MarkerClusterer
      averageCenter={true}
      minLevel={5}
      calculator={CLUSTER_CALCULATOR}
      styles={CLUSTER_STYLES}
    >
      {transitionReports.map((report) => {
        if (!isReportInBounds(report.location.lat, report.location.lng)) return null;

        const isSelected = selectedMarkerId === report.id;

        return (
          <MemoizedMapMarker
            key={report.id}
            id={report.id}
            lat={report.location.lat}
            lng={report.location.lng}
            category={report.category}
            isSelected={isSelected}
            onClick={handleMarkerClick}
          />
        );
      })}
    </MarkerClusterer>
  )
}
