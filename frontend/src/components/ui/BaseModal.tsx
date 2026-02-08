'use client'

import React, { useEffect } from 'react'
import { clsx } from 'clsx'
import { X } from 'lucide-react'
import { Button } from './button'

export interface BaseModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  className?: string
  overlayClassName?: string
  headerClassName?: string
  contentClassName?: string
  footerClassName?: string
  footer?: React.ReactNode
}

export const BaseModal = React.forwardRef<HTMLDivElement, BaseModalProps>(
  ({ 
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    showCloseButton = true,
    closeOnOverlayClick = true,
    closeOnEscape = true,
    className,
    overlayClassName,
    headerClassName,
    contentClassName,
    footerClassName,
    footer,
    ...props 
  }, ref) => {
    // ESC 키로 모달 닫기
    useEffect(() => {
      if (!closeOnEscape || !isOpen) return

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }

      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }, [closeOnEscape, isOpen, onClose])

    // 모달이 열렸을 때 body 스크롤 방지
    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = 'unset'
      }

      return () => {
        document.body.style.overflow = 'unset'
      }
    }, [isOpen])

    if (!isOpen) return null

    const sizeStyles = {
      xs: 'max-w-xs',
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-2xl',
      full: 'max-w-[95vw] max-h-[95vh]',
    }

    const handleOverlayClick = (e: React.MouseEvent) => {
      if (closeOnOverlayClick && e.target === e.currentTarget) {
        onClose()
      }
    }

    return (
      <div
        className={clsx(
          'fixed inset-0 z-[9999] flex items-center justify-center',
          'bg-black/50',
          'backdrop-blur-sm',
          'p-4',
          'transition-opacity duration-300',
          'animate-in fade-in-0',
          overlayClassName
        )}
        onClick={handleOverlayClick}
      >
        <div
          className={clsx(
            'bg-white',
            'rounded-xl',
            'shadow-2xl',
            'border border-gray-200',
            'w-full',
            sizeStyles[size],
            'max-h-[90vh]',
            'overflow-hidden',
            'flex',
            'flex-col',
            'transition-all duration-300',
            'animate-in zoom-in-95 slide-in-from-bottom-2',
            className
          )}
          ref={ref}
          {...props}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className={clsx(
              'flex items-center justify-between p-6 border-b border-gray-200',
              headerClassName
            )}>
              {title && (
                <h2 className="text-xl font-bold text-gray-900">
                  {title}
                </h2>
              )}
              {showCloseButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>
          )}

          {/* Content */}
          <div className={clsx(
            'flex-1 overflow-y-auto p-6',
            contentClassName
          )}>
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className={clsx(
              'border-t border-gray-200 p-6',
              footerClassName
            )}>
              {footer}
            </div>
          )}
        </div>
      </div>
    )
  }
)

BaseModal.displayName = 'BaseModal'