'use client';

import React, { useState } from 'react';
import { clsx } from 'clsx';
import { Button } from './button';

export interface NavItem {
  label: string;
  href: string;
  external?: boolean;
  dropdown?: NavItem[];
}

export interface NavbarProps {
  items?: NavItem[];
  showMobileMenu?: boolean;
  className?: string;
  onLogoClick?: () => void;
}

const defaultNavItems: NavItem[] = [
  { label: '홈', href: '/' },
  { label: '제보하기', href: '/reports' },
  { label: '내 제보', href: '/my-reports' },
  { label: '프로필', href: '/profile' },
];

export const Navbar = React.forwardRef<HTMLElement, NavbarProps>(
  ({ 
    items = defaultNavItems,
    showMobileMenu = true,
    className,
    onLogoClick,
    ...props 
  }, ref) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleMobileMenu = () => {
      setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    return (
      <nav
        className={clsx(
          // Base styles from theme
          'sticky',
          'top-0',
          'z-[120]',
          'h-[92px]',
          'bg-[rgb(var(--primary-white))]',
          'border-b-0',
          'shadow-none',
          'transition-all',
          'duration-[var(--transition-medium)]',
          'ease-in-out',
          className
        )}
        ref={ref}
        {...props}
      >
        <div className="max-w-7xl mx-auto px-6 h-full">
          <div className="flex items-center justify-between h-full">
            {/* Logo */}
            <div className="flex-shrink-0">
              <button
                onClick={onLogoClick}
                className={clsx(
                  'text-2xl',
                  'font-bold',
                  '',
                  'hover:text-[rgb(var(--primary-black))]',
                  'transition-colors',
                  'duration-[var(--transition-fast)]',
                  'focus:outline-none',
                  'focus:ring-2',
                  'focus:ring-[rgb(var(--primary-dark-brown))]',
                  'rounded-lg',
                  'px-2',
                  'py-1'
                )}
              >
                동네속닥
              </button>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {items.map((item, index) => (
                <NavLink key={index} item={item} />
              ))}
            </div>

            {/* Mobile menu button */}
            {showMobileMenu && (
              <div className="md:hidden">
                <button
                  onClick={toggleMobileMenu}
                  className={clsx(
                    'inline-flex',
                    'items-center',
                    'justify-center',
                    'p-2',
                    'rounded-[var(--radius-button)]',
                    '',
                    'hover:bg-[rgba(var(--primary-dark-brown),_0.1)]',
                    'focus:outline-none',
                    'focus:ring-2',
                    'focus:ring-inset',
                    'focus:ring-[rgb(var(--primary-dark-brown))]',
                    'transition-colors',
                    'duration-[var(--transition-fast)]'
                  )}
                >
                  <span className="sr-only">메뉴 열기</span>
                  <svg
                    className="h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {showMobileMenu && (
          <div
            className={clsx(
              'md:hidden',
              'transition-all',
              'duration-[var(--transition-slow)]',
              'ease-in-out',
              'overflow-hidden',
              isMobileMenuOpen 
                ? 'max-h-screen opacity-100' 
                : 'max-h-0 opacity-0'
            )}
          >
            <div className="px-2 pt-2 pb-3 space-y-1 bg-[rgb(var(--primary-white))] border-t border-gray-200">
              {items.map((item, index) => (
                <MobileNavLink 
                  key={index} 
                  item={item} 
                  onClick={() => setIsMobileMenuOpen(false)}
                />
              ))}
            </div>
          </div>
        )}
      </nav>
    );
  }
);

// Desktop Navigation Link Component
const NavLink: React.FC<{ item: NavItem }> = ({ item }) => {
  const linkStyles = [
    'inline-flex',
    'items-center',
    'px-4',
    'py-2',
    'rounded-[var(--radius-button)]',
    'text-base',
    'font-normal',
    'transition-all',
    'duration-[var(--transition-fast)]',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-[rgb(var(--primary-dark-brown))]',
  ];

  const defaultStyles = [
    '',
    'hover:bg-[rgba(var(--primary-dark-brown),_0.1)]',
    'no-underline',
  ];

  const externalStyles = [
    'text-[rgb(var(--primary-blue))]',
    'underline',
    'hover:text-[rgb(var(--primary-pink))]',
  ];

  return (
    <a
      href={item.href}
      className={clsx(
        linkStyles,
        item.external ? externalStyles : defaultStyles
      )}
      target={item.external ? '_blank' : undefined}
      rel={item.external ? 'noopener noreferrer' : undefined}
    >
      {item.label}
    </a>
  );
};

// Mobile Navigation Link Component
const MobileNavLink: React.FC<{ item: NavItem; onClick: () => void }> = ({ item, onClick }) => {
  return (
    <a
      href={item.href}
      className={clsx(
        'block',
        'px-3',
        'py-2',
        'rounded-md',
        'text-base',
        'font-medium',
        'transition-colors',
        'duration-[var(--transition-fast)]',
        item.external 
          ? [
              'text-[rgb(var(--primary-blue))]',
              'underline',
              'hover:text-[rgb(var(--primary-pink))]',
            ]
          : [
              '',
              'hover:bg-[rgba(var(--primary-dark-brown),_0.1)]',
              'no-underline',
            ]
      )}
      target={item.external ? '_blank' : undefined}
      rel={item.external ? 'noopener noreferrer' : undefined}
      onClick={onClick}
    >
      {item.label}
    </a>
  );
};

Navbar.displayName = 'Navbar';