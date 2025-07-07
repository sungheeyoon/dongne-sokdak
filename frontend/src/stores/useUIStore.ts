import { create } from 'zustand'

interface UIState {
  // 모달 상태
  isReportModalOpen: boolean
  isAuthModalOpen: boolean
  authMode: 'signin' | 'signup'
  
  // 지도 상태
  mapCenter: { lat: number; lng: number }
  mapZoom: number
  selectedLocation: { lat: number; lng: number; address?: string } | null
  
  // 필터 상태
  activeCategory: string | null
  activeStatus: string | null
  
  // 액션들
  openReportModal: () => void
  closeReportModal: () => void
  openAuthModal: (mode: 'signin' | 'signup') => void
  closeAuthModal: () => void
  setMapCenter: (center: { lat: number; lng: number }) => void
  setMapZoom: (zoom: number) => void
  setSelectedLocation: (location: { lat: number; lng: number; address?: string } | null) => void
  setActiveCategory: (category: string | null) => void
  setActiveStatus: (status: string | null) => void
}

export const useUIStore = create<UIState>((set) => ({
  // 초기 상태
  isReportModalOpen: false,
  isAuthModalOpen: false,
  authMode: 'signin',
  mapCenter: { lat: 37.5665, lng: 126.9780 }, // 서울 시청
  mapZoom: 13,
  selectedLocation: null,
  activeCategory: null,
  activeStatus: null,
  
  // 액션들
  openReportModal: () => set({ isReportModalOpen: true }),
  closeReportModal: () => set({ isReportModalOpen: false, selectedLocation: null }),
  openAuthModal: (mode) => set({ isAuthModalOpen: true, authMode: mode }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
  setMapCenter: (center) => set({ mapCenter: center }),
  setMapZoom: (zoom) => set({ mapZoom: zoom }),
  setSelectedLocation: (location) => set({ selectedLocation: location }),
  setActiveCategory: (category) => set({ activeCategory: category }),
  setActiveStatus: (status) => set({ activeStatus: status })
}))
