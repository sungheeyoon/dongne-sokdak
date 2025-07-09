'use client'

import { useState } from 'react'
import { useUIStore } from '@/stores/useUIStore'
import { useAuth } from '@/hooks/useAuth'
import { useMyProfile } from '@/hooks/useProfile'
import { useAdmin } from '@/hooks/useAdmin'
import { useRouter } from 'next/navigation'
import Avatar from './Avatar'
import MyNeighborhoodModal from './MyNeighborhoodModal'
import { Home, Settings } from 'lucide-react'
import { extractNeighborhoodFromAddress } from '@/lib/utils/neighborhoodUtils'

export default function Header() {
  const { openAuthModal, openReportModal } = useUIStore()
  const { user, signOut } = useAuth()
  const { data: profile } = useMyProfile()
  const { isAdmin, adminInfo } = useAdmin()
  const router = useRouter()
  const [isNeighborhoodModalOpen, setIsNeighborhoodModalOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // 내 동네 표시명 계산 (행정동 우선)
  const getNeighborhoodDisplayName = () => {
    if (!profile?.neighborhood) return '내 동네'
    
    const neighborhoodInfo = extractNeighborhoodFromAddress(profile.neighborhood.address)
    
    // 행정동이 명확한 경우 우선 표시 (부개3동, 양평1동 등)
    if (neighborhoodInfo.neighborhood && /\d+동$/.test(neighborhoodInfo.neighborhood)) {
      return neighborhoodInfo.neighborhood
    }
    
    // 일반 동명 표시 (역삼동, 신사동 등)
    if (neighborhoodInfo.neighborhood && neighborhoodInfo.neighborhood.endsWith('동')) {
      return neighborhoodInfo.neighborhood
    }
    
    // 가명 표시 (태평로1가 등)
    if (neighborhoodInfo.neighborhood && /\d*가$/.test(neighborhoodInfo.neighborhood)) {
      return neighborhoodInfo.neighborhood
    }
    
    // 역명이나 건물명인 경우 행정구역명 사용
    if (profile.neighborhood.place_name.includes('역') || 
        profile.neighborhood.place_name.includes('호선') ||
        profile.neighborhood.place_name.includes('타워') ||
        profile.neighborhood.place_name.includes('빌딩') ||
        profile.neighborhood.place_name.length > 8) {
      return neighborhoodInfo.full
    }
    
    // 기본적으로 행정동 표시 우선
    return neighborhoodInfo.neighborhood || profile.neighborhood.place_name
  }

  return (
    <header className="bg-white shadow-lg border-b border-gray-300 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 로고 섹션 */}
          <div className="flex items-center cursor-pointer" onClick={() => router.push('/')}>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              동네속닥
            </h1>
            <p className="ml-2 md:ml-4 text-xs md:text-sm text-gray-700 hidden sm:block font-medium">
              우리 동네 이슈 제보 커뮤니티
            </p>
          </div>
          
          {/* 데스크톱 네비게이션 */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <button
                  onClick={() => setIsNeighborhoodModalOpen(true)}
                  className={`text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center space-x-1 ${
                    profile?.neighborhood ? 'bg-blue-50 text-blue-700' : ''
                  }`}
                  title={profile?.neighborhood ? `내 동네: ${profile.neighborhood.place_name}` : '내 동네 설정하기'}
                >
                  <Home className="h-4 w-4" />
                  <span>{getNeighborhoodDisplayName()}</span>
                </button>
                <button
                  onClick={() => router.push('/my-reports')}
                  className="text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  📋 내 제보
                </button>
                {adminInfo && isAdmin() && (
                  <>
                    <button
                      onClick={() => router.push('/admin')}
                      className="text-purple-700 hover:text-purple-900 px-4 py-2 rounded-lg font-semibold hover:bg-purple-50 transition-colors flex items-center space-x-1"
                      title="관리자 대시보드"
                    >
                      <Settings className="h-4 w-4" />
                      <span>관리자</span>
                    </button>
                    <button
                      onClick={() => router.push('/admin/reports')}
                      className="text-orange-700 hover:text-orange-900 px-4 py-2 rounded-lg font-semibold hover:bg-orange-50 transition-colors flex items-center space-x-1"
                      title="제보 관리"
                    >
                      <span>📋</span>
                      <span>제보 관리</span>
                    </button>
                  </>
                )}
                <button
                  onClick={openReportModal}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
                >
                  ✏️ 제보하기
                </button>
                <div className="flex items-center space-x-3 bg-white border border-gray-300 rounded-lg px-4 py-2 shadow-sm">
                  <button
                    onClick={() => router.push('/profile')}
                    className="flex items-center space-x-2 hover:bg-gray-50 p-1 rounded-md transition-colors"
                  >
                    <Avatar 
                      src={profile?.avatar_url} 
                      size="sm" 
                      alt={profile?.nickname || user.email} 
                    />
                    <span className="text-sm text-gray-800 font-medium">
                      {profile?.nickname || user.email}
                    </span>
                  </button>
                  <button 
                    onClick={signOut}
                    className="text-sm text-gray-600 hover:text-gray-800 font-medium px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    로그아웃
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => openAuthModal('signin')}
                  className="text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  로그인
                </button>
                <button
                  onClick={() => openAuthModal('signup')}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
                >
                  회원가입
                </button>
              </>
            )}
          </div>

          {/* 모바일 메뉴 버튼 */}
          <div className="md:hidden flex items-center space-x-2">
            {user && (
              <button
                onClick={openReportModal}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-2 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
              >
                ✏️
              </button>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-700 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors active:scale-95"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* 모바일 메뉴 */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-300 py-4">
            <div className="flex flex-col space-y-3">
              {user ? (
                <>
                  <button
                    onClick={() => {
                      setIsNeighborhoodModalOpen(true)
                      setIsMobileMenuOpen(false)
                    }}
                    className={`text-left px-4 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                      profile?.neighborhood ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Home className="h-5 w-5" />
                    <span>{getNeighborhoodDisplayName()}</span>
                  </button>
                  <button
                    onClick={() => {
                      router.push('/my-reports')
                      setIsMobileMenuOpen(false)
                    }}
                    className="text-left px-4 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    📋 내 제보
                  </button>
                  {adminInfo && isAdmin() && (
                    <>
                      <button
                        onClick={() => {
                          router.push('/admin')
                          setIsMobileMenuOpen(false)
                        }}
                        className="text-left px-4 py-3 rounded-lg font-medium text-purple-700 hover:bg-purple-50 transition-colors flex items-center space-x-2"
                      >
                        <Settings className="h-5 w-5" />
                        <span>관리자 대시보드</span>
                      </button>
                      <button
                        onClick={() => {
                          router.push('/admin/reports')
                          setIsMobileMenuOpen(false)
                        }}
                        className="text-left px-4 py-3 rounded-lg font-medium text-orange-700 hover:bg-orange-50 transition-colors flex items-center space-x-2"
                      >
                        <span className="text-lg">📋</span>
                        <span>제보 관리</span>
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      router.push('/profile')
                      setIsMobileMenuOpen(false)
                    }}
                    className="text-left px-4 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center space-x-2"
                  >
                    <Avatar 
                      src={profile?.avatar_url} 
                      size="sm" 
                      alt={profile?.nickname || user.email} 
                    />
                    <span>{profile?.nickname || user.email}</span>
                  </button>
                  <button 
                    onClick={() => {
                      signOut()
                      setIsMobileMenuOpen(false)
                    }}
                    className="text-left px-4 py-3 rounded-lg font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      openAuthModal('signin')
                      setIsMobileMenuOpen(false)
                    }}
                    className="text-left px-4 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    로그인
                  </button>
                  <button
                    onClick={() => {
                      openAuthModal('signup')
                      setIsMobileMenuOpen(false)
                    }}
                    className="text-left px-4 py-3 rounded-lg font-medium bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
                  >
                    회원가입
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* 내 동네 설정 모달 */}
      <MyNeighborhoodModal
        isOpen={isNeighborhoodModalOpen}
        onClose={() => setIsNeighborhoodModalOpen(false)}
      />
    </header>
  )
}
