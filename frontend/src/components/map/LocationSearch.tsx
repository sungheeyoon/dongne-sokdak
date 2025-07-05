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
        setIsLoading(false)
        
        if (status === window.kakao.maps.services.Status.OK) {
          console.log('🔍 검색 결과:', data.slice(0, 5)) // 상위 5개만
          setResults(data.slice(0, 5))
          setShowResults(true)
        } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
          console.log('🔍 검색 결과 없음')
          setResults([])
          setShowResults(true)
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
    const timeoutId = setTimeout(() => {
      if (query.length >= 2) {
        searchPlaces(query)
      } else {
        setResults([])
        setShowResults(false)
      }
    }, 300) // 300ms 디바운스

    return () => clearTimeout(timeoutId)
  }, [query])

  // 검색 결과 선택
  const handlePlaceSelect = (place: PlaceResult) => {
    // 행정동 기반 주소로 변환
    const adminAddress = convertPlaceToAdministrativeAddress(place)
    
    // 실제 동네 이름 추출 (기존 로직 유지)
    const displayName = getDisplayNeighborhoodName(
      place.place_name,
      place.address_name,
      place.road_address_name
    )
    
    const location = {
      lat: parseFloat(place.y),
      lng: parseFloat(place.x),
      address: adminAddress, // 행정동 주소 사용
      placeName: displayName // 추출된 동네 이름 사용
    }
    
    console.log('📍 선택된 장소:', {
      원본: place.place_name,
      동네이름: displayName,
      행정동주소: adminAddress,
      원본주소: place.road_address_name || place.address_name
    })
    
    setQuery(place.place_name)
    setShowResults(false)
    onLocationSelect(location)
  }

  // 검색창 클리어
  const clearSearch = () => {
    setQuery('')
    setResults([])
    setShowResults(false)
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
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setShowResults(true)
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
