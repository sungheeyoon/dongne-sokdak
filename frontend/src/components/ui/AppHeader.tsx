'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { Home, Settings, Menu, X, MapPin, User, LogOut, Edit3, ChevronDown } from 'lucide-react';
import { Button } from './button';
import Image from 'next/image';
import { formatToAdministrativeAddress } from '@/lib/utils/addressUtils';

export interface User {
  id: string;
  email: string;
  nickname?: string;
  avatar_url?: string;
}

export interface Profile {
  id: string;
  nickname: string;
  avatar_url?: string;
  neighborhood?: {
    place_name: string;
    address: string;
    lat: number;
    lng: number;
  };
}

export interface AdminInfo {
  role: 'admin' | 'moderator' | 'user';
  permissions: string[];
}

export interface AppHeaderProps {
  user?: User | null;
  profile?: Profile | null;
  adminInfo?: AdminInfo | null;
  logoSrc?: string;
  title?: string;
  subtitle?: string;
  onAuthClick?: (mode: 'signin' | 'signup') => void;
  onSignOut?: () => void;
  onReportClick?: () => void;
  onNeighborhoodClick?: () => void;
  onProfileClick?: () => void;
  onMyReportsClick?: () => void;
  onAdminClick?: () => void;
  onAdminReportsClick?: () => void;
  onLogoClick?: () => void;
  className?: string;
}

