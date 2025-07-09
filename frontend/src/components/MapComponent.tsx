'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { Map, MapMarker, MapInfoWindow, MarkerClusterer } from 'react-kakao-maps-sdk'
import { Report } from '@/types'
import { formatToAdministrativeAddress, isSameAdministrativeArea } from '@/lib/utils/addressUtils'
import { createGroupMarkerImage } from '@/lib/utils/mapMarkerUtils'

interface GroupedReport {
  id: string
  reports: Report[]
  location: { lat: number; lng: number }
  address: string
  count: number
  primaryCategory: string
}

interface MapComponentProps {
  reports: Report[]
  center?: { lat: number; lng: number }
  zoom?: number
  height?: string
  onLocationSelect?: (location: { lat: number; lng: number; address?: string }) => void
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void
  onMarkerClick?: (group: GroupedReport) => void // 마커 클릭 이벤트 추가
  selectedMarkerId?: string // 선택된 마커 ID
}

export default function MapComponent({ 
  reports, 
  center = { lat: 37.5665, lng: 126.9780 }, // 서울시청 기본값
  zoom = 3, // 동네 단위에 적합한 줌 레벨 (3 = 약 1-2km 범위)
  height = '400px',
  onLocationSelect,
  onBoundsChange,
  onMarkerClick,
  selectedMarkerId
}: MapComponentProps) {
  // center prop이 null인 경우 기본값 사용
  const safeCenter = center && center.lat && center.lng ? center : { lat: 37.5665, lng: 126.9780 }
  const [map, setMap] = useState<any>(null)
  const [kakaoLoaded, setKakaoLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [currentBounds, setCurrentBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null)
  const [lastSetCenter, setLastSetCenter] = useState<{lat: number, lng: number} | null>(null)

  // 행정동 기준으로 제보들을 그룹핑
  const groupedReports = useMemo(() => {
    const groups: { [key: string]: GroupedReport } = {}
    
    reports.forEach(report => {
      // 행정동 기반 주소로 변환
      const adminAddress = formatToAdministrativeAddress(report.address || '')
      
      // 행정동 + 대략적인 좌표로 그룹핑 키 생성
      const lat = report.location.lat.toFixed(3) // 소수점 3자리로 근사치 그룹핑
      const lng = report.location.lng.toFixed(3)
      const groupKey = adminAddress !== '주소 없음' ? adminAddress : `${lat},${lng}`
      
      if (groups[groupKey]) {
        groups[groupKey].reports.push(report)
        groups[groupKey].count++
      } else {
        groups[groupKey] = {
          id: groupKey,
          reports: [report],
          location: report.location,
          address: adminAddress,
          count: 1,
          primaryCategory: report.category
        }
      }
    })
    
    return Object.values(groups)
  }, [reports])

  // 카카오맵 로딩 확인
  useEffect(() => {
    console.log('🗺️ MapComponent 마운트됨')
    
    const initializeKakaoMap = async () => {
      try {
        console.log('🔄 카카오맵 API 로딩 시작...')
        
        // API 키 확인
        const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY
        if (!apiKey) {
          console.error('❌ API 키가 없습니다')
          setMapError('카카오맵 API 키가 설정되지 않았습니다')
          return
        }

        // 간단한 대기 로직 - autoload=true이므로 바로 확인
        let attempts = 0
        const maxAttempts = 150 // 15초
        
        const checkKakaoReady = () => {
          attempts++
          
          // 브라우저 환경 확인
          if (typeof window === 'undefined') {
            console.error('❌ 브라우저 환경이 아닙니다')
            setMapError('브라우저 환경이 아닙니다')
            return
          }
          
          // window.kakao 존재 확인
          if (!window.kakao) {
            if (attempts >= maxAttempts) {
              console.error('❌ window.kakao 로딩 타임아웃')
              setMapError('카카오 SDK 로딩 실패')
              return
            }
            setTimeout(checkKakaoReady, 100)
            return
          }
          
          // window.kakao.maps 존재 확인
          if (!window.kakao.maps) {
            if (attempts >= maxAttempts) {
              console.error('❌ window.kakao.maps 로딩 타임아웃')
              setMapError('카카오맵 Maps 객체 로딩 실패')
              return
            }
            setTimeout(checkKakaoReady, 100)
            return
          }
          
          // autoload=true임에도 불구하고 LatLng가 없다면 수동 로드
          if (!window.kakao.maps.LatLng) {
            console.log('🔄 LatLng 없음, 수동 로드 시도...')
            
            if (typeof window.kakao.maps.load === 'function') {
              try {
                window.kakao.maps.load(() => {
                  console.log('🔄 수동 로드 완료, 다시 확인...')
                  // 수동 로드 후 다시 확인
                  setTimeout(() => {
                    if (window.kakao.maps.LatLng) {
                      console.log('✅ 수동 로드 후 LatLng 확인됨')
                      try {
                        const testLatLng = new window.kakao.maps.LatLng(37.5665, 126.9780)
                        console.log('✅ LatLng 생성자 테스트 성공:', testLatLng)
                        setKakaoLoaded(true)
                      } catch (latLngError) {
                        console.error('❌ LatLng 생성자 테스트 실패:', latLngError)
                        setMapError('카카오맵 LatLng 생성자 오류')
                      }
                    } else {
                      console.error('❌ 수동 로드 후에도 LatLng 없음')
                      setMapError('카카오맵 LatLng 로딩 실패')
                    }
                  }, 500)
                })
                return
              } catch (loadError) {
                console.error('❌ 수동 로드 함수 호출 실패:', loadError)
              }
            }
            
            if (attempts >= maxAttempts) {
              console.error('❌ LatLng 로딩 타임아웃')
              setMapError('카카오맵 LatLng 로딩 실패')
              return
            }
            setTimeout(checkKakaoReady, 100)
            return
          }
          
          // 모든 필수 API 확인
          const requiredAPIs = [
            'LatLng', 'Map', 'Marker', 'InfoWindow', 'services'
          ]
          
          const missingAPIs = requiredAPIs.filter((api) => {
              return !(api in window.kakao.maps)
            })
          if (missingAPIs.length > 0) {
            if (attempts >= maxAttempts) {
              console.error('❌ 필수 API 로딩 타임아웃, 누락:', missingAPIs)
              setMapError(`카카오맵 API 로딩 실패: ${missingAPIs.join(', ')}`)
              return
            }
            if (attempts % 20 === 0) {
              console.log(`⏳ 필수 API 로딩 중... 누락: ${missingAPIs.join(', ')}`)
            }
            setTimeout(checkKakaoReady, 100)
            return
          }
          
          // services.Geocoder 확인
          if (!window.kakao.maps.services || !window.kakao.maps.services.Geocoder) {
            if (attempts >= maxAttempts) {
              console.error('❌ Geocoder 로딩 타임아웃')
              setMapError('카카오맵 Geocoder 로딩 실패')
              return
            }
            if (attempts % 20 === 0) {
              console.log('⏳ Geocoder 로딩 중...')
            }
            setTimeout(checkKakaoReady, 100)
            return
          }
          
          // 최종 테스트
          console.log('✅ 모든 카카오맵 API 준비 완료!')
          
          try {
            const testLatLng = new window.kakao.maps.LatLng(37.5665, 126.9780)
            console.log('✅ LatLng 생성자 테스트 성공:', testLatLng)
            setKakaoLoaded(true)
          } catch (latLngError) {
            console.error('❌ LatLng 생성자 테스트 실패:', latLngError)
            setMapError('카카오맵 LatLng 생성자 오류')
          }
        }
        
        checkKakaoReady()
        
      } catch (error) {
        console.error('❌ 카카오맵 초기화 중 예외 발생:', error)
        setMapError('카카오맵 초기화 오류')
      }
    }
    
    // 페이지 로드 후 약간의 지연을 두고 초기화
    const timer = setTimeout(initializeKakaoMap, 1000)
    
    return () => clearTimeout(timer)
  }, [])

  // 사용자 현재 위치 가져오기
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          console.log('📍 사용자 현재 위치:', location)
        },
        (error) => {
          console.warn('위치 정보를 가져올 수 없습니다:', error)
        }
      )
    }
  }, [])

  // 맵 bounds 변경 핸들러
  const handleMapBoundsChange = useCallback(() => {
    if (!map) return

    try {
      const bounds = map.getBounds()
      const swLatLng = bounds.getSouthWest()
      const neLatLng = bounds.getNorthEast()
      
      const newBounds = {
        south: swLatLng.getLat(),
        west: swLatLng.getLng(),
        north: neLatLng.getLat(),
        east: neLatLng.getLng()
      }
      
      // 개발 환경에서만 디버깅
      if (process.env.NODE_ENV === 'development') {
        console.log('🗺️ MapComponent: bounds 변경됨')
      }
      
      setCurrentBounds(newBounds)
      
      // 부모 컴포넌트에 bounds 변경 알림
      if (onBoundsChange) {
        onBoundsChange(newBounds)
      }
    } catch (error) {
      console.error('맵 bounds 계산 오류:', error)
    }
  }, [map, onBoundsChange])

  // center prop 변경 시 맵 이동 (검색 시에만)
  useEffect(() => {
    if (!map || !center) return

    // 새로운 center가 마지막으로 설정한 center와 다른 경우에만 이동 (외부에서 의도적으로 변경한 경우)
    if (lastSetCenter && 
        Math.abs(lastSetCenter.lat - center.lat) < 0.0001 && 
        Math.abs(lastSetCenter.lng - center.lng) < 0.0001) {
      return
    }

    console.log('🗺️ 지도 중심 이동:', center)
    
    // 지도 중심 이동
    const moveToCenter = new window.kakao.maps.LatLng(center.lat, center.lng)
    map.setCenter(moveToCenter)
    
    // 마지막 설정된 center 저장
    setLastSetCenter(center)

    console.log('✅ 지도 이동 완료')
  }, [center, map])

  // 맵 이동 완료 이벤트 등록
  useEffect(() => {
    if (!map) return

    // 맵 이동 완료 시 bounds 업데이트
    const handleDragEnd = () => {
      handleMapBoundsChange()
    }

    const handleZoomChanged = () => {
      handleMapBoundsChange()
    }

    const handleCenterChanged = () => {
      handleMapBoundsChange()
    }

    // 카카오맵 이벤트 등록
    window.kakao.maps.event.addListener(map, 'dragend', handleDragEnd)
    window.kakao.maps.event.addListener(map, 'zoom_changed', handleZoomChanged)
    window.kakao.maps.event.addListener(map, 'center_changed', handleCenterChanged)

    // 초기 bounds 설정
    setTimeout(handleMapBoundsChange, 500)

    return () => {
      // 이벤트 제거
      window.kakao.maps.event.removeListener(map, 'dragend', handleDragEnd)
      window.kakao.maps.event.removeListener(map, 'zoom_changed', handleZoomChanged)
      window.kakao.maps.event.removeListener(map, 'center_changed', handleCenterChanged)
    }
  }, [map, handleMapBoundsChange])

  // 지도 클릭 이벤트 (제보 위치 선택용)
  const handleMapClick = async (event: any) => {
    if (!onLocationSelect) return

    const { latLng } = event
    const lat = latLng.getLat()
    const lng = latLng.getLng()

    // 역지오코딩으로 행정동 주소 가져오기
    const geocoder = new window.kakao.maps.services.Geocoder()
    
    geocoder.coord2Address(lng, lat, (result: any, status: any) => {
      let address = ''
      if (status === window.kakao.maps.services.Status.OK) {
        const addr = result[0]
        // 행정동 우선 표시
        if (addr.address && addr.address.region_3depth_name) {
          const gu = addr.address.region_2depth_name
          const dong = addr.address.region_3depth_name
          const guName = gu.includes('구') ? gu : `${gu}구`
          address = `${guName} ${dong}`
        } else {
          // 기본 주소 사용 후 행정동 형태로 변환
          const fullAddress = addr.road_address ? 
            addr.road_address.address_name : 
            addr.address.address_name
          address = formatToAdministrativeAddress(fullAddress)
        }
      }

      onLocationSelect({ lat, lng, address })
    })
  }

  // 마커 관련 함수들은 공통 유틸리티로 이동됨


  // 그룹 마커 클릭 핸들러
  const handleGroupMarkerClick = (group: GroupedReport) => {
    // 마커를 클릭하면 해당 위치로 맵 중심 부드럽게 이동하고 적당히 줌인
    if (map) {
      const moveLatLng = new window.kakao.maps.LatLng(group.location.lat, group.location.lng)
      
      // 부드러운 이동
      map.panTo(moveLatLng)
      
      // 적당한 줌 레벨로 설정 (너무 과도하지 않게)
      const currentLevel = map.getLevel()
      const targetLevel = Math.max(2, 3) // 레벨 2-3 정도로 적당히 (30-50m 거리)
      
      if (currentLevel > targetLevel) {
        // 부드러운 줌인 (카카오맵 네이티브 기능 사용)
        setTimeout(() => {
          map.setLevel(targetLevel, {animate: {duration: 500}}) // 500ms 애니메이션
        }, 200) // 이동 후 약간 딜레이
      }
    }
    
    // 부모 컴포넌트에 마커 클릭 이벤트 전달
    if (onMarkerClick) {
      onMarkerClick(group)
    }
  }

  // 카카오맵 로딩 상태 확인
  if (mapError) {
    return (
      <div style={{ height }} className="rounded-lg overflow-hidden border-2 border-red-200 flex items-center justify-center bg-red-50">
        <div className="text-center p-4">
          <div className="text-red-600 text-3xl mb-3">🗺️</div>
          <p className="text-red-800 font-medium mb-2">지도 로드 실패</p>
          <p className="text-red-600 text-sm mb-4 max-w-xs">{mapError}</p>
          
          {/* 디버그 정보 */}
          <details className="text-left mb-4 max-w-sm">
            <summary className="text-xs text-red-700 cursor-pointer mb-2">디버그 정보 보기</summary>
            <div className="text-xs text-red-600 bg-red-100 p-2 rounded">
              <div>API 키 존재: {process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY ? '✅' : '❌'}</div>
              <div>브라우저: {typeof window !== 'undefined' ? '✅' : '❌'}</div>
              <div>스크립트 태그: {typeof window !== 'undefined' && document.querySelector('script[src*="dapi.kakao.com"]') ? '✅' : '❌'}</div>
              <div>카카오 객체: {typeof window !== 'undefined' && window.kakao ? '✅' : '❌'}</div>
              <div>Maps 객체: {typeof window !== 'undefined' && window.kakao?.maps ? '✅' : '❌'}</div>
            </div>
          </details>
          
          <div className="space-y-2">
            <button 
              onClick={() => {
                setMapError(null)
                setKakaoLoaded(false)
                setTimeout(() => window.location.reload(), 100)
              }}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium touch-manipulation"
            >
              페이지 새로고침
            </button>
            <div className="text-xs text-red-500">
              💡 계속 문제가 발생하면 브라우저 캐시를 삭제해보세요
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Fallback 제거 - 카카오맵만 사용

  if (!kakaoLoaded) {
    return (
      <div style={{ height }} className="rounded-lg overflow-hidden border-2 border-gray-200 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-700 text-base font-medium mb-1">🗺️ 동네속닥 지도 로딩 중...</p>
          <p className="text-gray-500 text-sm">우리 동네 제보 지도를 준비하고 있어요</p>
          <div className="mt-3 text-xs text-gray-400">
            잠시만 기다려주세요
          </div>
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
        >
          {/* 그룹화된 마커들 */}
          {groupedReports.map((group) => (
            <MapMarker
              key={group.id}
              position={{ lat: group.location.lat, lng: group.location.lng }}
              onClick={() => handleGroupMarkerClick(group)}
              image={createGroupMarkerImage(group.primaryCategory, group.count, selectedMarkerId === group.id)}
            />
          ))}
        </Map>
      </div>


      {/* 범례 - 모바일 최적화 */}
      <div className="absolute bottom-2 md:bottom-4 right-2 md:right-4 bg-white rounded-lg shadow-lg p-2 md:p-3 text-xs">
        <div className="font-medium mb-1 md:mb-2 text-xs md:text-sm">🗺️ 범례</div>
        <div className="space-y-1">
          <div className="flex items-center">
            <div className="w-3 md:w-4 h-3 md:h-4 rounded-full bg-blue-500 mr-1 md:mr-2 flex items-center justify-center text-white text-xs">1</div>
            <span className="text-xs">단일 제보</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 md:w-4 h-3 md:h-4 rounded-full bg-red-500 mr-1 md:mr-2 flex items-center justify-center text-white text-xs">N</div>
            <span className="text-xs hidden md:inline">다중 제보 (클릭하면 목록 표시)</span>
            <span className="text-xs md:hidden">다중 제보</span>
          </div>
        </div>
      </div>
    </div>
  )
}