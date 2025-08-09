'use client'

import { UnifiedSearch as UIUnifiedSearch } from '@/components/ui'
import { getDisplayNeighborhoodName } from '@/lib/utils/neighborhoodUtils'
import { convertPlaceToAdministrativeAddress } from '@/lib/utils/addressUtils'

interface UnifiedSearchProps {
  searchMode: 'location' | 'text'
  onLocationSelect: (location: { lat: number; lng: number; address: string; placeName: string }) => void
  onTextSearch: (query: string) => void
  className?: string
}

export default function UnifiedSearch({ 
  searchMode,
  onLocationSelect, 
  onTextSearch,
  className
}: UnifiedSearchProps) {
  // 위치 선택 핸들러에서 주소 변환 적용
  const handleLocationSelect = (location: { lat: number; lng: number; address: string; placeName: string }) => {
    // 기존 유틸리티 함수를 사용해서 행정동 주소로 변환
    const place = {
      place_name: location.placeName,
      address_name: location.address,
      road_address_name: '',
      x: location.lng.toString(),
      y: location.lat.toString(),
      category_name: '',
      place_url: ''
    }
    
    const adminAddress = convertPlaceToAdministrativeAddress(place)
    
    onLocationSelect({
      ...location,
      address: adminAddress
    })
  }

  return (
    <UIUnifiedSearch
      searchMode={searchMode}
      onLocationSelect={handleLocationSelect}
      onTextSearch={onTextSearch}
      className={className}
    />
  )
}