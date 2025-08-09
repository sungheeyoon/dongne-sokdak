// 중앙화된 UI 컴포넌트 시스템
// 모든 UI 컴포넌트를 이곳에서 export

// 기본 컴포넌트
export { Button } from './Button'
export { Input } from './Input'
export { Badge } from './Badge'
export { Alert } from './Alert'
export { Card } from './Card'

// 폼 컴포넌트
export { Form, FormSection, FormActions } from './Form'

// 모달 컴포넌트
export { BaseModal } from './BaseModal'
export { Modal } from './Modal' // 기존 Modal 유지
export { default as AuthModal } from './AuthModal'
export { default as ReportDetailModal } from './ReportDetailModal'

// 검색 컴포넌트
export { UnifiedSearch } from './UnifiedSearch'
export { RegionSearchButton, CurrentRegionButton, RefreshSearchButton, MapBoundsSearchButton } from './RegionSearchButton'

// 레이아웃 컴포넌트
export { AppHeader } from './AppHeader'
export { Navbar } from './Navbar'
export { HeroSection } from './HeroSection'

// 기타 UI 컴포넌트
export { default as LoadingSpinner, CardSkeleton } from './LoadingSpinner'
export { default as ErrorDisplay } from './ErrorDisplay'
export { default as MarkerIcon } from './MarkerIcon'
export { SearchButton } from './SearchButton'
export { SearchInput } from './SearchInput'
export { default as LocalhostGuide } from './LocalhostGuide'

// 데모 데이터
export * from './demo/DemoData'

// 타입 정의
export type { BaseModalProps } from './BaseModal'
export type { InputProps } from './Input'
export type { FormProps, FormSectionProps, FormActionsProps } from './Form'
export type { AlertProps } from './Alert'
export type { BadgeProps } from './Badge'
export type { UnifiedSearchProps } from './UnifiedSearch'
export type { RegionSearchButtonProps } from './RegionSearchButton'