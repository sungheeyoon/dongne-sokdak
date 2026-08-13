import { useState, useRef, useEffect } from 'react'
import { useUIStore } from '@/shared/stores/useUIStore'
import { useAuthViewModel } from '@/features/auth/presentation/hooks/useAuthViewModel'
import { useProfileViewModel } from '@/features/profile/presentation/hooks/useProfileViewModel'
import { useAdminViewModel } from '@/features/admin/presentation/hooks/useAdminViewModel'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Avatar from './Avatar'
import MyNeighborhoodModal from './MyNeighborhoodModal'
import { Home, Settings, User, LogOut, ChevronDown, Pencil, Menu, X, ClipboardList } from 'lucide-react'
import Image from 'next/image'
import { formatToAdministrativeAddress } from '@/lib/utils/addressUtils'
import { UiButton } from '@/shared/ui'
import { cn } from '@/lib/utils'

const MOBILE_MENU_ID = 'header-mobile-menu'

export default function Header() {
  const { openAuthModal, openReportModal } = useUIStore()
  const { user, signOut } = useAuthViewModel()
  const { profile } = useProfileViewModel()
  const { isAdmin } = useAdminViewModel()
  const router = useRouter()
  const [isNeighborhoodModalOpen, setIsNeighborhoodModalOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const profileDropdownRef = useRef<HTMLDivElement>(null)
  const profileTriggerRef = useRef<HTMLButtonElement>(null)

  // 프로필 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Escape로 프로필 메뉴를 닫고 포커스를 여닫은 버튼으로 되돌린다 (UI_V2_CONTRACT.md §3.5)
  useEffect(() => {
    if (!isProfileDropdownOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileDropdownOpen(false)
        profileTriggerRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isProfileDropdownOpen])

  const getNeighborhoodDisplayName = () => {
    if (!profile?.neighborhood) return '내 동네 설정'
    const adminAddress = formatToAdministrativeAddress(profile.neighborhood.address)
    return (adminAddress && adminAddress !== '주소 없음') ? adminAddress : (profile.neighborhood.placeName || '내 동네')
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="container mx-auto flex h-14 items-center justify-between px-4 lg:h-16">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md transition-opacity hover:opacity-80"
        >
          <Image
            src="/images/title.png"
            alt="동네속닥"
            width={120}
            height={32}
            className="h-auto w-auto object-contain"
            priority
          />
          <span className="sr-only">홈으로 이동</span>
        </Link>

        {/* 데스크톱 내비게이션 */}
        <nav aria-label="주요 메뉴" className="hidden lg:flex items-center gap-2">
          {user ? (
            <>
              <UiButton
                variant="ghost"
                size="sm"
                onClick={() => setIsNeighborhoodModalOpen(true)}
                className={cn("gap-2 font-semibold", profile?.neighborhood && "text-brand bg-brand-subtle hover:bg-brand-subtle")}
              >
                <Home className="h-4 w-4" />
                <span>{getNeighborhoodDisplayName()}</span>
              </UiButton>

              <UiButton variant="ghost" size="sm" onClick={() => router.push('/my-reports')}>
                내 제보
              </UiButton>

              {isAdmin() && (
                <UiButton variant="ghost" size="sm" onClick={() => router.push('/admin')} className="text-brand hover:bg-brand-subtle">
                  <Settings className="mr-2 h-4 w-4" />
                  관리자
                </UiButton>
              )}

              <UiButton onClick={openReportModal} size="sm" className="ml-2 gap-2">
                <Pencil className="h-4 w-4" />
                제보하기
              </UiButton>

              <div className="relative ml-2" ref={profileDropdownRef}>
                <UiButton
                  ref={profileTriggerRef}
                  variant="outline"
                  size="sm"
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="gap-2 rounded-full px-3"
                  aria-label={isProfileDropdownOpen ? '프로필 메뉴 닫기' : '프로필 메뉴 열기'}
                  aria-expanded={isProfileDropdownOpen}
                  aria-haspopup="menu"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", isProfileDropdownOpen && "rotate-180")} />
                </UiButton>

                {isProfileDropdownOpen && (
                  <div
                    role="menu"
                    aria-label="프로필 메뉴"
                    className="absolute right-0 mt-2 w-56 animate-in fade-in zoom-in-95 rounded-lg border border-border bg-surface p-1 text-foreground shadow-e2"
                  >
                    <div className="px-3 py-3 border-b border-border">
                      <div className="flex items-center gap-3">
                        <Avatar src={profile?.avatarUrl} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="type-label truncate">{profile?.nickname || '사용자'}</p>
                          <p className="type-caption text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>
                    </div>
                    <div className="py-1">
                      <UiButton
                        role="menuitem"
                        variant="ghost"
                        className="w-full justify-start gap-2"
                        onClick={() => { router.push('/profile'); setIsProfileDropdownOpen(false) }}
                      >
                        <User className="h-4 w-4" /> 프로필 설정
                      </UiButton>
                      <UiButton
                        role="menuitem"
                        variant="ghost"
                        className="w-full justify-start gap-2 text-danger"
                        onClick={() => { signOut(); setIsProfileDropdownOpen(false) }}
                      >
                        <LogOut className="h-4 w-4" /> 로그아웃
                      </UiButton>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <UiButton variant="ghost" size="sm" onClick={() => openAuthModal('signin')}>
                로그인
              </UiButton>
              <UiButton size="sm" onClick={() => openAuthModal('signup')}>
                회원가입
              </UiButton>
            </>
          )}
        </nav>

        {/* 모바일 컨트롤 — 히트 영역 44px (UI_V2_CONTRACT.md §3.7) */}
        <div className="flex items-center gap-2 lg:hidden">
          {user && (
            <UiButton
              size="icon"
              variant="ghost"
              onClick={openReportModal}
              className="text-brand"
              aria-label="제보하기"
            >
              <Pencil className="h-5 w-5" />
            </UiButton>
          )}
          <UiButton
            size="icon"
            variant="ghost"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={isMobileMenuOpen}
            aria-controls={MOBILE_MENU_ID}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </UiButton>
        </div>
      </div>

      {isMobileMenuOpen && (
        <nav
          id={MOBILE_MENU_ID}
          aria-label="모바일 메뉴"
          className="border-t border-border bg-surface p-4 animate-in slide-in-from-top-2 lg:hidden"
        >
          <div className="grid gap-2">
            {user ? (
              <>
                <UiButton variant="outline" className="justify-start gap-3 h-12 w-full" onClick={() => { setIsNeighborhoodModalOpen(true); setIsMobileMenuOpen(false) }}>
                  <Home className="h-5 w-5 text-brand" />
                  <span>{getNeighborhoodDisplayName()}</span>
                </UiButton>
                <UiButton variant="ghost" className="justify-start gap-3 h-12 w-full" onClick={() => { router.push('/my-reports'); setIsMobileMenuOpen(false) }}>
                  <ClipboardList className="h-5 w-5" />
                  <span>내 제보</span>
                </UiButton>
                {isAdmin() && (
                  <UiButton variant="ghost" className="justify-start gap-3 h-12 w-full text-brand" onClick={() => { router.push('/admin'); setIsMobileMenuOpen(false) }}>
                    <Settings className="h-5 w-5" />
                    <span>관리자</span>
                  </UiButton>
                )}
                <UiButton variant="ghost" className="justify-start gap-3 h-12 w-full text-danger" onClick={() => { signOut(); setIsMobileMenuOpen(false) }}>
                  <LogOut className="h-5 w-5" />
                  <span>로그아웃</span>
                </UiButton>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <UiButton variant="outline" className="h-12 w-full" onClick={() => { openAuthModal('signin'); setIsMobileMenuOpen(false) }}>
                  로그인
                </UiButton>
                <UiButton className="h-12 w-full" onClick={() => { openAuthModal('signup'); setIsMobileMenuOpen(false) }}>
                  회원가입
                </UiButton>
              </div>
            )}
          </div>
        </nav>
      )}

      <MyNeighborhoodModal isOpen={isNeighborhoodModalOpen} onClose={() => setIsNeighborhoodModalOpen(false)} />
    </header>
  )
}
