import { useState, useRef, useEffect } from 'react'
import { useUIStore } from '@/stores/useUIStore'
import { useAuth } from '@/hooks/useAuth'
import { useMyProfile } from '@/hooks/useProfile'
import { useAdmin } from '@/hooks/useAdmin'
import { useRouter } from 'next/navigation'
import Avatar from './Avatar'
import MyNeighborhoodModal from './MyNeighborhoodModal'
import { Home, Settings, User, LogOut, ChevronDown, Pencil, Bell, Menu, X } from 'lucide-react'
import Image from 'next/image'
import { formatToAdministrativeAddress } from '@/lib/utils/addressUtils'
import { UiButton } from '@/components/ui'
import { cn } from '@/lib/utils'

export default function Header() {
  const { openAuthModal, openReportModal } = useUIStore()
  const { user, signOut } = useAuth()
  const { data: profile } = useMyProfile()
  const { isAdmin, adminInfo } = useAdmin()
  const router = useRouter()
  const [isNeighborhoodModalOpen, setIsNeighborhoodModalOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const profileDropdownRef = useRef<HTMLDivElement>(null)

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

  const getNeighborhoodDisplayName = () => {
    if (!profile?.neighborhood) return '내 동네 설정'
    const adminAddress = formatToAdministrativeAddress(profile.neighborhood.address)
    return (adminAddress && adminAddress !== '주소 없음') ? adminAddress : (profile.neighborhood.place_name || '내 동네')
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo Section */}
        <div 
          className="flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-80" 
          onClick={() => router.push('/')}
        >
          <Image 
            src="/images/title.png" 
            alt="동네속닥"
            width={120}
            height={32}
            className="h-8 w-auto object-contain"
            priority
          />
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              <UiButton
                variant="ghost"
                size="sm"
                onClick={() => setIsNeighborhoodModalOpen(true)}
                className={cn("gap-2 font-semibold", profile?.neighborhood && "text-primary bg-primary/5 hover:bg-primary/10")}
              >
                <Home className="h-4 w-4" />
                <span>{getNeighborhoodDisplayName()}</span>
              </UiButton>

              <UiButton variant="ghost" size="sm" onClick={() => router.push('/my-reports')}>
                내 제보
              </UiButton>

              {isAdmin() && (
                <UiButton variant="ghost" size="sm" onClick={() => router.push('/admin')} className="text-violet-600 hover:text-violet-700 hover:bg-violet-50">
                  <Settings className="mr-2 h-4 w-4" />
                  관리자
                </UiButton>
              )}

              <UiButton onClick={openReportModal} size="sm" className="ml-2 gap-2 shadow-sm shadow-primary/20">
                <Pencil className="h-4 w-4" />
                제보하기
              </UiButton>

              <div className="relative ml-2" ref={profileDropdownRef}>
                <UiButton
                  variant="outline"
                  size="sm"
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="gap-2 rounded-full px-3"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", isProfileDropdownOpen && "rotate-180")} />
                </UiButton>
                
                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 animate-in fade-in zoom-in-95 rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-black/5">
                    <div className="px-3 py-3 border-b border-muted">
                      <div className="flex items-center gap-3">
                        <Avatar src={profile?.avatar_url} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{profile?.nickname || '사용자'}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => { router.push('/profile'); setIsProfileDropdownOpen(false) }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors"
                      >
                        <User className="h-4 w-4" /> 프로필 설정
                      </button>
                      <button 
                        onClick={() => { signOut(); setIsProfileDropdownOpen(false) }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/5 rounded-md transition-colors"
                      >
                        <LogOut className="h-4 w-4" /> 로그아웃
                      </button>
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
              <UiButton size="sm" onClick={() => openAuthModal('signup')} className="shadow-sm shadow-primary/20">
                시작하기
              </UiButton>
            </>
          )}
        </div>

        {/* Mobile Navigation Controls */}
        <div className="flex md:hidden items-center gap-2">
          {user && (
            <UiButton size="icon" variant="ghost" onClick={openReportModal} className="text-primary">
              <Pencil className="h-5 w-5" />
            </UiButton>
          )}
          <UiButton size="icon" variant="ghost" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </UiButton>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t bg-background p-4 animate-in slide-in-from-top-2 duration-200">
          <div className="grid gap-2">
            {user ? (
              <>
                <UiButton variant="outline" className="justify-start gap-3 h-12" onClick={() => { setIsNeighborhoodModalOpen(true); setIsMobileMenuOpen(false) }}>
                  <Home className="h-5 w-5 text-primary" />
                  <span>{getNeighborhoodDisplayName()}</span>
                </UiButton>
                <UiButton variant="ghost" className="justify-start h-12" onClick={() => { router.push('/my-reports'); setIsMobileMenuOpen(false) }}>
                  📋 내 제보 내역
                </UiButton>
                <UiButton variant="ghost" className="justify-start h-12 text-destructive" onClick={() => { signOut(); setIsMobileMenuOpen(false) }}>
                  <LogOut className="h-5 w-5 mr-3" /> 로그아웃
                </UiButton>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <UiButton variant="outline" onClick={() => { openAuthModal('signin'); setIsMobileMenuOpen(false) }}>로그인</UiButton>
                <UiButton onClick={() => { openAuthModal('signup'); setIsMobileMenuOpen(false) }}>회원가입</UiButton>
              </div>
            )}
          </div>
        </div>
      )}

      <MyNeighborhoodModal isOpen={isNeighborhoodModalOpen} onClose={() => setIsNeighborhoodModalOpen(false)} />
    </header>
  )
}