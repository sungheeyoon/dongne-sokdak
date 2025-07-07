'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, MapPin, X } from 'lucide-react'
import { getDisplayNeighborhoodName } from '@/lib/utils/neighborhoodUtils'
import { convertPlaceToAdministrativeAddress, formatToAdministrativeAddress } from '@/lib/utils/addressUtils'

declare global {
  interface Window {
    kakao: any;
  }
}

interface PlaceResult {
  place_name: string
  address_name: string
  road_address_name: string
  x: string // 경도
  y: string // 위도
  category_name: string
  place_url: string
}

interface LocationSearchProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string; placeName: string }) => void
  placeholder?: string
  className?: string
}

export default function LocationSearch({ 
  onLocationSelect, 
  placeholder = "동네, 건물명, 지번을 검색하세요",
  className = ""
}: LocationSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [isPlaceSelected, setIsPlaceSelected] = useState(false) // 장소 선택 플래그
  const [selectedPlaceName, setSelectedPlaceName] = useState('') // 선택된 장소명 저장
  const searchInputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // 검색 실행
  const searchPlaces = async (searchQuery: string) => {
    if (!searchQuery.trim() || !window.kakao?.maps?.services) {
      setResults([])
      return
    }

    setIsLoading(true)
    
    try {
      const places = new window.kakao.maps.services.Places()
      
      places.keywordSearch(searchQuery, (data: PlaceResult[], status: any) => {
        // 장소 선택 후라면 검색 결과 무시
        if (isPlaceSelected) {
          console.log('🚫 장소 선택 후 검색 결과 무시:', searchQuery)
          setIsLoading(false)
          return
        }
        
        setIsLoading(false)
        
        if (status === window.kakao.maps.services.Status.OK) {
          console.log('🔍 검색 결과:', data.slice(0, 5)) // 상위 5개만
          setResults(data.slice(0, 5))
          // 장소 선택 후 또는 이미 선택한 장소와 같은 검색어일 때는 드롭다운을 절대 열지 않음
          if (!isPlaceSelected && searchQuery !== selectedPlaceName) {
            setShowResults(true)
          }
        } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
          console.log('🔍 검색 결과 없음')
          setResults([])
          // 장소 선택 후 또는 이미 선택한 장소와 같은 검색어일 때는 드롭다운을 절대 열지 않음
          if (!isPlaceSelected && searchQuery !== selectedPlaceName) {
            setShowResults(true)
          }
        } else {
          console.error('🔍 검색 오류:', status)
          setResults([])
          setShowResults(false)
        }
      })
    } catch (error) {
      console.error('❌ Places API 오류:', error)
      setIsLoading(false)
      setResults([])
    }
  }

  // 디바운스 검색
  useEffect(() => {
    // 장소 선택으로 인한 query 변경이면 검색하지 않음
    if (isPlaceSelected) {
      console.log('🚫 장소 선택 후 query 변경 감지, 검색 스킵')
      return // 아무것도 하지 않고 리턴
    }
    
    const timeoutId = setTimeout(() => {
      if (query.length >= 2) {
        console.log('🔍 검색 실행:', query)
        searchPlaces(query)
      } else {
        setResults([])
        // 장소 선택 후가 아닐 때만 드롭다운 닫기
        if (!isPlaceSelected) {
          setShowResults(false)
        }
      }
    }, 300) // 300ms 디바운스

    return () => clearTimeout(timeoutId)
  }, [query, isPlaceSelected])


  // 검색 결과 선택
  const handlePlaceSelect = (place: PlaceResult) => {
    console.log('📍 드롭다운에서 장소 선택:', place.place_name)
    
    // 행정동 기반 주소로 변환
    const adminAddress = convertPlaceToAdministrativeAddress(place)
    
    const location = {
      lat: parseFloat(place.y),
      lng: parseFloat(place.x),
      address: adminAddress,
      placeName: place.place_name
    }
    
    // ⭐ 완전한 드롭다운 상태 리셋 및 고정
    setIsPlaceSelected(true) // 플래그를 먼저 설정하여 모든 후속 동작 차단
    setSelectedPlaceName(place.place_name) // 선택된 장소명 저장
    setShowResults(false) // 드롭다운 완전 닫기
    setResults([]) // 검색 결과 완전 삭제
    setIsLoading(false) // 로딩 해제
    
    // 검색어를 선택된 장소명으로 업데이트
    setQuery(place.place_name)
    
    // 입력창 포커스 해제하여 재포커스 방지
    searchInputRef.current?.blur()
    
    // 부모 컴포넌트에 위치 전달
    onLocationSelect(location)
    
    console.log('✅ 장소 선택 완료, 드롭다운 완전 닫힘')
  }

  // 검색창 클리어
  const clearSearch = () => {
    setQuery('')
    setResults([])
    setShowResults(false)
    setIsPlaceSelected(false) // 플래그도 리셋하여 새로운 검색 가능하게 함
    setSelectedPlaceName('') // 선택된 장소명도 리셋
    searchInputRef.current?.focus()
  }

  // 외부 클릭시 결과창 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={`relative ${className}`}>
      {/* 검색 입력창 */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => {
            const newValue = e.target.value
            // 사용자가 직접 입력을 변경하는 경우에만 플래그 리셋
            if (isPlaceSelected && newValue !== query) {
              console.log('🔄 사용자 입력 변경으로 플래그 리셋')
              setIsPlaceSelected(false)
            }
            setQuery(newValue)
          }}
          onFocus={() => {
            // 장소 선택 후에는 포커스 시에도 드롭다운을 열지 않음
            if (results.length > 0 && !isPlaceSelected) {
              setShowResults(true)
            }
          }}
          className="w-full pl-10 pr-12 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 placeholder-gray-500"
          placeholder={placeholder}
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {/* 검색 결과 */}
      {showResults && (
        <div 
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
        >
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              검색 중...
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((place, index) => {
                // 각 검색 결과에 대해 동네 이름과 행정동 주소 미리 계산
                const displayName = getDisplayNeighborhoodName(
                  place.place_name,
                  place.address_name,
                  place.road_address_name
                )
                const adminAddress = convertPlaceToAdministrativeAddress(place)
                const isNeighborhoodDifferent = displayName !== place.place_name
                
                return (
                  <button
                    key={index}
                    onClick={() => handlePlaceSelect(place)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                  >
                    <div className="flex items-start space-x-3">
                      <MapPin className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <div className="font-medium text-gray-900 truncate">
                            {isNeighborhoodDifferent ? displayName : place.place_name}
                          </div>
                          {isNeighborhoodDifferent && (
                            <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                              {place.place_name}
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 truncate">
                          {adminAddress}
                        </div>
                        <div className="text-xs text-gray-400 truncate">
                          {place.road_address_name || place.address_name}
                        </div>
                        {place.category_name && (
                          <div className="text-xs text-gray-400 mt-1">
                            {place.category_name.split(' > ').pop()}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : query.length >= 2 ? (
            <div className="p-4 text-center text-gray-500">
              <MapPin className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p>'{query}' 검색 결과가 없습니다</p>
              <p className="text-sm text-gray-400 mt-1">다른 키워드로 검색해보세요</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
