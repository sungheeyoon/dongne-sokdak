'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Map, MarkerClusterer, CustomOverlayMap } from 'react-kakao-maps-sdk'
import { MapPin } from 'lucide-react'
import { Report as ReportType } from '@/types'

import { getMarkerColor } from '@/lib/utils/mapMarkerUtils'
import { useLocationViewModel } from '@/features/map/presentation/hooks/useLocationViewModel'

export interface GroupedReport {
  id: string
  reports: ReportType[]
  location: { lat: number; lng: number }
  address: string
  count: number
  primaryCategory: string
}

interface MapComponentProps {
  reports: ReportType[]
  center?: { lat: number; lng: number }
  zoom?: number
  height?: string
  onLocationSelect?: (location: { lat: number; lng: number; address?: string }) => void
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void
  onZoomChange?: (zoom: number) => void // 줌 변경 이벤트
  onMarkerClick?: (report: ReportType) => void // 마커 클릭 이벤트 수정
  selectedMarkerId?: string // 선택된 마커 ID
}

export default function MapComponent({
  reports,
  center = { lat: 37.5665, lng: 126.9780 }, // 서울시청 기본값
  zoom = 3, // 동네 단위에 적합한 줌 레벨 (3 = 약 1-2km 범위)
  height = '400px',
  onLocationSelect,
  onBoundsChange,
  onZoomChange,
  onMarkerClick,
  selectedMarkerId
}: MapComponentProps) {
  // center prop이 null인 경우 기본값 사용
  const safeCenter = center && center.lat && center.lng ? center : { lat: 37.5665, lng: 126.9780 }
  const [map, setMap] = useState<any>(null)
  const [kakaoLoaded, setKakaoLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [, setCurrentBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null)
  const [lastSetCenter, setLastSetCenter] = useState<{ lat: number, lng: number } | null>(null)
  const { reverseGeocode } = useLocationViewModel()

  // 개별 마커를 클러스터링하기 위한 데이터 준비 (이전 그룹핑 제거됨)
  const validReports = useMemo(() => {
    return reports.filter(r => r.location && typeof r.location.lat === 'number' && typeof r.location.lng === 'number');
  }, [reports]);

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

  // 맵 bounds 변경 핸들러 (디바운싱 적용 - 스크롤/드래그 시 렌더링 폭주 방지)
  const handleMapBoundsChange = useCallback(() => {
    if (!map) return

    // 리렌더링 폭주를 막기 위해 requestAnimationFrame이나 timeout으로 약간 지연 처리 가능 (간단한 수동 debounce)
    if ((handleMapBoundsChange as any).timeoutId) {
      clearTimeout((handleMapBoundsChange as any).timeoutId)
    }

    (handleMapBoundsChange as any).timeoutId = setTimeout(() => {
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
          console.log('🗺️ MapComponent: bounds 변경됨 (debounced)')
        }

        setCurrentBounds(newBounds)

        // 부모 컴포넌트에 bounds 변경 알림
        if (onBoundsChange) {
          onBoundsChange(newBounds)
        }
      } catch (error) {
        console.error('맵 bounds 계산 오류:', error)
      }
    }, 200) // 200ms debounce
  }, [map, onBoundsChange])

  // 줌 변경 핸들러
  const handleZoomChange = useCallback(() => {
    if (!map) return

    if ((handleZoomChange as any).timeoutId) {
      clearTimeout((handleZoomChange as any).timeoutId)
    }

    (handleZoomChange as any).timeoutId = setTimeout(() => {
      try {
        const currentZoomLevel = map.getLevel()
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 MapComponent: zoom 변경됨', currentZoomLevel)
        }

        if (onZoomChange) {
          onZoomChange(currentZoomLevel)
        }
      } catch (error) {
        console.error('줌 레벨 계산 오류:', error)
      }
    }, 200)
  }, [map, onZoomChange])

  // center prop 변경 시 맵 이동 (검색 시에만)
  useEffect(() => {
    if (!map || !center) return

    // 새로운 center가 마지막으로 설정한 center와 다른 경우에만 이동 (외부에서 의도적으로 변경한 경우)
    if (lastSetCenter &&
      Math.abs(lastSetCenter.lat - center.lat) < 0.0001 &&
      Math.abs(lastSetCenter.lng - center.lng) < 0.0001) {
      // 이미 같은 위치라도 bounds는 업데이트 해준다 (내동네 돌아가기 등의 액션 시 제보 재검색 보장)
      setTimeout(() => {
        handleMapBoundsChange()
      }, 100)
      return
    }

    console.log('🗺️ 지도 중심 이동:', center)

    // 지도 중심 이동 (부드럽게 이동)
    const moveToCenter = new window.kakao.maps.LatLng(center.lat, center.lng)
    map.panTo(moveToCenter)

    // 마지막 설정된 center 저장
    setLastSetCenter(center)

    // 중심이 변경되었으므로 bounds도 업데이트 (panTo 애니메이션 시간을 고려해 300ms 정도 후)
    setTimeout(() => {
      handleMapBoundsChange()
    }, 400)

    console.log('✅ 지도 이동 완료')
  }, [center, map, handleMapBoundsChange])

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

    // 카카오맵 이벤트 등록
    window.kakao.maps.event.addListener(map, 'dragend', handleDragEnd)
    window.kakao.maps.event.addListener(map, 'zoom_changed', handleZoomChanged)

    // 초기 bounds 설정
    setTimeout(handleMapBoundsChange, 500)

    return () => {
      // 이벤트 제거
      window.kakao.maps.event.removeListener(map, 'dragend', handleDragEnd)
      window.kakao.maps.event.removeListener(map, 'zoom_changed', handleZoomChanged)
    }
  }, [map, handleMapBoundsChange])

  // 지도 클릭 이벤트 (제보 위치 선택용)
  const handleMapClick = async (event: any) => {
    if (!onLocationSelect) return

    const { latLng } = event
    const lat = latLng.getLat()
    const lng = latLng.getLng()

    // 역지오코딩으로 행정동 주소 가져오기
    try {
      const address = await reverseGeocode({ lat, lng })
      onLocationSelect({ lat, lng, address })
    } catch (error) {
      console.error('Failed to reverse geocode on map click', error)
      onLocationSelect({ lat, lng, address: '' })
    }
  }

  // 마커 관련 함수들은 공통 유틸리티로 이동됨


  // 단일 마커 클릭 핸들러
  const handleMarkerClick = (report: ReportType) => {
    console.log('🎯 MapComponent: 마커 클릭됨', report.id)

    // 마커를 클릭하면 해당 위치로 맵 중심 부드럽게 이동하고 적당히 줌인
    if (map) {
      const moveLatLng = new window.kakao.maps.LatLng(report.location.lat, report.location.lng)

      // 부드러운 이동
      map.panTo(moveLatLng)

      // 적당한 줌 레벨로 설정 (너무 과도하지 않게)
      const currentLevel = map.getLevel()
      const targetLevel = Math.max(currentLevel, 3)

      if (currentLevel > targetLevel) {
        // 부드러운 줌인 (카카오맵 네이티브 기능 사용)
        setTimeout(() => {
          map.setLevel(targetLevel, { animate: { duration: 500 } }) // 500ms 애니메이션
        }, 200) // 이동 후 약간 딜레이
      }
    }

    // 부모 컴포넌트에 마커 클릭 이벤트 전달
    console.log('📤 MapComponent: onMarkerClick 호출', typeof onMarkerClick, report.id)
    if (onMarkerClick) {
      onMarkerClick(report)
    } else {
      console.warn('⚠️ MapComponent: onMarkerClick이 정의되지 않음')
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
          onBoundsChanged={handleMapBoundsChange}
          onZoomChanged={handleZoomChange}
        >
          {/* 그룹화된 마커들을 MarkerClusterer로 감싸서 줌 아웃 시 지도상에 뭉치는 현상(클러스터링) 해결 */}
          <MarkerClusterer
            averageCenter={true} // 클러스터에 포함된 마커들의 평균 위치를 클러스터 마커 위치로 설정
            minLevel={5} // 클러스터링 할 최소 지도 레벨 지정 (줌레벨 4까지는 개별 표시, 5부터 묶음)
            calculator={[10, 30, 50]} // 클러스터의 숫자 구분에 적용할 기준
            styles={[
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
            ]}
          >
            {/* 개별 마커들 (MarkerClusterer가 알아서 화면 기준 병합) */}
            {validReports.map((report) => {
              const isSelected = selectedMarkerId === report.id;

              return (
                <CustomOverlayMap
                  key={report.id}
                  position={{ lat: report.location.lat, lng: report.location.lng }}
                  yAnchor={1}
                  xAnchor={0.5}
                  zIndex={isSelected ? 50 : 1}
                >
                  <div
                    onClick={() => handleMarkerClick(report)}
                    className={`cursor-pointer transition-all duration-300 ${isSelected ? 'scale-125' : 'hover:scale-110'}`}
                    style={{
                      filter: isSelected ? 'drop-shadow(0 10px 15px rgba(0,0,0,0.3))' : 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))',
                      transformOrigin: 'bottom center'
                    }}
                  >
                    {/* 단일 제보 */}
                    <div
                      className={`relative transition-all duration-300 ${isSelected
                        ? 'w-10 h-10 -translate-y-2'
                        : 'w-7 h-7'
                        }`}
                    >
                      <MapPin
                        className="w-full h-full"
                        style={{
                          fill: getMarkerColor(report.category),
                          stroke: isSelected ? '#3b82f6' : 'white', // Tailwind colors.blue.500
                          strokeWidth: isSelected ? '2' : '1.5',
                        }}
                      />
                    </div>
                  </div>
                </CustomOverlayMap>
              );
            })}
          </MarkerClusterer>
        </Map>
      </div>



    </div>
  )
}