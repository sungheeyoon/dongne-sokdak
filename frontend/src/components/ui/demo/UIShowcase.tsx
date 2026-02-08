'use client'

import React, { useState } from 'react'
import {
  UiButton as Button, UiInput as Input, UiAlert as Alert, UiBadge as Badge, UiForm as Form, 
  BaseModal, ReportDetailModal,
  UnifiedSearch, RegionSearchButton, CurrentRegionButton, RefreshSearchButton,
  demoReports, demoGroupedReports, demoUsers
} from '../index'
import { OriginalAuthModal } from './OriginalAuthModal'
import { ReportCard as UIReportCard } from '../ReportCard'
import { Mail, Lock, User, Search, Home, Settings, Bell, MapPin } from 'lucide-react'
import { useRouter } from 'next/navigation'

export const UIShowcase: React.FC = () => {
  const router = useRouter()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showBaseModal, setShowBaseModal] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [inputValue, setInputValue] = useState('')
  const [inputError, setInputError] = useState('')

  const validateInput = (value: string) => {
    if (value.length < 3) {
      setInputError('3자 이상 입력해주세요')
    } else if (value.includes(' ')) {
      setInputError('공백은 포함할 수 없습니다')
    } else {
      setInputError('')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 text-gray-900">
      <div className="max-w-7xl mx-auto px-4">
        {/* 헤더 */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 bg-blue-100 rounded-full mr-4">
              <Home className="w-12 h-12 text-blue-600" />
            </div>
            <h1 className="text-5xl font-bold text-gray-900">
              🎨 동네속닥 UI 시스템
            </h1>
          </div>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            중앙화된 UI 컴포넌트 라이브러리입니다. 모든 컴포넌트는 <code className="bg-gray-200 px-2 py-1 rounded">/components/ui</code>에서 
            중앙 관리되며, 일관된 디자인 시스템을 따릅니다.
          </p>
          <div className="flex justify-center space-x-4">
            <Button 
              variant="default" 
              onClick={() => router.push('/')}
              className="flex items-center"
            >
              <Home className="w-4 h-4 mr-2" />
              메인 페이지로
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.open('https://github.com/sungheeyoon/dongne-sokdak', '_blank')}
            >
              GitHub 보기
            </Button>
          </div>
        </div>

        {/* 🎯 버튼 섹션 */}
        <section className="mb-16">
          <div className="flex items-center mb-8">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-bold">B</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">버튼 컴포넌트</h2>
            <Badge variant="default" className="ml-4">Button</Badge>
          </div>
          
          <div className="bg-white rounded-xl p-8 shadow-sm border">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  기본 버튼들
                </h3>
                <div className="space-y-3">
                  <Button variant="default" className="w-full">Default</Button>
                  <Button variant="secondary" className="w-full">Secondary</Button>
                  <Button variant="outline" className="w-full">Outline</Button>
                  <Button variant="ghost" className="w-full">Ghost</Button>
                  <Button variant="destructive" className="w-full">Destructive</Button>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  크기별 버튼
                </h3>
                <div className="space-y-3">
                  <Button size="sm" className="w-full">Small (sm)</Button>
                  <Button size="default" className="w-full">Default</Button>
                  <Button size="lg" className="w-full">Large (lg)</Button>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                  상태별 버튼
                </h3>
                <div className="space-y-3">
                  <Button disabled className="w-full">Disabled</Button>
                  <Button variant="default" className="w-full flex items-center justify-center">
                    <Mail className="w-4 h-4 mr-2" />
                    With Icon
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 📝 입력 섹션 */}
        <section className="mb-16">
          <div className="flex items-center mb-8">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-bold">I</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">입력 컴포넌트</h2>
            <Badge variant="default" className="ml-4">Input</Badge>
          </div>
          
          <div className="bg-white rounded-xl p-8 shadow-sm border">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-1">기본 입력</label>
                  <Input
                    placeholder="텍스트를 입력하세요"
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value)
                      validateInput(e.target.value)
                    }}
                  />
                  {inputError && <p className="text-xs text-red-500 mt-1">{inputError}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">이메일</label>
                  <Input
                    type="email"
                    placeholder="example@dongne-sokdak.com"
                  />
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-1">비활성화된 입력</label>
                  <Input
                    placeholder="수정할 수 없습니다"
                    disabled
                    value="읽기 전용"
                    readOnly
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 🏷️ 배지 & 알림 섹션 */}
        <section className="mb-16">
          <div className="flex items-center mb-8">
            <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-bold">B</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">배지 & 알림</h2>
            <Badge variant="secondary" className="ml-4">Badge / Alert</Badge>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 배지 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="text-xl font-semibold mb-6">배지 컴포넌트</h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3">기본 스타일</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="default">Default</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="destructive">Destructive</Badge>
                    <Badge variant="outline">Outline</Badge>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">제보 카테고리용 예시</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="destructive">소음</Badge>
                    <Badge variant="default">쓰레기</Badge>
                    <Badge variant="outline">시설물</Badge>
                    <Badge variant="secondary">교통</Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* 알림 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="text-xl font-semibold mb-6">알림 컴포넌트</h3>
              
              <div className="space-y-4">
                <Alert
                  type="info"
                  title="정보"
                  message="새로운 제보가 등록되었습니다."
                />
                
                <Alert
                  type="success"
                  title="성공"
                  message="제보가 성공적으로 처리되었습니다."
                />
                
                <Alert
                  type="warning"
                  title="주의"
                  message="이 제보는 검토가 필요합니다."
                />
                
                <Alert
                  type="error"
                  title="오류"
                  message="네트워크 연결을 확인해주세요."
                  dismissible
                  onDismiss={() => console.log('Alert dismissed')}
                />
              </div>
            </div>
          </div>
        </section>

        {/* 🎭 모달 섹션 */}
        <section className="mb-16">
          <div className="flex items-center mb-8">
            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-bold">M</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">모달 시스템</h2>
            <Badge variant="outline" className="ml-4">Modal</Badge>
          </div>
          
          <div className="bg-white rounded-xl p-8 shadow-sm border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg mb-4">
                  <Settings className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <h4 className="font-medium mb-2">인증 모달</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    로그인/회원가입 통합 모달
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowAuthModal(true)}
                  >
                    미리보기
                  </Button>
                </div>
              </div>
              
              <div className="text-center">
                <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg mb-4">
                  <Bell className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <h4 className="font-medium mb-2">제보 상세 모달</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    마커 클릭시 제보 목록 표시
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowReportModal(true)}
                  >
                    미리보기
                  </Button>
                </div>
              </div>
              
              <div className="text-center">
                <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg mb-4">
                  <Home className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <h4 className="font-medium mb-2">기본 모달</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    범용 베이스 모달
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowBaseModal(true)}
                  >
                    미리보기
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 🔍 검색 시스템 */}
        <section className="mb-16">
          <div className="flex items-center mb-8">
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-bold">S</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">검색 시스템</h2>
            <Badge variant="default" className="ml-4">Search</Badge>
          </div>
          
          <div className="space-y-8">
            {/* 통합 검색 */}
            <div className="bg-white rounded-xl p-8 shadow-sm border">
              <h3 className="text-xl font-semibold mb-6">통합 검색 (UnifiedSearch)</h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3">위치 검색 모드</h4>
                  <UnifiedSearch
                    searchMode="location"
                    onLocationSelect={(location) => {
                      console.log('위치 선택:', location)
                      alert(`선택된 위치: ${location.placeName}`)
                    }}
                    onTextSearch={() => {}}
                  />
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">제보 검색 모드</h4>
                  <UnifiedSearch
                    searchMode="text"
                    onLocationSelect={() => {}}
                    onTextSearch={(query) => {
                      console.log('텍스트 검색:', query)
                      alert(`검색어: ${query}`)
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 지역 검색 버튼들 */}
            <div className="bg-white rounded-xl p-8 shadow-sm border">
              <h3 className="text-xl font-semibold mb-6">지역 검색 버튼들</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-medium mb-3">현재 지역 검색</h4>
                  <div className="space-y-3">
                    <CurrentRegionButton
                      onClick={() => alert('현재 지역 검색!')}
                    />
                    <CurrentRegionButton
                      onClick={() => {}}
                      loading={true}
                    />
                    <CurrentRegionButton
                      onClick={() => {}}
                      disabled={true}
                    />
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">재검색 버튼</h4>
                  <div className="space-y-3">
                    <RefreshSearchButton
                      onClick={() => alert('재검색!')}
                    />
                    <RefreshSearchButton
                      onClick={() => {}}
                      loading={true}
                      size="sm"
                    />
                    <RefreshSearchButton
                      onClick={() => {}}
                      size="lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 📰 제보 카드 */}
        <section className="mb-16">
          <div className="flex items-center mb-8">
            <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-bold">R</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">제보 카드</h2>
            <Badge variant="secondary" className="ml-4">ReportCard</Badge>
          </div>
          
          <div className="bg-white rounded-xl p-8 shadow-sm border">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* 컴팩트 카드들 */}
              {demoReports.slice(0, 3).map((report) => (
                <div key={report.id} className="space-y-2">
                  <h4 className="font-medium text-sm text-center">
                    {report.category} - {report.status}
                  </h4>
                  <UIReportCard
                    {...report}
                    size="compact"
                    onClick={() => alert(`제보 ${report.id} 클릭!`)}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 🚀 사용법 및 정보 */}
        <section className="mb-16">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-8 text-white">
            <h2 className="text-3xl font-bold mb-6">🚀 중앙화된 UI 시스템</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4">✨ 주요 특징</h3>
                <ul className="space-y-2 text-sm opacity-90">
                  <li>• <code className="bg-white/20 px-2 py-1 rounded">@/components/ui</code>에서 중앙 관리</li>
                  <li>• TypeScript 완전 지원</li>
                  <li>• Tailwind CSS 기반 스타일링</li>
                  <li>• forwardRef 및 접근성 지원</li>
                  <li>• 일관된 디자인 토큰 사용</li>
                  <li>• 재사용 가능한 컴포넌트 아키텍처</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-4">📦 사용 방법</h3>
                <div className="bg-black/20 rounded-lg p-4 text-sm font-mono">
                  <div className="text-green-300">{/* 한 번에 모든 컴포넌트 import */}</div>
                  <div className="text-yellow-300">import {`{`}</div>
                  <div className="text-white ml-2">UiButton, UiInput, UiAlert,</div>
                  <div className="text-white ml-2">BaseModal, UiBadge, UiForm</div>
                  <div className="text-yellow-300">{`}`} from &apos;@/components/ui&apos;</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* 모달들 */}
      <OriginalAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
        onModeChange={setAuthMode}
      />

      <ReportDetailModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        reports={demoReports.slice(0, 3)}
        locationName="명동 일대"
        onReportClick={(id) => {
          console.log('Report clicked:', id)
          setShowReportModal(false)
          router.push(`/reports/${id}`)
        }}
      />

      <BaseModal
        isOpen={showBaseModal}
        onClose={() => setShowBaseModal(false)}
        title="기본 모달 예시"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            이것은 기본 BaseModal 컴포넌트입니다. 
            다양한 용도로 확장해서 사용할 수 있습니다.
          </p>
          
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">주요 기능</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• ESC 키로 닫기</li>
              <li>• 오버레이 클릭으로 닫기</li>
              <li>• 바디 스크롤 방지</li>
              <li>• 다양한 크기 지원</li>
            </ul>
          </div>

          <div className="flex justify-end pt-4 gap-2">
            <Button variant="outline" onClick={() => setShowBaseModal(false)}>
              닫기
            </Button>
            <Button variant="default" onClick={() => setShowBaseModal(false)}>
              확인
            </Button>
          </div>
        </div>
      </BaseModal>
    </div>
  )
}

export default UIShowcase