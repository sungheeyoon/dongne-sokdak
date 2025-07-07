import { useState, useEffect, useMemo } from 'react'
import { Report } from '@/types'

// 동네 범위 설정 (당근마켓 벤치마킹)
const NEIGHBORHOOD_RANGES = {
  SMALL: 1000,   // 1km
  MEDIUM: 3000,  // 3km  
  LARGE: 6000    // 6km
} as const

interface UserLocation {
  lat: number
  lng: number
}

interface UseNeighborhoodFilterOptions {
  reports: Report[]
  userLocation?: UserLocation | null
  neighborhoodRange: keyof typeof NEIGHBORHOOD_RANGES
  autoDetectLocation?: boolean
}

// 두 지점 간 거리 계산 (Haversine 공식)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000 // 지구 반지름 (미터)
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

export function useNeighborhoodFilter({
  reports,
  userLocation,
  neighborhoodRange,
  autoDetectLocation = true
}: UseNeighborhoodFilterOptions) {
  const [detectedLocation, setDetectedLocation] = useState<UserLocation | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectionError, setDetectionError] = useState<string | null>(null)

  // 자동 위치 감지
  useEffect(() => {
    if (!autoDetectLocation || userLocation || detectedLocation) return

    const detectLocation = async () => {
      setIsDetecting(true)
      setDetectionError(null)

      // Geolocation API 지원 확인
      if (!navigator.geolocation) {
        setDetectionError('이 브라우저는 위치 서비스를 지원하지 않습니다.')
        setIsDetecting(false)
        return
      }

      // 위치 권한 상태 먼저 확인 (지원하는 브라우저에서만)
      if ('permissions' in navigator) {
        try {
          const permission = await navigator.permissions.query({ name: 'geolocation' })
          console.log('📍 위치 권한 상태:', permission.state)
          
          if (permission.state === 'denied') {
            setDetectionError('위치 접근 권한이 거부되어 있습니다. 브라우저 설정에서 위치 권한을 허용해주세요.')
            setIsDetecting(false)
            return
          }
        } catch (permissionError) {
          console.log('📍 권한 확인 불가:', permissionError)
          // 권한 확인에 실패해도 위치 요청은 계속 진행
        }
      }

      // 위치 정보 요청
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          setDetectedLocation(location)
          setIsDetecting(false)
          console.log('✅ 위치 감지 성공:', location)
        },
        (error) => {
          // Geolocation 에러 상세 정보 로깅 (개발용)
          console.log('📍 위치 감지 실패:', {
            code: error.code,
            message: error.message,
            PERMISSION_DENIED: error.PERMISSION_DENIED,
            POSITION_UNAVAILABLE: error.POSITION_UNAVAILABLE,
            TIMEOUT: error.TIMEOUT
          })
          
          let errorMessage = '위치 정보를 가져올 수 없습니다.'
          
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = '위치 접근 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.'
              break
            case error.POSITION_UNAVAILABLE:
              errorMessage = '위치 정보를 사용할 수 없습니다.'
              break
            case error.TIMEOUT:
              errorMessage = '위치 정보 요청 시간이 초과되었습니다.'
              break
            default:
              errorMessage = '위치 정보를 가져오는 중 오류가 발생했습니다.'
          }
          
          setDetectionError(errorMessage)
          setIsDetecting(false)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5분간 캐시
        }
      )
    }

    detectLocation()
  }, [autoDetectLocation, userLocation, detectedLocation])

  // 현재 사용할 위치 결정
  const currentLocation = userLocation || detectedLocation

  // 동네 범위 내 제보 필터링
  const filteredReports = useMemo(() => {
    if (!currentLocation) return reports

    const maxDistance = NEIGHBORHOOD_RANGES[neighborhoodRange]
    
    return reports.filter(report => {
      const distance = calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        report.location.lat,
        report.location.lng
      )
      return distance <= maxDistance
    })
  }, [reports, currentLocation, neighborhoodRange])

  // 거리별로 정렬된 제보
  const sortedReports = useMemo(() => {
    if (!currentLocation) return filteredReports

    return [...filteredReports].sort((a, b) => {
      const distanceA = calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        a.location.lat,
        a.location.lng
      )
      const distanceB = calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        b.location.lat,
        b.location.lng
      )
      return distanceA - distanceB
    })
  }, [filteredReports, currentLocation])

  // 각 제보에 거리 정보 추가
  const reportsWithDistance = useMemo(() => {
    if (!currentLocation) return sortedReports

    return sortedReports.map(report => ({
      ...report,
      distance: calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        report.location.lat,
        report.location.lng
      )
    }))
  }, [sortedReports, currentLocation])

  // 통계 정보
  const stats = useMemo(() => {
    const total = reports.length
    const inRange = filteredReports.length
    const percentage = total > 0 ? Math.round((inRange / total) * 100) : 0
    
    return {
      total,
      inRange,
      percentage,
      rangeKm: NEIGHBORHOOD_RANGES[neighborhoodRange] / 1000
    }
  }, [reports.length, filteredReports.length, neighborhoodRange])

  return {
    // 필터링된 데이터
    filteredReports,
    sortedReports,
    reportsWithDistance,
    
    // 위치 정보
    currentLocation,
    detectedLocation,
    isDetecting,
    detectionError,
    
    // 통계
    stats,
    
    // 유틸리티 함수
    calculateDistance: (lat: number, lng: number) => {
      if (!currentLocation) return null
      return calculateDistance(currentLocation.lat, currentLocation.lng, lat, lng)
    },
    
    // 범위 정보
    rangeInMeters: NEIGHBORHOOD_RANGES[neighborhoodRange],
    rangeInKm: NEIGHBORHOOD_RANGES[neighborhoodRange] / 1000
  }
}

// 거리를 사용자 친화적인 형태로 변환
export function formatDistance(distance: number): string {
  if (distance < 1000) {
    return `${Math.round(distance)}m`
  } else {
    return `${(distance / 1000).toFixed(1)}km`
  }
}

// 동네 범위별 설명
export function getNeighborhoodDescription(range: keyof typeof NEIGHBORHOOD_RANGES): string {
  const descriptions = {
    SMALL: '아파트 단지나 소규모 구역 (1km)',
    MEDIUM: '일반적인 동네 범위 (3km)',
    LARGE: '넓은 지역 범위 (6km)'
  }
  return descriptions[range]
}