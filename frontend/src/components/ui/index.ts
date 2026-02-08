// 중앙화된 UI 컴포넌트 시스템
// 모든 UI 컴포넌트를 이곳에서 export

// 기본 컴포넌트 (UI Prefix 적용)
export { Button as UiButton, buttonVariants } from './button'
export { UiSocialButton } from './UiSocialButton'
export { Input as UiInput } from './input'
export { Badge as UiBadge, badgeVariants } from './badge'
export { Alert as UiAlert } from './alert'
export { 
  Card as UiCard, 
  CardHeader as UiCardHeader, 
  CardFooter as UiCardFooter, 
  CardTitle as UiCardTitle, 
  CardDescription as UiCardDescription, 
  CardContent as UiCardContent 
} from './card'
export { 
  Dialog as UiDialog, 
  DialogPortal as UiDialogPortal, 
  DialogOverlay as UiDialogOverlay, 
  DialogTrigger as UiDialogTrigger, 
  DialogClose as UiDialogClose, 
  DialogContent as UiDialogContent, 
  DialogHeader as UiDialogHeader, 
  DialogFooter as UiDialogFooter, 
  DialogTitle as UiDialogTitle, 
  DialogDescription as UiDialogDescription 
} from './dialog'
export { 
  Tabs as UiTabs, 
  TabsList as UiTabsList, 
  TabsTrigger as UiTabsTrigger, 
  TabsContent as UiTabsContent 
} from './tabs'
export { Label as UiLabel } from './label'
export { 
  useFormField, 
  Form as UiForm, 
  FormItem as UiFormItem, 
  FormLabel as UiFormLabel, 
  FormControl as UiFormControl, 
  FormDescription as UiFormDescription, 
  FormMessage as UiFormMessage, 
  FormField as UiFormField 
} from './form'

// 모달 컴포넌트
export { BaseModal } from './BaseModal'
export { Modal } from './Modal' // 기존 Modal 유지
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
export type { InputProps } from './input'
export type { AlertProps } from './alert'
export type { BadgeProps } from './badge'
export type { UnifiedSearchProps } from './UnifiedSearch'
export type { RegionSearchButtonProps } from './RegionSearchButton'