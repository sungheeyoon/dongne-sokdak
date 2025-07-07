'use client'

import { useState, useEffect } from 'react'
import { useUIStore } from '@/stores/useUIStore'
import { ReportCategory } from '@/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createReport, CreateReportData } from '@/lib/api/reports'
import ImageUpload from './ImageUpload'
import AddressSearchComponent from './AddressSearchComponent'
import MapComponent from './MapComponent'
import LocationPicker from './map/LocationPicker'
import LocationSearch from './map/LocationSearch'
import { X, Camera, MapPin, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface LocationData {
  lat: number
  lng: number
  address: string
  placeName?: string
}

const categoryOptions = [
  { value: ReportCategory.NOISE, label: '소음', emoji: '🔊', color: 'bg-red-100 text-red-700' },
  { value: ReportCategory.TRASH, label: '쓰레기', emoji: '🗑️', color: 'bg-green-100 text-green-700' },
  { value: ReportCategory.FACILITY, label: '시설물', emoji: '🏗️', color: 'bg-blue-100 text-blue-700' },
  { value: ReportCategory.TRAFFIC, label: '교통', emoji: '🚗', color: 'bg-yellow-100 text-yellow-700' },
  { value: ReportCategory.OTHER, label: '기타', emoji: '📝', color: 'bg-gray-100 text-gray-700' }
]

export default function ReportModal() {
  const { isReportModalOpen, closeReportModal, selectedLocation, setSelectedLocation } = useUIStore()
  const queryClient = useQueryClient()
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: ReportCategory.OTHER,
    address: '',
    imageUrl: '',
    lat: 37.5665,
    lng: 126.9780
  })

  // UI 상태
  const [step, setStep] = useState<'location' | 'details'>('location')
  const [isMapMode, setIsMapMode] = useState(false)
  const [location, setLocation] = useState<LocationData | null>(null)

  // 모달이 열릴 때 로그
  useEffect(() => {
    if (isReportModalOpen) {
      console.log('📝 ReportModal 열림')
      console.log('🗺️ selectedLocation:', selectedLocation)
    }
  }, [isReportModalOpen, selectedLocation])

  // 선택된 위치가 있으면 사용
  useEffect(() => {
    if (selectedLocation) {
      const locationData = {
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
        address: selectedLocation.address || '지도에서 선택한 위치',
        placeName: '지도에서 선택'
      }
      
      setLocation(locationData)
      setFormData(prev => ({
        ...prev,
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
        address: locationData.address
      }))
      
      console.log('✅ 지도에서 선택된 위치 적용:', locationData)
      console.log('🔄 다음 버튼 활성화 상태:', !!locationData)
    }
  }, [selectedLocation])

  const createReportMutation = useMutation({
    mutationFn: (data: CreateReportData) => createReport(data),
    onSuccess: () => {
      // 모든 제보 관련 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['my-reports'] })
      queryClient.invalidateQueries({ queryKey: ['mapBoundsReports'] })
      
      closeReportModal()
      resetForm()
      toast.success('제보가 성공적으로 등록되었습니다!')
    },
    onError: (error: any) => {
      toast.error(`제보 등록 중 오류가 발생했습니다: ${error.message}`)
    }
  })

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: ReportCategory.OTHER,
      address: '',
      imageUrl: '',
      lat: 37.5665,
      lng: 126.9780
    })
    setLocation(null)
    setStep('location')
    setIsMapMode(false)
    setSelectedLocation(null)
  }

  const handleImageSelect = (imageUrl: string) => {
    setFormData(prev => ({ ...prev, imageUrl }))
  }

  // 위치 선택 핸들러 (LocationPicker 및 LocationSearch용)
  const handleLocationSelect = (selectedLocation: { lat: number; lng: number; address: string; placeName?: string }) => {
    console.log('📍 handleLocationSelect 호출됨:', selectedLocation)
    
    const locationData: LocationData = {
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      address: selectedLocation.address,
      placeName: selectedLocation.placeName
    }
    
    // location state 업데이트
    setLocation(locationData)
    
    // formData도 함께 업데이트
    setFormData(prev => ({
      ...prev,
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      address: selectedLocation.address
    }))
    
    console.log('✅ 제보 위치 설정 완료:', locationData)
    console.log('🔄 location state:', locationData)
    console.log('🔄 다음 버튼 활성화 여부:', !!locationData)
    
    // 성공 피드백
    toast.success('위치가 선택되었습니다!')
  }

  // 주소 검색 결과 선택
  const handleAddressSelect = (selectedLocation: LocationData) => {
    setLocation(selectedLocation)
    setFormData(prev => ({
      ...prev,
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      address: selectedLocation.address
    }))
    setIsMapMode(false)
  }

  // 지도에서 위치 선택
  const handleMapLocationSelect = (selectedLocation: LocationData) => {
    setLocation(selectedLocation)
    setFormData(prev => ({
      ...prev,
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      address: selectedLocation.address
    }))
  }

  // 현재 위치 가져오기
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('위치 서비스가 지원되지 않습니다.')
      return
    }

    const loadingToast = toast.loading('현재 위치를 가져오는 중...')
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        
        // 역지오코딩으로 주소 가져오기
        const geocoder = new window.kakao.maps.services.Geocoder()
        
        geocoder.coord2Address(longitude, latitude, (result: any, status: any) => {
          toast.dismiss(loadingToast)
          
          if (status === window.kakao.maps.services.Status.OK) {
            const addr = result[0]
            const address = addr.road_address ? 
              addr.road_address.address_name : 
              addr.address.address_name

            const locationData = {
              lat: latitude,
              lng: longitude,
              address,
              placeName: '현재 위치'
            }
            
            setLocation(locationData)
            setFormData(prev => ({
              ...prev,
              lat: latitude,
              lng: longitude,
              address
            }))
            toast.success('현재 위치를 가져왔습니다.')
          } else {
            const locationData = {
              lat: latitude,
              lng: longitude,
              address: '주소를 가져올 수 없습니다.',
              placeName: '현재 위치'
            }
            
            setLocation(locationData)
            setFormData(prev => ({
              ...prev,
              lat: latitude,
              lng: longitude,
              address: '주소를 가져올 수 없습니다.'
            }))
            toast.success('위치를 가져왔습니다.')
          }
        })
      },
      (error) => {
        toast.dismiss(loadingToast)
        let errorMessage = '위치 정보를 가져올 수 없습니다.'
        
        // 구체적인 에러 메시지 제공
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = '위치 정보를 사용할 수 없습니다.'
            break
          case error.TIMEOUT:
            errorMessage = '위치 정보 요청 시간이 초과되었습니다.'
            break
          default:
            errorMessage = '알 수 없는 오류가 발생했습니다.'
        }
        
        toast.error(errorMessage)
        console.error('Geolocation error:', {
          code: error.code,
          message: error.message,
          errorType: ['PERMISSION_DENIED', 'POSITION_UNAVAILABLE', 'TIMEOUT'][error.code - 1] || 'UNKNOWN'
        })
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('제목과 내용을 모두 입력해주세요.')
      return
    }

    if (!location) {
      toast.error('위치를 선택해주세요.')
      return
    }

    console.log('🚀 제보 제출 시작')
    console.log('📍 선택된 location 객체:', location)
    console.log('📝 현재 formData:', formData)
    console.log('🎯 실제 사용할 좌표 (formData):', { lat: formData.lat, lng: formData.lng })
    console.log('🎯 location 객체의 좌표:', { lat: location.lat, lng: location.lng })

    // location 객체의 좌표를 사용하도록 수정 (더 안전함)
    // placeName이 있으면 더 구체적인 위치 정보로 사용
    const finalAddress = location.placeName && location.placeName !== '현재 위치' && location.placeName !== '지도에서 선택'
      ? location.placeName  // "부평역 지하철역" 같은 구체적인 정보 우선
      : location.address || formData.address || undefined

    const reportData: CreateReportData = {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      location: { lat: location.lat, lng: location.lng },
      address: finalAddress,
      imageUrl: formData.imageUrl || undefined
    }

    console.log('📤 서버로 전송할 데이터:', reportData)
    createReportMutation.mutate(reportData)
  }

  const handleClose = () => {
    closeReportModal()
    resetForm()
  }

  if (!isReportModalOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[95vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {step === 'location' ? '제보 위치 선택' : '제보 내용 작성'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 진행 표시바 */}
        <div className="px-6 py-3 bg-gray-50">
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              step === 'location' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
            }`}>
              1
            </div>
            <div className={`flex-1 h-1 mx-3 rounded ${
              step === 'details' ? 'bg-green-600' : 'bg-gray-300'
            }`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              step === 'details' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              2
            </div>
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>위치 선택</span>
            <span>내용 작성</span>
          </div>
        </div>

        {/* 컨텐츠 */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {step === 'location' ? (
            /* 1단계: 위치 선택 */
            <div className="space-y-6">
              {/* 위치 입력 방법 선택 */}
              <div className="flex space-x-4">
                <button
                  onClick={() => setIsMapMode(false)}
                  className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                    !isMapMode 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <MapPin className="h-5 w-5 mx-auto mb-1" />
                  <div className="text-sm font-medium">주소 검색</div>
                </button>
                <button
                  onClick={() => setIsMapMode(true)}
                  className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                    isMapMode 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-lg mb-1">🗺️</div>
                  <div className="text-sm font-medium">지도에서 선택</div>
                </button>
              </div>

              {!isMapMode ? (
                /* 주소 검색 모드 */
                <div className="space-y-4">
                  <LocationSearch
                    onLocationSelect={handleLocationSelect}
                    placeholder="제보할 위치의 주소나 장소명을 검색하세요"
                  />
                  
                  <div className="text-center">
                    <span className="text-gray-500 text-sm">또는</span>
                  </div>
                  
                  <button
                    onClick={getCurrentLocation}
                    className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all"
                  >
                    <MapPin className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                    <div className="text-sm font-medium text-blue-600">현재 위치 사용</div>
                  </button>
                </div>
              ) : (
                /* 지도 선택 모드 */
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 p-3 bg-blue-50 rounded-lg">
                    💡 지도를 드래그하거나 클릭하여 정확한 위치를 선택하세요
                  </div>
                  <LocationPicker
                    onLocationSelect={handleLocationSelect}
                    height="350px"
                    initialCenter={location ? { lat: location.lat, lng: location.lng } : undefined}
                  />
                </div>
              )}

              {/* 선택된 위치 표시 */}
              {location && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-green-900">
                        {location.placeName || '선택된 위치'}
                      </div>
                      <div className="text-sm text-green-700 mt-1">
                        {location.address}
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        위도: {location.lat.toFixed(6)}, 경도: {location.lng.toFixed(6)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* 2단계: 내용 작성 */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 카테고리 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  제보 유형
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {categoryOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: option.value })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        formData.category === option.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">{option.emoji}</div>
                      <div className="text-sm font-medium">{option.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 제목 입력 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  제목 *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  maxLength={100}
                  placeholder="제보 내용을 간단히 요약해주세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <div className="text-xs text-gray-500 mt-1">
                  {formData.title.length}/100자
                </div>
              </div>

              {/* 내용 입력 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  내용 *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  maxLength={1000}
                  rows={4}
                  placeholder="구체적인 상황을 설명해주세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  required
                />
                <div className="text-xs text-gray-500 mt-1">
                  {formData.description.length}/1000자
                </div>
              </div>

              {/* 사진 업로드 */}
              <ImageUpload 
                onImageSelect={handleImageSelect}
                currentImage={formData.imageUrl}
              />
            </form>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
          {step === 'location' ? (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => {
                  console.log('🔄 다음 버튼 클릭, location state:', location)
                  setStep('details')
                }}
                disabled={!location}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                다음 {location ? '✓' : '(위치 선택 필요)'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep('location')}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                이전
              </button>
              <button
                onClick={handleSubmit}
                disabled={createReportMutation.isPending || !formData.title.trim() || !formData.description.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {createReportMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>등록 중...</span>
                  </>
                ) : (
                  <span>제보 등록</span>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}