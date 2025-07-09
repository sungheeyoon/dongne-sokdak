'use client'

import { useState } from 'react'
import { useMyProfile, useUpdateNeighborhood, useDeleteNeighborhood } from '@/hooks/useProfile'
import LocationSearch from '@/components/map/LocationSearch'
import { MapPin, X, Home, Trash2 } from 'lucide-react'
import { NeighborhoodInfo } from '@/types'
import { extractNeighborhoodFromAddress } from '@/lib/utils/neighborhoodUtils'
import MarkerIcon from '@/components/ui/MarkerIcon'

interface MyNeighborhoodModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function MyNeighborhoodModal({ isOpen, onClose }: MyNeighborhoodModalProps) {
  const { data: profile } = useMyProfile()
  const updateNeighborhoodMutation = useUpdateNeighborhood()
  const deleteNeighborhoodMutation = useDeleteNeighborhood()
  const [isSelecting, setIsSelecting] = useState(false)

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
        setIsSelecting(false)
        onClose()
      }
    })
  }

  // 내 동네 삭제
  const handleDeleteNeighborhood = () => {
    if (confirm('내 동네 설정을 삭제하시겠습니까?')) {
      deleteNeighborhoodMutation.mutate(undefined, {
        onSuccess: () => {
          onClose()
        }
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Home className="h-6 w-6 text-blue-600 mr-2" />
            내 동네 설정
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="p-6 space-y-6">
          {/* 현재 설정된 동네 */}
          {profile?.neighborhood && !isSelecting ? (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <MapPin className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="font-medium text-blue-900">현재 내 동네</span>
                  </div>
                  
                  {/* 설정된 동네명과 실제 행정구역 분석 */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-blue-900">
                      {profile.neighborhood.place_name}
                    </h3>
                    
                    {/* 행정구역 정보 추출해서 표시 */}
                    {(() => {
                      const neighborhoodInfo = extractNeighborhoodFromAddress(profile.neighborhood.address)
                      return (
                        <div className="text-sm space-y-1">
                          <p className="text-blue-700 flex items-center">
                            <MarkerIcon className="w-3 h-4 mr-1" />
                            {profile.neighborhood.address}
                          </p>
                          {neighborhoodInfo.full !== profile.neighborhood.place_name && (
                            <p className="text-blue-600 bg-blue-100 px-2 py-1 rounded text-xs">
                              🏘️ 행정구역: {neighborhoodInfo.full}
                            </p>
                          )}
                        </div>
                      )
                    })()}
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
              <div className="text-center">
                <div className="text-4xl mb-4">🏠</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {profile?.neighborhood ? '새로운 동네를 선택해주세요' : '내 동네를 설정해주세요'}
                </h3>
                <p className="text-gray-600 text-sm">
                  설정한 동네를 기준으로 근처 제보들을 우선적으로 보여드립니다
                </p>
              </div>

              <LocationSearch
                onLocationSelect={handleNeighborhoodSelect}
                placeholder="우리 동네 이름이나 주요 장소를 검색하세요"
              />

              {profile?.neighborhood && (
                <button
                  onClick={() => setIsSelecting(false)}
                  className="w-full text-gray-600 hover:text-gray-800 px-4 py-2 border border-gray-300 rounded-lg font-medium transition-colors"
                >
                  취소
                </button>
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
