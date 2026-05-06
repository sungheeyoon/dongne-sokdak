'use client'

import { useState, useEffect } from 'react'
import { useUIStore } from '@/shared/stores/useUIStore'
import { ReportCategory } from '@/types'
import { useMutateReportViewModel } from '../hooks/useMutateReportViewModel'
import ImageUpload from './ImageUpload'
import LocationPicker from '@/components/map/LocationPicker'
import LocationSearch from '@/components/map/LocationSearch'
import { useLocationViewModel } from '@/features/map/presentation/hooks/useLocationViewModel'
import { MapPin, Loader2, ArrowLeft, Send, Check, Megaphone, Trash2, Construction, Car, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  UiDialog as Dialog,
  UiDialogContent as DialogContent,
  UiDialogHeader as DialogHeader,
  UiDialogTitle as DialogTitle,
  UiDialogFooter as DialogFooter,
  UiDialogDescription as DialogDescription,
  UiButton as Button,
  UiInput as Input,
  UiLabel as Label
} from '@/shared/ui'
import { cn } from '@/lib/utils'

interface LocationData {
  lat: number
  lng: number
  address: string
  placeName?: string
}

const categoryOptions = [
  { value: ReportCategory.NOISE, label: '소음', icon: Megaphone, desc: '층간소음, 공사장 소음 등' },
  { value: ReportCategory.TRASH, label: '쓰레기', icon: Trash2, desc: '무단투기, 수거 미이행' },
  { value: ReportCategory.FACILITY, label: '시설물', icon: Construction, desc: '파손된 벤치, 가로등 고장' },
  { value: ReportCategory.TRAFFIC, label: '교통', icon: Car, desc: '불법주차, 신호등 고장' },
  { value: ReportCategory.OTHER, label: '기타', icon: FileText, desc: '그 외 다양한 생활 불편' }
]