export const AppHeader = React.forwardRef<HTMLElement, AppHeaderProps>(
  ({ 
    user,
    profile,
    adminInfo,
    logoSrc = "/images/title.png",
    title = "동네속닥",
    subtitle = "우리 동네 이슈 제보 커뮤니티",
    onAuthClick,
    onSignOut,
    onReportClick,
    onNeighborhoodClick,
    onProfileClick,
    onMyReportsClick,
    onAdminClick,
    onAdminReportsClick,
    onLogoClick,
    className,
    ...props 
  }, ref) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
    const profileDropdownRef = useRef<HTMLDivElement>(null);

    // 프로필 드롭다운 외부 클릭 감지
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
          console.log('Outside click detected, closing dropdown');
          setIsProfileDropdownOpen(false);
        }
      };

      if (isProfileDropdownOpen) {
        console.log('Adding event listener for outside clicks');
        document.addEventListener('mousedown', handleClickOutside);
      }
      
      return () => {
        console.log('Removing event listener for outside clicks');
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isProfileDropdownOpen]);

    const isAdmin = () => {
      return adminInfo && (adminInfo.role === 'admin' || adminInfo.role === 'moderator');
    };

    const getNeighborhoodDisplayName = () => {
      if (!profile?.neighborhood) return '내 동네';
      
      // 1순위: address에서 동/로/가 추출 시도
      const adminAddress = formatToAdministrativeAddress(profile.neighborhood.address);
      
      // 동/로/가로 끝나는 유의미한 결과가 나왔으면 사용
      if (adminAddress && adminAddress !== '주소 없음' && 
          (adminAddress.endsWith('동') || adminAddress.endsWith('로') || adminAddress.endsWith('가'))) {
        return adminAddress;
      }
      
      // 2순위: place_name에서 동/로/가 추출 시도
      const placeAdminAddress = formatToAdministrativeAddress(profile.neighborhood.place_name);
      
      if (placeAdminAddress && placeAdminAddress !== '주소 없음' && 
          (placeAdminAddress.endsWith('동') || placeAdminAddress.endsWith('로') || placeAdminAddress.endsWith('가'))) {
        return placeAdminAddress;
      }
      
      // 3순위: 원본 값들에서 직접 동/로/가 찾기
      const addressParts = profile.neighborhood.address.split(' ');
      for (let i = addressParts.length - 1; i >= 0; i--) {
        const part = addressParts[i];
        if (part.endsWith('동') || part.endsWith('로') || part.endsWith('가')) {
          return part;
        }
      }
      
      const placeNameParts = profile.neighborhood.place_name.split(' ');
      for (let i = placeNameParts.length - 1; i >= 0; i--) {
        const part = placeNameParts[i];
        if (part.endsWith('동') || part.endsWith('로') || part.endsWith('가')) {
          return part;
        }
      }
      
      // 모든 시도가 실패하면 place_name 사용
      return profile.neighborhood.place_name;
    };

    const calculateDropdownPosition = () => {
      if (!profileDropdownRef.current) return;
      
      const rect = profileDropdownRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    };

    return (
      <>
        <header
        className={clsx(
          'bg-[rgb(var(--primary-white))]',
          'shadow-lg',
          'border-b-2',
          'border-gray-300',
          'sticky',
          'top-0',
          'z-50',
          className
        )}
        style={{ overflow: 'visible' }}
        ref={ref}
        {...props}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 relative">
            {/* Logo Section */}
            <div 
              className="flex items-center cursor-pointer" 
              onClick={onLogoClick}
            >
              <div className="flex items-center">
                <Image 
                  src={logoSrc}
                  alt={`${title} 로고`}
                  width={150}
                  height={40}
                  className="h-6 md:h-8 w-auto"
                  priority
                />
              </div>
              <p className="ml-2 md:ml-4 text-xs md:text-sm text-[rgba(var(--primary-dark-brown),_0.8)] hidden sm:block font-medium">
                {subtitle}
              </p>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4" style={{ overflow: 'visible' }}>
              {user ? (
                <>
                  {/* Neighborhood Button */}
                  <Button
                    variant="ghost"
                    size="default"
                    onClick={onNeighborhoodClick}
                    className={clsx(
                      'flex items-center space-x-2',
                      profile?.neighborhood 
                        ? 'bg-blue-50 text-[rgb(var(--primary-blue))] hover:bg-blue-100' 
                        : ''
                    )}
                    title={profile?.neighborhood ? `내 동네: ${getNeighborhoodDisplayName()}` : '내 동네 설정하기'}
                  >
                    <Home className="h-4 w-4" />
                    <span>{getNeighborhoodDisplayName()}</span>
                  </Button>

                  {/* My Reports */}
                  <Button
                    variant="ghost"
                    size="default"
                    onClick={onMyReportsClick}
                    className="flex items-center space-x-2"
                  >
                    <MapPin className="h-4 w-4" />
                    <span>내 제보</span>
                  </Button>

                  {/* Admin Buttons */}
                  {adminInfo && isAdmin() && (
                    <>
                      <Button
                        variant="ghost"
                        size="default"
                        onClick={onAdminClick}
                        className="flex items-center space-x-2 text-purple-700 hover:text-purple-900 hover:bg-purple-50"
                        title="관리자 대시보드"
                      >
                        <Settings className="h-4 w-4" />
                        <span>관리자</span>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="default"
                        onClick={onAdminReportsClick}
                        className="flex items-center space-x-2 text-orange-700 hover:text-orange-900 hover:bg-orange-50"
                        title="제보 관리"
                      >
                        <Edit3 className="h-4 w-4" />
                        <span>제보 관리</span>
                      </Button>
                    </>
                  )}

                  {/* Report Button */}
                  <Button
                    variant="default"
                    size="default"
                    onClick={onReportClick}
                    className="bg-gradient-to-r from-[rgb(var(--primary-blue))] to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    제보하기
                  </Button>

                  {/* User Menu - Profile Dropdown */}
                  <div className="relative" ref={profileDropdownRef}>
                    <Button
                      variant="ghost"
                      size="default"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Profile dropdown clicked, current state:', isProfileDropdownOpen);
                        
                        if (!isProfileDropdownOpen) {
                          calculateDropdownPosition();
                        }
                        setIsProfileDropdownOpen(!isProfileDropdownOpen);
                      }}
                      className="flex items-center space-x-2 bg-[rgb(var(--primary-white))] border border-gray-300 rounded-lg px-4 py-2 shadow-sm hover:bg-gray-50"
                    >
                      <User className="h-4 w-4 text-gray-600" />
                      <span className="text-sm text-gray-800 font-medium">프로필</span>
                      <ChevronDown className={clsx(
                        'h-4 w-4 text-gray-600 transition-transform',
                        isProfileDropdownOpen ? 'rotate-180' : ''
                      )} />
                    </Button>
                    
                  </div>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="default"
                    onClick={() => onAuthClick?.('signin')}
                  >
                    로그인
                  </Button>
                  <Button
                    variant="default"
                    size="default"
                    onClick={() => onAuthClick?.('signup')}
                    className="bg-gradient-to-r from-[rgb(var(--primary-blue))] to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                  >
                    회원가입
                  </Button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center space-x-2">
              {user && (
                <Button
                  variant="default"
                                    size="sm"
                  onClick={onReportClick}
                  className="bg-gradient-to-r from-[rgb(var(--primary-blue))] to-blue-700 p-2"
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                                  size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-gray-300 py-4">
              <div className="flex flex-col space-y-3">
                {user ? (
                  <>
                    <Button
                      variant="ghost"
                      size="default"
                      onClick={() => {
                        onNeighborhoodClick?.();
                        setIsMobileMenuOpen(false);
                      }}
                      className={clsx(
                        'justify-start space-x-2',
                        profile?.neighborhood 
                          ? 'bg-blue-50 text-[rgb(var(--primary-blue))]' 
                          : ''
                      )}
                    >
                      <Home className="h-5 w-5" />
                      <span>{getNeighborhoodDisplayName()}</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="default"
                      onClick={() => {
                        onMyReportsClick?.();
                        setIsMobileMenuOpen(false);
                      }}
                      className="justify-start space-x-2"
                    >
                      <MapPin className="h-5 w-5" />
                      <span>내 제보</span>
                    </Button>

                    {adminInfo && isAdmin() && (
                      <>
                        <Button
                          variant="ghost"
                          size="default"
                          onClick={() => {
                            onAdminClick?.();
                            setIsMobileMenuOpen(false);
                          }}
                          className="justify-start space-x-2 text-purple-700 hover:bg-purple-50"
                        >
                          <Settings className="h-5 w-5" />
                          <span>관리자 대시보드</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="default"
                          onClick={() => {
                            onAdminReportsClick?.();
                            setIsMobileMenuOpen(false);
                          }}
                          className="justify-start space-x-2 text-orange-700 hover:bg-orange-50"
                        >
                          <Edit3 className="h-5 w-5" />
                          <span>제보 관리</span>
                        </Button>
                      </>
                    )}

                    <Button
                      variant="ghost"
                      size="default"
                      onClick={() => {
                        onProfileClick?.();
                        setIsMobileMenuOpen(false);
                      }}
                      className="justify-start space-x-2"
                    >
                      <User className="h-5 w-5" />
                      <span>프로필</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="default"
                      onClick={() => {
                        onSignOut?.();
                        setIsMobileMenuOpen(false);
                      }}
                      className="justify-start text-red-600 hover:bg-red-50 space-x-2"
                    >
                      <LogOut className="h-5 w-5" />
                      <span>로그아웃</span>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="default"
                      onClick={() => {
                        onAuthClick?.('signin');
                        setIsMobileMenuOpen(false);
                      }}
                      className="justify-start"
                    >
                      로그인
                    </Button>
                    <Button
                      variant="default"
                      size="default"
                      onClick={() => {
                        onAuthClick?.('signup');
                        setIsMobileMenuOpen(false);
                      }}
                      className="justify-start bg-gradient-to-r from-[rgb(var(--primary-blue))] to-blue-700"
                    >
                      회원가입
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        </header>
        
        {/* Profile Dropdown Portal */}
        {isProfileDropdownOpen && typeof window !== 'undefined' && createPortal(
          <div 
            className="fixed w-56 bg-white border-2 border-gray-300 rounded-lg shadow-2xl"
            style={{
              zIndex: 99999,
              top: `${dropdownPosition.top}px`,
              right: `${dropdownPosition.right}px`,
            }}
          >
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-3">
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.nickname || user?.email || 'User'}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-8 w-8 text-gray-500 bg-gray-200 rounded-full p-1" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {profile?.nickname || user?.email}
                  </p>
                  <p className="text-xs text-gray-600 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>
            <div className="py-2">
              <button
                onClick={() => {
                  console.log('Profile management clicked');
                  onProfileClick?.();
                  setIsProfileDropdownOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 transition-colors flex items-center space-x-2"
              >
                <User className="h-4 w-4" />
                <span>프로필 관리</span>
              </button>
              <button 
                onClick={() => {
                  console.log('Logout clicked');
                  onSignOut?.();
                  setIsProfileDropdownOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>로그아웃</span>
              </button>
            </div>
          </div>,
          document.body
        )}
      </>
    );
});

AppHeader.displayName = 'AppHeader';