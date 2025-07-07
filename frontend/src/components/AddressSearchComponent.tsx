'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Search, MapPin, X } from 'lucide-react'

interface AddressResult {
  place_name: string
  address_name: string
  road_address_name?: string
  x: string  // 경도
  y: string  // 위도
  category_group_code?: string
  category_group_name?: string
}

interface AddressSearchProps {
  onAddressSelect: (result: {
    lat: number
    lng: number
    address: string
    placeName?: string
  }) => void
  placeholder?: string
  className?: string
}

export default function AddressSearchComponent({ 
  onAddressSelect, 
  placeholder = "주소나 장소명을 검색하세요",
  className = ""
}: AddressSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AddressResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 카카오 지도 API Places 서비스
  const ps = useRef<any>(null)

  useEffect(() => {
    // 카카오 지도 API 로드 확인 및 Places 서비스 초기화
    const initKakaoPlaces = () => {
      if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
        ps.current = new window.kakao.maps.services.Places()
      } else {
        setTimeout(initKakaoPlaces, 100)
      }
    }
    initKakaoPlaces()
  }, [])

  // 외부 클릭 시 결과창 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 주소 검색 함수
  const searchAddress = async (searchQuery: string) => {
    if (!ps.current || !searchQuery.trim()) {
      setResults([])
      return
    }

    setIsLoading(true)

    // Places 서비스로 키워드 검색
    ps.current.keywordSearch(searchQuery, (data: AddressResult[], status: any) => {
      setIsLoading(false)
      
      if (status === window.kakao.maps.services.Status.OK) {
        setResults(data.slice(0, 8)) // 최대 8개 결과만 표시
        setIsOpen(true)
      } else {
        setResults([])
        setIsOpen(false)
      }
    }, {
      location: new window.kakao.maps.LatLng(37.5665, 126.9780), // 서울 중심으로 검색
      radius: 20000, // 20km 반경
      sort: window.kakao.maps.services.SortBy.ACCURACY // 정확도순 정렬
    })
  }

  // 디바운스된 검색
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.length >= 2) {
        searchAddress(query)
      } else {
        setResults([])
        setIsOpen(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query])

  // 주소 선택 핸들러
  const handleAddressSelect = (result: AddressResult) => {
    // 정확한 장소명 우선 사용, 카테고리 정보가 있으면 포함
    let displayTitle = result.place_name
    
    // 지하철역이나 특정 카테고리인 경우 더 상세한 정보 포함
    if (result.category_group_name) {
      displayTitle = `${result.place_name} ${result.category_group_name}`
    }

    const selectedAddress = {
      lat: parseFloat(result.y),
      lng: parseFloat(result.x),
      address: result.road_address_name || result.address_name,
      placeName: displayTitle // 개선된 장소명 사용
    }

    // 상태 완전 정리
    setQuery(displayTitle) // 입력창에도 상세한 정보 표시
    setResults([]) // 검색 결과 완전 초기화
    setIsOpen(false) // 드롭다운 닫기
    inputRef.current?.blur() // 포커스 해제
    
    // 콜백 호출
    onAddressSelect(selectedAddress)
    
    console.log('✅ 주소 선택 완료 및 검색 결과 정리됨')
  }

  // 검색창 초기화
  const clearSearch = () => {
    setQuery('')
    setResults([])
    setIsOpen(false)
    inputRef.current?.focus()
  }

  // 카테고리별 아이콘
  const getCategoryIcon = (categoryCode?: string) => {
    const icons = {
      'MT1': '🏪', // 대형마트
      'CS2': '🏪', // 편의점
      'PS3': '👶', // 어린이집, 유치원
      'SC4': '🏫', // 학교
      'AC5': '🏛️', // 학원
      'PK6': '🅿️', // 주차장
      'OL7': '⛽', // 주유소, 충전소
      'SW8': '🚇', // 지하철역
      'BK9': '🏦', // 은행
      'CT1': '🏛️', // 문화시설
      'AG2': '🏢', // 중개업소
      'PO3': '🏥', // 공공기관
      'AT4': '🏞️', // 관광명소
      'AD5': '🏨', // 숙박
      'FD6': '🍽️', // 음식점
      'CE7': '☕', // 카페
      'HP8': '🏥', // 병원
      'PM9': '💊'  // 약국
    }
    return icons[categoryCode as keyof typeof icons] || '📍'
  }

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* 검색 입력창 */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true)
          }}
          placeholder={placeholder}
          className="block w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 placeholder-gray-500"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* 검색 결과 드롭다운 */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              검색 중...
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={index}
                  onClick={() => handleAddressSelect(result)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-lg mt-0.5">
                      {getCategoryIcon(result.category_group_code)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {result.place_name}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {result.road_address_name || result.address_name}
                      </div>
                      {result.category_group_name && (
                        <div className="text-xs text-blue-600 mt-1">
                          {result.category_group_name}
                        </div>
                      )}
                    </div>
                    <MapPin className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          ) : query.length >= 2 ? (
            <div className="p-4 text-center text-gray-500">
              검색 결과가 없습니다.
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}