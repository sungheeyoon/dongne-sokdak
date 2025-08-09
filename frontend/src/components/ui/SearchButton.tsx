'use client';

import React from 'react';
import { clsx } from 'clsx';

export interface SearchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'region' | 'action';
  isLoading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export const SearchButton = React.forwardRef<HTMLButtonElement, SearchButtonProps>(
  ({ 
    className, 
    variant = 'region',
    isLoading = false,
    loadingText,
    disabled,
    children, 
    ...props 
  }, ref) => {
    const baseStyles = [
      'inline-flex',
      'items-center',
      'justify-center',
      'font-medium',
      'rounded-lg',
      'shadow-md',
      'transition-all',
      'duration-300',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-offset-2',
      'disabled:pointer-events-none',
      'touch-manipulation',
      'whitespace-nowrap',
      'active:scale-95',
    ];

    const variantStyles = {
      region: [
        'px-3',
        'md:px-4',
        'py-3',
        'text-sm',
        'min-h-[48px]',
        isLoading || disabled
          ? 'bg-gray-400 text-white cursor-not-allowed'
          : 'bg-[rgb(var(--primary-blue))] hover:bg-blue-700 text-white hover:shadow-lg',
        'focus:ring-[rgb(var(--primary-blue))]',
      ],
      action: [
        'px-4',
        'py-2',
        'text-base',
        'min-h-[44px]',
        'bg-[rgb(var(--primary-dark-brown))]',
        'text-[rgb(var(--primary-light-beige))]',
        'hover:bg-[rgb(var(--primary-black))]',
        'hover:shadow-lg',
        'focus:ring-[rgb(var(--primary-dark-brown))]',
        disabled && 'opacity-50 cursor-not-allowed',
      ],
    };

    const renderContent = () => {
      if (isLoading) {
        return (
          <>
            <div className="animate-spin rounded-full h-3 md:h-4 w-3 md:w-4 border-b-2 border-white mr-1 md:mr-2"></div>
            <span className="hidden md:inline">{loadingText || '검색 중...'}</span>
            <span className="md:hidden">{loadingText?.split(' ')[0] || '검색중'}</span>
          </>
        );
      }

      if (variant === 'region' && typeof children === 'string') {
        return (
          <>
            <svg className="w-3 md:w-4 h-3 md:h-4 mr-1 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden md:inline">{children}</span>
            <span className="md:hidden">{(children as string).split(' ')[0]}</span>
          </>
        );
      }

      return children;
    };

    return (
      <button
        className={clsx(
          baseStyles,
          variantStyles[variant],
          className
        )}
        disabled={disabled || isLoading}
        ref={ref}
        {...props}
      >
        {renderContent()}
      </button>
    );
  }
);

SearchButton.displayName = 'SearchButton';