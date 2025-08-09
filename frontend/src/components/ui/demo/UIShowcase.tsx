'use client'

import React, { useState } from 'react'
import {
  Button, Input, Alert, Badge, Form, FormActions,
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
  // const [loading, setLoading] = useState(false) // 사용하지 않음
  const [inputValue, setInputValue] = useState('')
  const [inputError, setInputError] = useState('')

  // const handleAuthSubmit = async (email: string, password: string, nickname?: string) => {
  //   setLoading(true)
  //   // 데모용 딜레이
  //   await new Promise(resolve => setTimeout(resolve, 1000))
  //   setLoading(false)
  //   console.log('Auth submitted:', { email, password, nickname })
  // }

  // const handleSocialAuth = async () => {
  //   setLoading(true)
  //   await new Promise(resolve => setTimeout(resolve, 1000))
  //   setLoading(false)
  //   console.log('Social auth')
  // }

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
    <div className="min-h-screen bg-gray-50 py-8">
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
              variant="primary" 
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
            <Badge variant="primary" className="ml-4">Button</Badge>
          </div>
          
          <div className="bg-white rounded-xl p-8 shadow-sm border">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  기본 버튼들
                </h3>
                <div className="space-y-3">
                  <Button variant="primary" className="w-full">Primary</Button>
                  <Button variant="secondary" className="w-full">Secondary</Button>
                  <Button variant="outline" className="w-full">Outline</Button>
                  <Button variant="ghost" className="w-full">Ghost</Button>
                  <Button variant="danger" className="w-full">Danger</Button>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  크기별 버튼
                </h3>
                <div className="space-y-3">
                  <Button size="small" className="w-full">Small</Button>
                  <Button size="medium" className="w-full">Medium</Button>
                  <Button size="large" className="w-full">Large</Button>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                  상태별 버튼
                </h3>
                <div className="space-y-3">
                  <Button loading className="w-full">Loading</Button>
                  <Button disabled className="w-full">Disabled</Button>
                  <Button variant="primary" className="w-full flex items-center justify-center">
                    <Mail className="w-4 h-4 mr-2" />
                    With Icon
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">사용법</h4>
              <code className="text-sm text-gray-600">
                {`<Button variant="primary" size="medium" loading={false}>버튼</Button>`}
              </code>
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
            <Badge variant="success" className="ml-4">Input</Badge>
          </div>
          
          <div className="bg-white rounded-xl p-8 shadow-sm border">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <Input
                  label="기본 입력"
                  placeholder="텍스트를 입력하세요"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value)
                    validateInput(e.target.value)
                  }}
                  error={inputError}
                />
                
                <Input
                  label="이메일"
                  type="email"
                  placeholder="example@dongne-sokdak.com"
                  startIcon={<Mail className="h-4 w-4" />}
                />
                
                <Input
                  label="비밀번호"
                  type="password"
                  placeholder="비밀번호 입력"
                  startIcon={<Lock className="h-4 w-4" />}
                  hint="8자 이상 입력하세요"
                />
              </div>
              
              <div className="space-y-6">
                <Input
                  label="검색"
                  placeholder="동네 이슈를 검색하세요"
                  startIcon={<Search className="h-4 w-4" />}
                  variant="filled"
                />
                
                <Input
                  label="닉네임"
                  placeholder="동네지킴이"
                  startIcon={<User className="h-4 w-4" />}
                  variant="outlined"
                />
                
                <Input
                  label="비활성화된 입력"
                  placeholder="수정할 수 없습니다"
                  disabled
                  value="읽기 전용"
                />
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">사용법</h4>
              <code className="text-sm text-gray-600">
                {`<Input label="이메일" type="email" startIcon={<Mail />} error="에러메시지" />`}
              </code>
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
            <Badge variant="warning" className="ml-4">Badge / Alert</Badge>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 배지 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="text-xl font-semibold mb-6">배지 컴포넌트</h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3">기본 스타일</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="primary">Primary</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="success">Success</Badge>
                    <Badge variant="warning">Warning</Badge>
                    <Badge variant="danger">Danger</Badge>
                    <Badge variant="info">Info</Badge>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">크기별</h4>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge size="sm" variant="primary">Small</Badge>
                    <Badge size="md" variant="primary">Medium</Badge>
                    <Badge size="lg" variant="primary">Large</Badge>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">제보 카테고리용</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="danger">소음</Badge>
                    <Badge variant="success">쓰레기</Badge>
                    <Badge variant="info">시설물</Badge>
                    <Badge variant="warning">교통</Badge>
                    <Badge variant="secondary">기타</Badge>
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
            <Badge variant="info" className="ml-4">Modal</Badge>
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
                    size="small"
                    onClick={() => setShowAuthModal(true)}
                  >
                    미리보기
                  </Button>
                </div>
                <div className="text-xs text-gray-500">
                  탭 전환, 소셜 로그인 지원
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
                    size="small"
                    onClick={() => setShowReportModal(true)}
                  >
                    미리보기
                  </Button>
                </div>
                <div className="text-xs text-gray-500">
                  다중 제보 표시, 페이지 이동
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
                    size="small"
                    onClick={() => setShowBaseModal(true)}
                  >
                    미리보기
                  </Button>
                </div>
                <div className="text-xs text-gray-500">
                  다양한 크기, ESC/오버레이 닫기
                </div>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">특징</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• ESC 키와 오버레이 클릭으로 닫기</li>
                <li>• 바디 스크롤 방지 및 포커스 트랩</li>
                <li>• 다양한 크기 옵션 (xs, sm, md, lg, xl, full)</li>
                <li>• 애니메이션 및 접근성 지원</li>
              </ul>
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
            <Badge variant="success" className="ml-4">Search</Badge>
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
                    placeholder="동네, 건물명을 검색해보세요"
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
                    placeholder="제보 내용을 검색해보세요"
                  />
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">비활성화 상태</h4>
                  <UnifiedSearch
                    searchMode="location"
                    onLocationSelect={() => {}}
                    onTextSearch={() => {}}
                    disabled={true}
                    placeholder="검색이 비활성화됨"
                  />
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">특징</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 카카오맵 API 연동 위치 검색</li>
                  <li>• 실시간 자동완성 (디바운스 300ms)</li>
                  <li>• 모드별 다른 UI (위치/텍스트)</li>
                  <li>• 외부 클릭시 자동 닫기</li>
                </ul>
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
                      loadingText="검색 중..."
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
                
                <div>
                  <h4 className="font-medium mb-3">커스텀 버튼</h4>
                  <div className="space-y-3">
                    <RegionSearchButton
                      onClick={() => alert('맞춤 검색!')}
                      variant="secondary"
                    >
                      맞춤 검색
                    </RegionSearchButton>
                    <RegionSearchButton
                      onClick={() => {}}
                      variant="outline"
                      size="sm"
                    >
                      영역 검색
                    </RegionSearchButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 📋 폼 시스템 */}
        <section className="mb-16">
          <div className="flex items-center mb-8">
            <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-bold">F</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">폼 시스템</h2>
            <Badge variant="info" className="ml-4">Form</Badge>
          </div>
          
          <div className="bg-white rounded-xl p-8 shadow-sm border">
            <div className="max-w-2xl">
              <h3 className="text-xl font-semibold mb-6">제보 등록 폼 예시</h3>
              
              <Form spacing="lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="제목"
                    placeholder="제보 제목을 입력하세요"
                    required
                  />
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-900">
                      카테고리 <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="danger" className="cursor-pointer hover:shadow-md transition-shadow">소음</Badge>
                      <Badge variant="success" className="cursor-pointer hover:shadow-md transition-shadow">쓰레기</Badge>
                      <Badge variant="info" className="cursor-pointer hover:shadow-md transition-shadow">시설물</Badge>
                      <Badge variant="warning" className="cursor-pointer hover:shadow-md transition-shadow">교통</Badge>
                      <Badge variant="secondary" className="cursor-pointer hover:shadow-md transition-shadow">기타</Badge>
                    </div>
                  </div>
                </div>
                
                <Input
                  label="상세 설명"
                  placeholder="문제 상황을 자세히 설명해주세요"
                  required
                />
                
                <Input
                  label="위치"
                  placeholder="서울특별시 중구 명동1가"
                  startIcon={<Search className="h-4 w-4" />}
                  hint="지도에서 선택하거나 직접 입력하세요"
                  required
                />
                
                <FormActions align="between">
                  <Button variant="ghost">취소</Button>
                  <div className="space-x-3">
                    <Button variant="outline">임시저장</Button>
                    <Button variant="primary">제보하기</Button>
                  </div>
                </FormActions>
              </Form>
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
            <Badge variant="warning" className="ml-4">ReportCard</Badge>
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
            
            <div className="mt-8 space-y-4">
              <h4 className="font-medium text-lg">Medium 크기 카드</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {demoReports.slice(0, 2).map((report) => (
                  <UIReportCard
                    key={`medium-${report.id}`}
                    {...report}
                    size="medium"
                    onClick={() => alert(`제보 ${report.id} 클릭!`)}
                  />
                ))}
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">특징</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 카테고리별 색상 구분</li>
                <li>• 상태별 UI 표시 (OPEN, IN_PROGRESS, RESOLVED)</li>
                <li>• 반응형 디자인 (모바일 최적화)</li>
                <li>• 투표/댓글 수 표시</li>
                <li>• 이미지 미리보기 지원</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 📊 데모 데이터 섹션 */}
        <section className="mb-16">
          <div className="flex items-center mb-8">
            <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-bold">D</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">데모 데이터</h2>
            <Badge variant="danger" className="ml-4">Demo Data</Badge>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 제보 데이터 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="text-xl font-semibold mb-4">더미 제보 ({demoReports.length}개)</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {demoReports.map((report) => (
                  <div key={report.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <Badge 
                        variant={
                          report.category === 'NOISE' ? 'danger' :
                          report.category === 'TRASH' ? 'success' :
                          report.category === 'FACILITY' ? 'info' :
                          report.category === 'TRAFFIC' ? 'warning' : 'secondary'
                        } 
                        size="sm"
                      >
                        {report.category}
                      </Badge>
                      <span className={`text-xs px-2 py-1 rounded ${
                        report.status === 'OPEN' ? 'bg-yellow-100 text-yellow-800' :
                        report.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {report.status}
                      </span>
                    </div>
                    <h4 className="font-medium text-sm mb-1 line-clamp-1">{report.title}</h4>
                    <p className="text-xs text-gray-600 line-clamp-2 mb-2">{report.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>👍 {report.voteCount} 💬 {report.commentCount}</span>
                      <span>{new Date(report.createdAt).toLocaleDateString('ko-KR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 사용자 및 시스템 정보 */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <h3 className="text-xl font-semibold mb-4">더미 사용자 ({demoUsers.length}명)</h3>
                <div className="space-y-3">
                  {demoUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-sm">{user.nickname}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                      <Badge 
                        variant={user.role === 'admin' ? 'danger' : user.role === 'moderator' ? 'warning' : 'secondary'}
                        size="sm"
                      >
                        {user.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <h3 className="text-xl font-semibold mb-4">그룹화된 마커 ({demoGroupedReports.length}개)</h3>
                <div className="space-y-2">
                  {demoGroupedReports.map((group) => (
                    <div key={group.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="text-sm">
                        <div className="font-medium">{group.address}</div>
                        <div className="text-xs text-gray-500">
                          {group.location.lat.toFixed(4)}, {group.location.lng.toFixed(4)}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="primary" size="sm">{group.count}개</Badge>
                        <Badge 
                          variant={
                            group.primaryCategory === 'NOISE' ? 'danger' :
                            group.primaryCategory === 'TRASH' ? 'success' :
                            group.primaryCategory === 'FACILITY' ? 'info' :
                            group.primaryCategory === 'TRAFFIC' ? 'warning' : 'secondary'
                          }
                          size="sm"
                        >
                          {group.primaryCategory}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 🗺️ 마커 클릭 시뮬레이션 섹션 */}
        <section className="mb-16">
          <div className="flex items-center mb-8">
            <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-bold">M</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">마커 클릭 시뮬레이션</h2>
            <Badge variant="success" className="ml-4">Map Marker Click</Badge>
          </div>
          
          <div className="space-y-8">
            {/* 단일 제보 마커 */}
            <div>
              <h3 className="text-xl font-semibold mb-4 text-gray-800">📍 단일 제보 마커 (1개 제보)</h3>
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <MapPin className="w-5 h-5 text-blue-600 mr-2" />
                        강남구 역삼동 테헤란로 일대
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        1개의 제보가 있습니다
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <UIReportCard
                      {...demoReports[0]}
                      size="medium"
                      onClick={() => alert(`제보 ${demoReports[0].id} 클릭!`)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 다중 제보 마커 */}
            <div>
              <h3 className="text-xl font-semibold mb-4 text-gray-800">📍 다중 제보 마커 (3개 제보)</h3>
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <MapPin className="w-5 h-5 text-blue-600 mr-2" />
                        서초구 서초동 서초대로 일대
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        3개의 제보가 있습니다
                      </p>
                    </div>
                    <button
                      className="text-gray-500 hover:text-gray-700 transition-colors p-2 hover:bg-white/50 rounded-lg"
                      onClick={() => alert('닫기 버튼 클릭!')}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {demoReports.slice(0, 3).map((report) => (
                      <UIReportCard
                        key={report.id}
                        {...report}
                        size="medium"
                        onClick={() => alert(`제보 ${report.id} 클릭!`)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 많은 제보 마커 */}
            <div>
              <h3 className="text-xl font-semibold mb-4 text-gray-800">📍 집중 제보 마커 (5개 제보)</h3>
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <MapPin className="w-5 h-5 text-red-600 mr-2" />
                        중구 명동1가 명동역 일대 <span className="text-sm font-normal text-red-600 ml-2">(집중 제보 지역)</span>
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        5개의 제보가 있습니다 - 소음, 쓰레기, 시설물 등 다양한 문제
                      </p>
                    </div>
                    <button
                      className="text-gray-500 hover:text-gray-700 transition-colors p-2 hover:bg-white/50 rounded-lg"
                      onClick={() => alert('닫기 버튼 클릭!')}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {demoReports.map((report) => (
                      <UIReportCard
                        key={report.id}
                        {...report}
                        size="medium"
                        onClick={() => alert(`제보 ${report.id} 클릭!`)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 설명 */}
            <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-6 border border-emerald-200">
              <h4 className="text-lg font-semibold text-gray-800 mb-3">🎯 마커 클릭 UI 동작 방식</h4>
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-start">
                  <span className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
                  <div>
                    <strong>지도에서 마커 클릭</strong> → 해당 위치의 모든 제보들이 지도 아래쪽에 인라인으로 표시됩니다.
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
                  <div>
                    <strong>위치 정보 헤더</strong> → 선택된 위치명과 총 제보 개수가 상단에 표시됩니다.
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
                  <div>
                    <strong>제보 카드 목록</strong> → 기존 ReportCard 컴포넌트를 재사용하여 일관된 디자인으로 표시됩니다.
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">4</span>
                  <div>
                    <strong>카드 클릭</strong> → 각 제보 카드를 클릭하면 해당 제보의 상세 페이지로 이동합니다.
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">5</span>
                  <div>
                    <strong>닫기 버튼</strong> → 우측 상단의 X 버튼으로 언제든 제보 목록을 닫을 수 있습니다.
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-white rounded-lg border border-emerald-200">
                <p className="text-xs text-gray-600">
                  💡 <strong>실제 앱에서는</strong> 카카오맵의 역지오코딩 API로 정확한 위치명(건물명, 도로명)을 가져와서 표시하며, 
                  각 마커는 실제 제보 데이터의 좌표를 기반으로 그룹핑됩니다.
                </p>
              </div>
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
                  <div className="text-white ml-2">Button, Input, Alert,</div>
                  <div className="text-white ml-2">Modal, Badge, Form</div>
                  <div className="text-yellow-300">{`}`} from &apos;@/components/ui&apos;</div>
                  <div className="mt-2 text-green-300">{/* 사용 */}</div>
                  <div className="text-white">&lt;Button variant=&quot;primary&quot;&gt;</div>
                  <div className="text-white ml-2">Click me</div>
                  <div className="text-white">&lt;/Button&gt;</div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-white/10 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold mb-1">이 페이지는</h4>
                  <p className="text-sm opacity-90">
                    <code>http://localhost:3000/components</code>에서 언제든 확인할 수 있습니다
                  </p>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => router.push('/')}
                  className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                >
                  메인으로 돌아가기
                </Button>
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

          <FormActions align="right" className="pt-4">
            <Button variant="ghost" onClick={() => setShowBaseModal(false)}>
              닫기
            </Button>
            <Button variant="primary" onClick={() => setShowBaseModal(false)}>
              확인
            </Button>
          </FormActions>
        </div>
      </BaseModal>
    </div>
  )
}

export default UIShowcase