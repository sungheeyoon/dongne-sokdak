import { create } from 'zustand'

interface UIState {
  // 모달 상태
  isReportModalOpen: boolean
  isAuthModalOpen: boolean
  authMode: 'signin' | 'signup'

  // 지도 상태
  mapCenter: { lat: number; lng: number } | null
  mapZoom: number
  selectedLocation: { lat: number; lng: number; address?: string } | null

  // 필터 상태
  activeCategory: string | null
  activeStatus: string | null

  // 새로운 맵 검색/필터 상태
  searchQuery: string
  searchMode: 'location' | 'text'
  searchedLocation: { placeName: string; address: string } | null
  userCurrentLocation: { lat: number; lng: number } | null
  currentMapBounds: { north: number; south: number; east: number; west: number } | null
  triggerMapSearch: number
  useMapBoundsFilter: boolean
  selectedMapMarker: { id: string; location: { lat: number; lng: number }; count: number; reports: any[] } | null

  // 액션들
  openReportModal: () => void
  closeReportModal: () => void
  openAuthModal: (mode: 'signin' | 'signup') => void
  closeAuthModal: () => void
  setMapCenter: (center: { lat: number; lng: number } | null) => void
  setMapZoom: (zoom: number) => void
  setSelectedLocation: (location: { lat: number; lng: number; address?: string } | null) => void
  setActiveCategory: (category: string | null) => void
  setActiveStatus: (status: string | null) => void

  // 새로운 맵 상태 액션들
  setSearchQuery: (query: string) => void
  setSearchMode: (mode: 'location' | 'text') => void
  setSearchedLocation: (location: { placeName: string; address: string } | null) => void
  setUserCurrentLocation: (location: { lat: number; lng: number } | null) => void
  setCurrentMapBounds: (bounds: { north: number; south: number; east: number; west: number } | null | ((prev: any) => any)) => void
  setTriggerMapSearch: (trigger: number | ((prev: number) => number)) => void
  setUseMapBoundsFilter: (use: boolean) => void
  setSelectedMapMarker: (marker: { id: string; location: { lat: number; lng: number }; count: number; reports: any[] } | null) => void
}

export const useUIStore = create<UIState>((set) => ({
  // 초기 상태
  isReportModalOpen: false,
  isAuthModalOpen: false,
  authMode: 'signin',
  mapCenter: null, // 초기값을 null로 변경하여 사용자 동네가 우선시되게 함
  mapZoom: 13,
  selectedLocation: null,
  activeCategory: null,
  activeStatus: null,

  // 액션들
  openReportModal: () => set({ isReportModalOpen: true }),
  closeReportModal: () => set({ isReportModalOpen: false, selectedLocation: null }),
  openAuthModal: (mode) => set({ isAuthModalOpen: true, authMode: mode }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
  setMapCenter: (center) => set({ mapCenter: center ? { lat: center.lat, lng: center.lng } : null }),
  setMapZoom: (zoom) => set({ mapZoom: zoom }),
  setSelectedLocation: (location) => set({ selectedLocation: location }),
  setActiveCategory: (category) => set({ activeCategory: category }),
  setActiveStatus: (status) => set({ activeStatus: status }),

  searchQuery: '',
  searchMode: 'location',
  searchedLocation: null,
  userCurrentLocation: null,
  currentMapBounds: null,
  triggerMapSearch: 0,
  useMapBoundsFilter: true, // 기본값을 true로 변경하여 처음에 무조건 맵 영역 제보를 가져오도록 함
  selectedMapMarker: null,

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchMode: (mode) => set({ searchMode: mode }),
  setSearchedLocation: (location) => set({ searchedLocation: location }),
  setUserCurrentLocation: (location) => set({ userCurrentLocation: location }),
  setCurrentMapBounds: (bounds) => set((state) => ({
    currentMapBounds: typeof bounds === 'function' ? bounds(state.currentMapBounds) : bounds
  })),
  setTriggerMapSearch: (trigger) => set((state) => ({
    triggerMapSearch: typeof trigger === 'function' ? trigger(state.triggerMapSearch) : trigger
  })),
  setUseMapBoundsFilter: (use) => set({ useMapBoundsFilter: use }),
  setSelectedMapMarker: (marker) => set({ selectedMapMarker: marker })
}))
