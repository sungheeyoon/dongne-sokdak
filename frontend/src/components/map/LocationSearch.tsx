'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { convertPlaceToAdministrativeAddress } from '@/lib/utils/addressUtils'
import { PlaceResult } from './types'
import LocationResultList from './LocationResultList'

interface LocationSearchProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string; placeName: string }) => void
  placeholder?: string
  className?: string
  showList?: boolean // 내부 리스트 렌더링 여부
  onResultsChange?: (results: PlaceResult[]) => void // 검색 결과 변경 콜백
  onQueryChange?: (query: string) => void // 검색어 변경 콜백
  onLoadingChange?: (isLoading: boolean) => void // 로딩 상태 변경 콜백
}

export default function LocationSearch({ 
  onLocationSelect, 
  placeholder = "동네, 건물명, 지번을 검색하세요",
  className = "",
  showList = true,
  onResultsChange,
  onQueryChange,
  onLoadingChange
}: LocationSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [isPlaceSelected, setIsPlaceSelected] = useState(false)
  const [selectedPlaceName, setSelectedPlaceName] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // 검색 실행
  const searchPlaces = async (searchQuery: string) => {
    if (!searchQuery.trim() || !window.kakao?.maps?.services) {
      setResults([])
      onResultsChange?.([])
      return
    }

    setIsLoading(true)
    onLoadingChange?.(true)
    
    try {
      const places = new window.kakao.maps.services.Places()
      
      places.keywordSearch(searchQuery, (data: PlaceResult[], status: any) => {
        if (isPlaceSelected) {
          setIsLoading(false)
          onLoadingChange?.(false)
          return
        }
        
        setIsLoading(false)
        onLoadingChange?.(false)
        
        if (status === window.kakao.maps.services.Status.OK) {
          const newResults = data.slice(0, 15) // 더 많은 결과 표시
          setResults(newResults)
          onResultsChange?.(newResults)
          
          if (!isPlaceSelected && searchQuery !== selectedPlaceName) {
            setShowResults(true)
          }
        } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
          setResults([])
          onResultsChange?.([])
          if (!isPlaceSelected && searchQuery !== selectedPlaceName) {
            setShowResults(true)
          }
        } else {
          setResults([])
          onResultsChange?.([])
          setShowResults(false)
        }
      })
    } catch (error) {
      console.error('❌ Places API 오류:', error)
      setIsLoading(false)
      onLoadingChange?.(false)
      setResults([])
      onResultsChange?.([])
    }
  }

  // 디바운스 검색
  useEffect(() => {
    if (isPlaceSelected) return
    
    const timeoutId = setTimeout(() => {
      if (query.length >= 2) {
        searchPlaces(query)
      } else {
        setResults([])
        onResultsChange?.([])
        if (!isPlaceSelected) {
          setShowResults(false)
        }
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query, isPlaceSelected])

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    if (isPlaceSelected && newValue !== query) {
      setIsPlaceSelected(false)
    }
    setQuery(newValue)
    onQueryChange?.(newValue)
  }

  const handlePlaceSelect = (place: PlaceResult) => {
    const adminAddress = convertPlaceToAdministrativeAddress(place)
    const location = {
      lat: parseFloat(place.y),
      lng: parseFloat(place.x),
      address: adminAddress,
      placeName: place.place_name
    }
    
    setIsPlaceSelected(true)
    setSelectedPlaceName(place.place_name)
    setShowResults(false)
    setResults([])
    onResultsChange?.([]) // 선택 후 결과 초기화
    setIsLoading(false)
    onLoadingChange?.(false)
    
    setQuery(place.place_name)
    onQueryChange?.(place.place_name)
    
    searchInputRef.current?.blur()
    onLocationSelect(location)
  }

  const clearSearch = () => {
    setQuery('')
    onQueryChange?.('')
    setResults([])
    onResultsChange?.([])
    setShowResults(false)
    setIsPlaceSelected(false)
    setSelectedPlaceName('')
    searchInputRef.current?.focus()
  }

  // 외부 클릭시 결과창 닫기 (내부 리스트 사용시에만)
  useEffect(() => {
    if (!showList) return

    const handleClickOutside = (event: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showList])

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={handleQueryChange}
          onFocus={() => {
            if (results.length > 0 && !isPlaceSelected) {
              setShowResults(true)
            }
          }}
          className="w-full pl-10 pr-12 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal"
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

      {showList && showResults && (
        <div 
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
        >
          <LocationResultList
            results={results}
            query={query}
            isLoading={isLoading}
            onSelect={handlePlaceSelect}
          />
        </div>
      )}
    </div>
  )
}
