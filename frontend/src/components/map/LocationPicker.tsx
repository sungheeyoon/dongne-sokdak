'use client'

import React, { useState, useCallback } from 'react'
import { Map, MapMarker } from 'react-kakao-maps-sdk'
import { Target, Navigation } from 'lucide-react'

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
  const [isGettingAddress, setIsGettingAddress] = useState(false)

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
    const { latLng } = event
    const lat = latLng.getLat()
    const lng = latLng.getLng()

    console.log('🗺️ 지도 클릭:', { lat, lng })
    
    setSelectedLocation({ lat, lng })
    setIsGettingAddress(true)

    try {
      const address = await getAddressFromCoords(lat, lng)
      console.log('📍 주소:', address)
      
      onLocationSelect({ lat, lng, address })
    } catch (error) {
      console.error('❌ 주소 가져오기 실패:', error)
      onLocationSelect({ lat, lng, address: '주소 정보 없음' })
    } finally {
      setIsGettingAddress(false)
    }
  }, [onLocationSelect, getAddressFromCoords])

  // 현재 위치로 이동
  const goToCurrentLocation = useCallback(() => {
    if (!navigator.geolocation || !map) {
      alert('위치 서비스를 사용할 수 없습니다.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        
        // 지도 중심 이동
        const moveLatLon = new window.kakao.maps.LatLng(lat, lng)
        map.setCenter(moveLatLon)
        
        // 자동으로 해당 위치 선택
        handleMapClick({ latLng: moveLatLon })
      },
      (error) => {
        console.error('위치 가져오기 실패:', error)
        alert('현재 위치를 가져올 수 없습니다.')
      }
    )
  }, [map, handleMapClick])

  // 지도 중심으로 위치 선택
  const selectMapCenter = useCallback(async () => {
    if (!map) return

    const center = map.getCenter()
    const lat = center.getLat()
    const lng = center.getLng()

    setSelectedLocation({ lat, lng })
    setIsGettingAddress(true)

    try {
      const address = await getAddressFromCoords(lat, lng)
      onLocationSelect({ lat, lng, address })
    } catch (error) {
      console.error('❌ 주소 가져오기 실패:', error)
      onLocationSelect({ lat, lng, address: '주소 정보 없음' })
    } finally {
      setIsGettingAddress(false)
    }
  }, [map, onLocationSelect, getAddressFromCoords])

  return (
    <div className={`relative ${className}`}>
      <div style={{ height }} className="rounded-lg overflow-hidden border-2 border-gray-200 relative">
        <Map
          center={initialCenter}
          style={{ width: '100%', height: '100%' }}
          level={3} // 동네 단위 줌 레벨
          onCreate={setMap}
          onClick={handleMapClick}
        >
          {/* 선택된 위치 마커 */}
          {selectedLocation && (
            <MapMarker
              position={selectedLocation}
              image={{
                src: 'data:image/svg+xml;base64,' + btoa(`
                  <svg width="40" height="50" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 0C31.0457 0 40 8.95431 40 20C40 31.0457 25 50 20 50C15 50 0 31.0457 0 20C0 8.95431 8.95431 0 20 0Z" fill="#FF4444"/>
                    <circle cx="20" cy="20" r="8" fill="white"/>
                    <circle cx="20" cy="20" r="4" fill="#FF4444"/>
                  </svg>
                `),
                size: { width: 40, height: 50 },
                options: { offset: { x: 20, y: 50 } }
              }}
            />
          )}
        </Map>

        {/* 지도 중앙 십자선 (카카오택시 스타일) */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <Target className="h-8 w-8 text-red-500 drop-shadow-lg" />
        </div>

        {/* 컨트롤 버튼들 */}
        <div className="absolute top-4 right-4 space-y-2">
          {/* 현재 위치 버튼 */}
          <button
            onClick={goToCurrentLocation}
            className="bg-white hover:bg-gray-50 p-2 rounded-lg shadow-md border border-gray-200 transition-colors"
            title="현재 위치로 이동"
          >
            <Navigation className="h-5 w-5 text-blue-600" />
          </button>
        </div>

        {/* 하단 버튼 */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <button
            onClick={selectMapCenter}
            disabled={isGettingAddress}
            className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-6 py-3 rounded-lg shadow-lg font-medium transition-colors flex items-center space-x-2"
          >
            {isGettingAddress ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>주소 확인 중...</span>
              </>
            ) : (
              <>
                <Target className="h-4 w-4" />
                <span>이 위치로 선택</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 선택된 위치 정보 */}
      {selectedLocation && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2 text-blue-800">
            <Target className="h-4 w-4" />
            <span className="text-sm font-medium">선택된 위치</span>
          </div>
          <div className="text-xs text-blue-600 mt-1">
            위도: {selectedLocation.lat.toFixed(6)}, 경도: {selectedLocation.lng.toFixed(6)}
          </div>
        </div>
      )}
    </div>
  )
}
