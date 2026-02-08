'use client'

import { useState } from 'react'
import { useMyProfile, useUpdateNeighborhood, useDeleteNeighborhood } from '@/hooks/useProfile'
import LocationSearch from '@/components/map/LocationSearch'
import LocationResultList from '@/components/map/LocationResultList'
import { PlaceResult } from '@/components/map/types'
import { MapPin, Home, Trash2, Search, Crosshair } from 'lucide-react'
import { NeighborhoodInfo } from '@/types'
import { formatToAdministrativeAddress, convertPlaceToAdministrativeAddress } from '@/lib/utils/addressUtils'
import { 
  UiDialog as Dialog, 
  UiDialogContent as DialogContent, 
  UiDialogHeader as DialogHeader, 
  UiDialogTitle as DialogTitle,
  UiButton as Button,
  UiCard as Card
} from '@/components/ui'

interface MyNeighborhoodModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function MyNeighborhoodModal({ isOpen, onClose }: MyNeighborhoodModalProps) {
  const { data: profile } = useMyProfile()
  const updateNeighborhoodMutation = useUpdateNeighborhood()
  const deleteNeighborhoodMutation = useDeleteNeighborhood()
  const [isSelecting, setIsSelecting] = useState(false)
  
  // Search state
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  // 모달이 닫힐 때 상태 초기화
  const handleClose = () => {
    setIsSelecting(false)
    setSearchResults([])
    setSearchQuery('')
    setIsSearching(false)
    onClose()
  }

  // 동네 선택 핸들러 (LocationSearch에서 호출)
  const handleNeighborhoodSelect = (location: { lat: number; lng: number; address: string; placeName: string }) => {
    const neighborhood: NeighborhoodInfo = {
      place_name: location.placeName,
      address: location.address,
      lat: location.lat,
      lng: location.lng
    }

    updateNeighborhoodMutation.mutate(neighborhood, {
      onSuccess: () => {
        handleClose()
      }
    })
  }

  // 리스트에서 직접 선택 시 핸들러
  const handlePlaceSelect = (place: PlaceResult) => {
    const adminAddress = convertPlaceToAdministrativeAddress(place)
    const location = {
      lat: parseFloat(place.y),
      lng: parseFloat(place.x),
      address: adminAddress,
      placeName: place.place_name
    }
    handleNeighborhoodSelect(location)
  }

  // 내 동네 삭제
  const handleDeleteNeighborhood = () => {
    if (confirm('내 동네 설정을 삭제하시겠습니까?')) {
      deleteNeighborhoodMutation.mutate(undefined, {
        onSuccess: () => {
          handleClose()
        }
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden max-h-[85vh] flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <Home className="h-6 w-6 text-primary" />
            내 동네 설정
          </DialogTitle>
        </DialogHeader>

        {/* 컨텐츠 (스크롤 가능 영역) */}
        <div className="p-6 overflow-y-auto">
          {/* 현재 설정된 동네 */}
          {profile?.neighborhood && !isSelecting ? (
            <div className="space-y-6">
              <Card className="p-5 border-blue-100 bg-blue-50/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-blue-700 font-semibold mb-1">
                      <MapPin className="h-4 w-4" />
                      현재 설정된 동네
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {formatToAdministrativeAddress(profile.neighborhood.address)}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {profile.neighborhood.place_name}
                    </p>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDeleteNeighborhood}
                    disabled={deleteNeighborhoodMutation.isPending}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 -mr-2"
                    title="내 동네 삭제"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </Card>
              
              <div className="grid gap-3">
                <Button 
                  onClick={() => setIsSelecting(true)} 
                  className="w-full py-6 text-base font-semibold"
                >
                  <Search className="w-4 h-4 mr-2" />
                  다른 동네로 변경하기
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleClose}
                  className="w-full"
                >
                  닫기
                </Button>
              </div>
            </div>
          ) : (
            /* 동네 선택 */
            <div className="space-y-6">
              {/* 헤더 및 설명 (검색어가 없을 때만 표시) */}
              {searchQuery.length < 2 && (
                <div className="text-center pb-2">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {profile?.neighborhood ? '어떤 동네로 변경할까요?' : '우리 동네를 설정해주세요'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    동네를 설정하면 내 주변의 이웃 소식을<br/>
                    더 빠르고 정확하게 확인할 수 있어요.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <LocationSearch
                  onLocationSelect={handleNeighborhoodSelect}
                  placeholder="동네 이름(예: 논현동)으로 검색"
                  showList={false} // 내부 리스트 숨김
                  onResultsChange={setSearchResults}
                  onQueryChange={setSearchQuery}
                  onLoadingChange={setIsSearching}
                />
                
                {/* 검색 결과 리스트 (메인 컨텐츠 영역에 렌더링) */}
                {searchQuery.length >= 2 && (
                  <div className="border rounded-lg overflow-hidden border-gray-200">
                    <LocationResultList 
                      results={searchResults}
                      query={searchQuery}
                      isLoading={isSearching}
                      onSelect={handlePlaceSelect}
                    />
                  </div>
                )}
              </div>

              {/* 하단 버튼 (검색어가 없을 때만 표시) */}
              {profile?.neighborhood && searchQuery.length < 2 && (
                <Button 
                  variant="ghost" 
                  onClick={() => setIsSelecting(false)}
                  className="w-full"
                >
                  취소하고 돌아가기
                </Button>
              )}
            </div>
          )}

          {/* 로딩 상태 (뮤테이션) */}
          {(updateNeighborhoodMutation.isPending || deleteNeighborhoodMutation.isPending) && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <span className="text-sm text-gray-600 font-medium">
                  {updateNeighborhoodMutation.isPending ? '동네 설정 중...' : '동네 삭제 중...'}
                </span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