export default function ReportModal() {
  const { isReportModalOpen, closeReportModal, selectedLocation, setSelectedLocation, mapCenter } = useUIStore()
  const { reverseGeocode } = useLocationViewModel()
  const { createReport, isCreating } = useMutateReportViewModel()

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: ReportCategory.OTHER,
    address: '',
    imageUrl: '',
    lat: 37.5665,
    lng: 126.9780
  })

  const [step, setStep] = useState<'location' | 'details'>('location')
  const [isMapMode, setIsMapMode] = useState(false)
  const [location, setLocation] = useState<LocationData | null>(null)

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
    }
  }, [selectedLocation])

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

  const handleClose = () => {
    closeReportModal()
    resetForm()
  }

  const handleLocationSelect = (selectedLocation: { lat: number; lng: number; address: string; placeName?: string }) => {
    const locationData: LocationData = {
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      address: selectedLocation.address,
      placeName: selectedLocation.placeName
    }
    setLocation(locationData)
    setFormData(prev => ({
      ...prev,
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      address: selectedLocation.address
    }))
    toast.success('위치가 선택되었습니다')
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('위치 서비스가 지원되지 않습니다.')
      return
    }

    const loadingToast = toast.loading('현재 위치 확인 중...')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords

        try {
          const address = await reverseGeocode({ lat: latitude, lng: longitude })
          toast.dismiss(loadingToast)

          if (address) {
            const locationData = { lat: latitude, lng: longitude, address, placeName: '현재 위치' }
            setLocation(locationData)
            setFormData(prev => ({ ...prev, lat: latitude, lng: longitude, address }))
            toast.success('현재 위치를 가져왔습니다.')
          } else {
            toast.error('주소 정보를 찾을 수 없습니다.')
          }
        } catch (error) {
          toast.dismiss(loadingToast)
          toast.error('주소 정보를 가져오는 중 오류가 발생했습니다.')
        }
      },
      () => {
        toast.dismiss(loadingToast)
        toast.error('위치 정보를 가져올 수 없습니다.')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (process.env.NODE_ENV === 'development') console.log('🔘 제출 버튼 클릭됨', { title: formData.title, description: formData.description, location });

    if (!formData.title.trim()) {
      toast.error('제목을 입력해주세요.');
      return;
    }
    if (!formData.description.trim()) {
      toast.error('상세 내용을 입력해주세요.');
      return;
    }
    if (!location) {
      toast.error('위치 정보가 필요합니다.');
      return;
    }

    let finalAddress = location.address || formData.address
    if (location.placeName && location.placeName !== '현재 위치' && location.placeName !== '지도에서 선택') {
      finalAddress = `${location.placeName}, ${location.address}`
    }

    try {
      if (process.env.NODE_ENV === 'development') console.log('📝 제출 데이터:', {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        location: { lat: location.lat, lng: location.lng },
        address: finalAddress,
        imageUrl: formData.imageUrl
      })

      const result = await createReport({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        location: { lat: location.lat, lng: location.lng },
        address: finalAddress,
        imageUrl: formData.imageUrl || undefined
      })

      if (process.env.NODE_ENV === 'development') console.log('✅ 제보 생성 성공:', result)
      toast.success('제보가 성공적으로 등록되었습니다!')
      handleClose()
    } catch (error: any) {
      console.error('❌ 제보 생성 실패:', error)
      toast.error(`오류 발생: ${error.message || '알 수 없는 오류가 발생했습니다.'}`)
    }
  }

  return (
    <Dialog open={isReportModalOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:max-h-[85vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-xl">
            {step === 'location' ? '어디서 발생한 문제인가요?' : '상세 내용을 알려주세요'}
          </DialogTitle>
          <DialogDescription>
            {step === 'location'
              ? '정확한 위치를 선택하면 이웃들이 더 쉽게 알 수 있어요.'
              : '사진이나 상세한 설명을 추가하면 해결에 도움이 됩니다.'}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6">
          {step === 'location' ? (
            <div className="space-y-6">
              {/* 위치 선택 모드 탭 */}
              <div className="flex gap-2 p-1 bg-muted rounded-lg">
                <button
                  onClick={() => setIsMapMode(false)}
                  className={cn(
                    "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                    !isMapMode ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  주소 검색
                </button>
                <button
                  onClick={() => setIsMapMode(true)}
                  className={cn(
                    "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                    isMapMode ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  지도에서 선택
                </button>
              </div>

              <div className="min-h-[300px]">
                {!isMapMode ? (
                  <div className="space-y-4">
                    <LocationSearch onLocationSelect={handleLocationSelect} placeholder="건물명, 도로명, 지번으로 검색" />
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                      <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">또는</span></div>
                    </div>
                    <Button variant="outline" className="w-full h-12 gap-2" onClick={getCurrentLocation}>
                      <MapPin className="w-4 h-4 text-primary" /> 현재 위치로 설정
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg overflow-hidden border">
                    <LocationPicker
                      onLocationSelect={handleLocationSelect}
                      height="350px"
                      initialCenter={location ? { lat: location.lat, lng: location.lng } : (mapCenter || undefined)}
                    />
                  </div>
                )}
              </div>

              {location && (
                <div className="bg-primary/5 p-4 rounded-lg flex items-start gap-3 border border-primary/10">
                  <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-primary">{location.placeName || '선택된 위치'}</p>
                    <p className="text-sm text-muted-foreground">{location.address}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* 카테고리 (압축된 형태) */}
              <div className="space-y-2 mb-2">
                <Label className="text-sm font-semibold">카테고리</Label>
                <div className="flex flex-row overflow-x-auto pb-2 gap-2 snap-x scrollbar-hide">
                  {categoryOptions.map((opt) => {
                    const Icon = opt.icon
                    const isSelected = formData.category === opt.value

                    return (
                      <div
                        key={opt.value}
                        onClick={() => setFormData({ ...formData, category: opt.value })}
                        className={cn(
                          "cursor-pointer px-4 py-2 min-w-[70px] rounded-full border transition-all flex flex-row items-center justify-center gap-1.5 shrink-0 snap-start",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground shadow-sm font-medium"
                            : "border-border bg-muted/30 text-muted-foreground hover:bg-muted font-normal"
                        )}
                      >
                        <Icon className={cn("w-4 h-4", isSelected ? "text-primary-foreground" : "text-muted-foreground")} />
                        <span className="text-sm whitespace-nowrap">{opt.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>제목</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="예: 가로등이 깜빡거려요"
                    maxLength={50}
                  />
                </div>

                <div className="space-y-2">
                  <Label>상세 내용</Label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[120px] resize-none"
                    placeholder="구체적인 상황을 설명해주세요."
                    maxLength={500}
                  />
                  <div className="text-right text-xs text-muted-foreground">
                    {formData.description.length}/500
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>사진 첨부 (선택)</Label>
                  <ImageUpload onImageSelect={(url) => setFormData({ ...formData, imageUrl: url })} currentImage={formData.imageUrl} />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 pt-2 border-t bg-muted/10 flex-row gap-2 justify-between sm:justify-between">
          {step === 'location' ? (
            <>
              <Button variant="ghost" onClick={handleClose}>취소</Button>
              <Button onClick={() => setStep('details')} disabled={!location}>
                다음 단계 <Check className="w-4 h-4 ml-2" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep('location')}>
                <ArrowLeft className="w-4 h-4 mr-2" /> 위치 변경
              </Button>
              <Button onClick={handleSubmit} disabled={isCreating}>
                {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                제보 완료 <Send className="w-4 h-4 ml-2" />
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
