import { MapPin } from 'lucide-react'
import { PlaceResult } from './types'
import { getDisplayNeighborhoodName } from '@/lib/utils/neighborhoodUtils'

interface LocationResultListProps {
  results: PlaceResult[]
  query: string
  isLoading: boolean
  onSelect: (place: PlaceResult) => void
  className?: string
}

export default function LocationResultList({ 
  results, 
  query, 
  isLoading, 
  onSelect,
  className = ""
}: LocationResultListProps) {
  if (isLoading) {
    return (
      <div className={`p-4 text-center text-gray-500 ${className}`}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
        검색 중...
      </div>
    )
  }

  if (results.length === 0 && query.length >= 2) {
    return (
      <div className={`p-4 text-center text-gray-500 ${className}`}>
        <MapPin className="h-8 w-8 text-gray-300 mx-auto mb-2" />
        <p>'{query}' 검색 결과가 없습니다</p>
        <p className="text-sm text-gray-400 mt-1">다른 키워드로 검색해보세요</p>
      </div>
    )
  }

  if (results.length === 0) return null

  return (
    <div className={`py-2 ${className}`}>
      {results.map((place, index) => {
        const displayName = getDisplayNeighborhoodName(
          place.place_name,
          place.address_name,
          place.road_address_name
        )
        const isNeighborhoodDifferent = displayName !== place.place_name
        
        return (
          <button
            key={index}
            onClick={() => onSelect(place)}
            className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
          >
            <div className="flex items-start space-x-3">
              <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <div className="font-medium text-gray-900 truncate">
                    {place.place_name}
                  </div>
                  {isNeighborhoodDifferent && (
                    <div className="text-xs text-primary bg-blue-50 px-2 py-1 rounded">
                      {place.category_name.split(' > ').pop()}
                    </div>
                  )}
                </div>
                <div className="text-sm text-gray-600 truncate">
                  {place.address_name || place.road_address_name}
                </div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
