'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Map, MapMarker } from 'react-kakao-maps-sdk'
import { Target, Navigation } from 'lucide-react'
import { createSingleReportMarkerImage } from '@/lib/utils/mapMarkerUtils'

declare global {
  interface Window {
    kakao: any;
  }
}

interface LocationPickerProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void
  initialCenter?: { lat: number; lng: number }
  height?: string
  className?: string
}

export default function LocationPicker({ 
  onLocationSelect, 
  initialCenter = { lat: 37.5665, lng: 126.9780 },
  height = '300px',
  className = ""
}: LocationPickerProps) {
  const [map, setMap] = useState<any>(null)
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [centerLocation, setCenterLocation] = useState<{ lat: number; lng: number }>(initialCenter)
  const [centerMarkerImage, setCenterMarkerImage] = useState<string>('')
  const [kakaoReady, setKakaoReady] = useState(false)

  // 카카오맵 API 준비 상태 확인
  useEffect(() => {
    const checkKakaoReady = () => {
      if (typeof window !== 'undefined' && 
          window.kakao && 
          window.kakao.maps && 
          window.kakao.maps.LatLng &&
          window.kakao.maps.services) {
        setKakaoReady(true)
        // 마커 이미지도 함께 생성
        const markerImage = createSingleReportMarkerImage('OTHER', 'medium')
        setCenterMarkerImage(markerImage.src)
        console.log('✅ 카카오맵 API 준비 완료')
      } else {
        console.log('⏳ 카카오맵 API 로딩 중...')
        setTimeout(checkKakaoReady, 100)
      }
    }
    
    checkKakaoReady()
  }, [])

  // 맵 중심 변경 감지 및 업데이트
  useEffect(() => {
    if (!map) return

    const handleMapMove = () => {
      const center = map.getCenter()
      const lat = center.getLat()
      const lng = center.getLng()
      setCenterLocation({ lat, lng })
    }

    // 카카오맵 이벤트 등록
    window.kakao.maps.event.addListener(map, 'center_changed', handleMapMove)
    window.kakao.maps.event.addListener(map, 'dragend', handleMapMove)

    // 카카오 로고 숨기기 (안전한 방법)
    const hideKakaoLogo = () => {
      try {
        if (map && typeof map.getContainer === 'function') {
          const mapContainer = map.getContainer()
          if (mapContainer) {
            const copyrightElements = mapContainer.querySelectorAll('.MapCopyright, .olControlAttribution')
            copyrightElements.forEach((el: Element) => {
              (el as HTMLElement).style.display = 'none'
            })
          }
        }
      } catch (error) {
        // 에러 무시 - 로고 숨기기는 필수가 아님
      }
    }
    
    // 지도 로드 후 로고 숨기기
    setTimeout(hideKakaoLogo, 100)

    return () => {
      // 이벤트 제거
      window.kakao.maps.event.removeListener(map, 'center_changed', handleMapMove)
      window.kakao.maps.event.removeListener(map, 'dragend', handleMapMove)
    }
  }, [map])

  // 주소 가져오기 (역지오코딩)
  const getAddressFromCoords = useCallback(async (lat: number, lng: number) => {
    if (!window.kakao?.maps?.services) return '주소 정보 없음'

    return new Promise<string>((resolve) => {
      const geocoder = new window.kakao.maps.services.Geocoder()
      
      geocoder.coord2Address(lng, lat, (result: any, status: any) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const addr = result[0]
          const address = addr.road_address ? 
            addr.road_address.address_name : 
            addr.address.address_name
          resolve(address)
        } else {
          resolve('주소 정보 없음')
        }
      })
    })
  }, [])

  // 지도 클릭 이벤트
  const handleMapClick = useCallback(async (event: any) => {
    // 카카오맵 API 준비 상태 확인
    if (!kakaoReady) {
      return
    }
    
    // 안전한 객체 체크 (에러 로그 제거)
    if (!event || !event.latLng) {
      return // 조용히 무시
    }

    const { latLng } = event
    
    // latLng 객체 메서드 체크 (에러 로그 제거)
    if (typeof latLng.getLat !== 'function' || typeof latLng.getLng !== 'function') {
      return // 조용히 무시
    }

    const lat = latLng.getLat()
    const lng = latLng.getLng()
    
    setSelectedLocation({ lat, lng })

    try {
      const address = await getAddressFromCoords(lat, lng)
      onLocationSelect({ lat, lng, address })
    } catch (error) {
      onLocationSelect({ lat, lng, address: '주소 정보 없음' })
    }
  }, [kakaoReady, onLocationSelect, getAddressFromCoords])

  // 현재 위치로 이동
  const goToCurrentLocation = useCallback(() => {
    if (!navigator.geolocation || !map) {
      alert('위치 서비스를 사용할 수 없습니다.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        
        // 지도 중심 이동
        const moveLatLon = new window.kakao.maps.LatLng(lat, lng)
        map.setCenter(moveLatLon)
        
        // 위치 설정 및 주소 가져오기
        setSelectedLocation({ lat, lng })

        try {
          const address = await getAddressFromCoords(lat, lng)
          onLocationSelect({ lat, lng, address })
        } catch (error) {
          onLocationSelect({ lat, lng, address: '주소 정보 없음' })
        }
      },
      (error) => {
        console.error('위치 가져오기 실패:', error)
        alert('현재 위치를 가져올 수 없습니다.')
      }
    )
  }, [map, getAddressFromCoords, onLocationSelect])

  // 지도 중심으로 위치 선택
  const selectMapCenter = useCallback(async () => {
    if (!kakaoReady) {
      return
    }

    const { lat, lng } = centerLocation
    setSelectedLocation({ lat, lng })

    try {
      const address = await getAddressFromCoords(lat, lng)
      onLocationSelect({ lat, lng, address })
    } catch (error) {
      onLocationSelect({ lat, lng, address: '주소 정보 없음' })
    }
  }, [kakaoReady, centerLocation, onLocationSelect, getAddressFromCoords])

  if (!kakaoReady) {
    return (
      <div className={`relative ${className}`}>
        <div style={{ height }} className="rounded-lg overflow-hidden border-2 border-gray-200 relative flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">지도 로딩 중...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <div style={{ height }} className="rounded-lg overflow-hidden border-2 border-gray-200 relative [&_.MapCopyright]:hidden [&_.olControlAttribution]:hidden">
        <Map
          center={initialCenter}
          style={{ width: '100%', height: '100%', position: 'relative', zIndex: 1 }}
          level={3} // 동네 단위 줌 레벨
          onCreate={setMap}
          onClick={handleMapClick}
          disableDoubleClick={true}
          disableDoubleClickZoom={true}
        >
          {/* 가운데 고정 마커 (항상 중심에 위치) */}
          {centerMarkerImage && (
            <MapMarker
              position={centerLocation}
              image={{
                src: centerMarkerImage,
                size: { width: 30, height: 35 },
                options: { offset: { x: 15, y: 35 } }
              }}
            />
          )}
          
          {/* 선택된 위치 마커 (클릭한 위치) */}
          {selectedLocation && (
            <MapMarker
              position={selectedLocation}
              image={{
                src: 'data:image/svg+xml;base64,' + btoa(`
                  <svg width="40" height="50" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 0C31.0457 0 40 8.95431 40 20C40 31.0457 25 50 20 50C15 50 0 31.0457 0 20C0 8.95431 8.95431 0 20 0Z" fill="#22C55E"/>
                    <circle cx="20" cy="20" r="8" fill="white"/>
                    <circle cx="20" cy="20" r="4" fill="#22C55E"/>
                  </svg>
                `),
                size: { width: 40, height: 50 },
                options: { offset: { x: 20, y: 50 } }
              }}
            />
          )}
        </Map>

        {/* 컨트롤 버튼들 */}
        <div 
          className="absolute top-4 right-4 space-y-2"
          style={{ zIndex: 1000 }}
        >
          {/* 현재 위치 버튼 */}
          <button
            onClick={goToCurrentLocation}
            className="bg-white hover:bg-gray-50 p-2 rounded-lg shadow-md border border-gray-200 transition-colors"
            style={{ zIndex: 1000, position: 'relative' }}
            title="현재 위치로 이동"
          >
            <Navigation className="h-5 w-5 text-blue-600" />
          </button>
        </div>

        {/* 하단 버튼 - 항상 활성화, 높은 z-index */}
        <div 
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2"
          style={{ zIndex: 1000 }}
        >
          <button
            onClick={selectMapCenter}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg shadow-xl font-medium transition-colors flex items-center space-x-2"
            style={{ zIndex: 1000, position: 'relative' }}
          >
            <Target className="h-4 w-4" />
            <span>이 위치로 선택</span>
          </button>
        </div>
      </div>

      {/* 현재 중심 위치 정보 */}
      <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center space-x-2 text-gray-700">
          <Target className="h-4 w-4" />
          <span className="text-sm font-medium">현재 중심 위치</span>
        </div>
        <div className="text-xs text-gray-600 mt-1">
          위도: {centerLocation.lat.toFixed(6)}, 경도: {centerLocation.lng.toFixed(6)}
        </div>
      </div>

      {/* 선택된 위치 정보 */}
      {selectedLocation && (
        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2 text-green-800">
            <div className="w-3 h-3 bg-green-600 rounded-full"></div>
            <span className="text-sm font-medium">선택 완료</span>
          </div>
          <div className="text-xs text-green-600 mt-1">
            위도: {selectedLocation.lat.toFixed(6)}, 경도: {selectedLocation.lng.toFixed(6)}
          </div>
        </div>
      )}
    </div>
  )
}
