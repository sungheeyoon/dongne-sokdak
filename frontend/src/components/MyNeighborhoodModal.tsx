'use client'

import { useState } from 'react'
import { useMyProfile, useUpdateNeighborhood, useDeleteNeighborhood } from '@/hooks/useProfile'
import LocationSearch from '@/components/map/LocationSearch'
import { MapPin, X, Home, Trash2 } from 'lucide-react'
import { NeighborhoodInfo } from '@/types'
import { extractNeighborhoodFromAddress } from '@/lib/utils/neighborhoodUtils'
import MarkerIcon from '@/components/ui/MarkerIcon'
import { formatToAdministrativeAddress } from '@/lib/utils/addressUtils'

interface MyNeighborhoodModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function MyNeighborhoodModal({ isOpen, onClose }: MyNeighborhoodModalProps) {
  const { data: profile } = useMyProfile()
  const updateNeighborhoodMutation = useUpdateNeighborhood()
  const deleteNeighborhoodMutation = useDeleteNeighborhood()
  const [isSelecting, setIsSelecting] = useState(false)

  // 모달이 닫힐 때 상태 초기화
  const handleClose = () => {
    setIsSelecting(false)
    onClose()
  }

  if (!isOpen) return null

  // 동네 선택 핸들러
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
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={handleClose}
    >
      <div 
        className={`bg-white rounded-xl max-w-lg w-full overflow-hidden ${
          isSelecting ? 'max-h-[90vh]' : 'max-h-[200vh]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Home className="h-6 w-6 text-blue-600 mr-2" />
            내 동네 설정
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className={`p-6 space-y-6 overflow-y-auto ${
          isSelecting ? 'max-h-[calc(90vh-120px)]' : 'max-h-[calc(95vh-120px)]'
        }`}>
          {/* 현재 설정된 동네 */}
          {profile?.neighborhood && !isSelecting ? (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <MapPin className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="font-medium text-blue-900">현재 내 동네</span>
                  </div>
                  
                  {/* 주소 */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-blue-900">                      
                      {formatToAdministrativeAddress(profile.neighborhood.address)}
                    </h3>
                    <div className="text-sm space-y-1">
                          <p className="text-blue-700 flex items-center">
                           
                            위치: {profile.neighborhood.place_name}
                          </p>
                       
                  
                        </div>
                    
                    
                  </div>
                </div>
                <button
                  onClick={handleDeleteNeighborhood}
                  disabled={deleteNeighborhoodMutation.isPending}
                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                  title="내 동네 삭제"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              
              <div className="mt-4 pt-4 border-t border-blue-200">
                <button
                  onClick={() => setIsSelecting(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  동네 변경하기
                </button>
              </div>
            </div>
          ) : (
            /* 동네 선택 */
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="text-4xl mb-6">🏠</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {profile?.neighborhood ? '새로운 동네를 선택해주세요' : '내 동네를 설정해주세요'}
                </h3>
                <p className="text-gray-600 text-base leading-relaxed px-4">
                  설정한 동네를 기준으로 근처 제보들을 우선적으로 보여드립니다
                </p>
              </div>

              <LocationSearch
                onLocationSelect={handleNeighborhoodSelect}
                placeholder="우리 동네 이름이나 주요 장소를 검색하세요"
              />

              {profile?.neighborhood && (
                <div className="mt-12">
                  <button
                    onClick={handleClose}
                    className="w-full text-gray-600 hover:text-gray-800 px-4 py-2 border border-gray-300 rounded-lg font-medium transition-colors"
                  >
                    취소
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 로딩 상태 */}
          {(updateNeighborhoodMutation.isPending || deleteNeighborhoodMutation.isPending) && (
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">
                {updateNeighborhoodMutation.isPending ? '동네 설정 중...' : '동네 삭제 중...'}
              </span>
            </div>
          )}

          
        </div>
      </div>
    </div>
  )
}
