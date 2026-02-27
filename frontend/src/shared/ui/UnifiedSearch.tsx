'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, MapPin, X, FileText } from 'lucide-react'
import { clsx } from 'clsx'

import { useLocationViewModel } from '@/features/map/presentation/hooks/useLocationViewModel'
import { PlaceSearchResult } from '@/features/map/domain/entities'

export interface UnifiedSearchProps {
  searchMode: 'location' | 'text'
  onLocationSelect: (location: { lat: number; lng: number; address: string; placeName: string }) => void
  onTextSearch: (query: string) => void
  className?: string
  placeholder?: string
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const sizeStyles = {
  sm: 'py-2 text-sm',
  md: 'py-3 text-base',
  lg: 'py-4 text-lg'
}

export const UnifiedSearch: React.FC<UnifiedSearchProps> = ({
  searchMode,
  onLocationSelect,
  onTextSearch,
  className,
  placeholder,
  disabled = false,
  size = 'md'
}) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceSearchResult[]>([])
  const { searchPlaces: fetchPlaces, isSearching: isLoading } = useLocationViewModel()
  const [showResults, setShowResults] = useState(false)
  const [isPlaceSelected, setIsPlaceSelected] = useState(false)
  const [selectedPlaceName, setSelectedPlaceName] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // onTextSearch 콜백을 최신 상태로 유지하기 위한 ref
  const onTextSearchRef = useRef(onTextSearch)
  useEffect(() => {
    onTextSearchRef.current = onTextSearch
  }, [onTextSearch])

  // 검색 모드 변경 시 상태 초기화
  useEffect(() => {
    setQuery('')
    setResults([])
    setShowResults(false)
    setIsPlaceSelected(false)
    setSelectedPlaceName('')

    // 모드가 바뀔 때 제보 텍스트 검색도 초기화 (호출을 통해 빈 값 전달)
    onTextSearchRef.current('')
  }, [searchMode])

  // 장소 검색 실행 (카카오맵 API)
  const searchPlaces = async (searchQuery: string) => {
    if (!searchQuery.trim() || searchMode !== 'location') {
      setResults([])
      return
    }

    try {
      const data = await fetchPlaces(searchQuery)

      if (isPlaceSelected) {
        return
      }

      if (data && data.length > 0) {
        setResults(data.slice(0, 5))
        if (!isPlaceSelected && searchQuery !== selectedPlaceName) {
          setShowResults(true)
        }
      } else {
        setResults([])
        if (!isPlaceSelected && searchQuery !== selectedPlaceName) {
          setShowResults(true)
        }
      }
    } catch (error) {
      console.error('❌ Places API 오류:', error)
      setResults([])
    }
  }

  // 텍스트 검색 실행
  const handleTextSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchMode === 'text' && query.trim()) {
      onTextSearch(query.trim())
    }
  }

  // 디바운스 검색 (위치 검색 모드일 때만)
  useEffect(() => {
    if (searchMode === 'location' && !isPlaceSelected) {
      const timeoutId = setTimeout(() => {
        if (query.length >= 2) {
          searchPlaces(query)
        } else {
          setResults([])
          setShowResults(false)
        }
      }, 300)

      return () => clearTimeout(timeoutId)
    }
  }, [query, searchMode, isPlaceSelected])

  // 장소 선택 처리
  const handlePlaceSelect = (place: PlaceSearchResult) => {
    // 행정동 변환
    const adminAddress = place.address

    const location = {
      lat: place.location.lat,
      lng: place.location.lng,
      address: adminAddress,
      placeName: place.placeName
    }

    setIsPlaceSelected(true)
    setSelectedPlaceName(place.placeName)
    setShowResults(false)
    setResults([])
    setQuery(place.placeName)

    searchInputRef.current?.blur()
    onLocationSelect(location)
  }

  // 검색창 클리어
  const clearSearch = () => {
    setQuery('')
    setResults([])
    setShowResults(false)
    setIsPlaceSelected(false)
    setSelectedPlaceName('')
    searchInputRef.current?.focus()

    // 텍스트 검색 모드일 때는 빈 검색어로 검색 실행
    if (searchMode === 'text') {
      onTextSearch('')
    }
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

  const getPlaceholder = () => {
    if (placeholder) return placeholder

    if (searchMode === 'location') {
      return "동네, 건물명, 지번을 검색하세요"
    } else {
      return "제보 제목이나 내용으로 검색..."
    }
  }

  const getSearchIcon = () => {
    return searchMode === 'location' ? <MapPin className="h-5 w-5" /> : <FileText className="h-5 w-5" />
  }

  return (
    <div className={clsx('relative', className)}>
      {/* 검색 입력창 */}
      <form onSubmit={handleTextSearch} className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <div className="text-blue-500">
            {getSearchIcon()}
          </div>
        </div>
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => {
            const newValue = e.target.value
            if (isPlaceSelected && newValue !== query) {
              setIsPlaceSelected(false)
            }
            setQuery(newValue)

            // 사용자가 글자를 모두 지우면 즉시 텍스트 검색 결과도 초기화
            if (searchMode === 'text' && newValue.trim() === '') {
              onTextSearch('')
            }
          }}
          onFocus={() => {
            if (searchMode === 'location' && results.length > 0 && !isPlaceSelected) {
              setShowResults(true)
            }
          }}
          disabled={disabled}
          className={clsx(
            'w-full pl-10 pr-16 border-2 border-blue-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal transition-all duration-200',
            sizeStyles[size],
            disabled && 'opacity-50 cursor-not-allowed bg-gray-100'
          )}
          placeholder={getPlaceholder()}
        />
        <div className="absolute inset-y-0 right-0 flex items-center">
          {query && !disabled && (
            <button
              type="button"
              onClick={clearSearch}
              className="mr-2 text-gray-400 hover:text-gray-600 p-1 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {searchMode === 'text' && !disabled && (
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-r-lg font-semibold transition-colors h-full disabled:opacity-50"
              disabled={disabled}
            >
              검색
            </button>
          )}
          {searchMode === 'location' && isLoading && (
            <div className="pr-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
      </form>

      {/* 검색 결과 (위치 검색 모드일 때만) */}
      {searchMode === 'location' && showResults && !disabled && (
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
              {results.map((place, index) => (
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
                          {place.placeName}
                        </div>
                        {place.categoryName && (
                          <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            {place.categoryName.split(' > ').pop()}
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 truncate">
                        {place.roadAddress || place.address}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
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

export default UnifiedSearch