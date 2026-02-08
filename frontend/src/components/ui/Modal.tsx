'use client';

import React, { useEffect } from 'react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { Button } from './button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  overlayClassName?: string;
}

export const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
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
    ...props 
  }, ref) => {
    // ESC 키로 모달 닫기
    useEffect(() => {
      if (!closeOnEscape || !isOpen) return;

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [closeOnEscape, isOpen, onClose]);

    // 모달이 열렸을 때 body 스크롤 방지
    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }

      return () => {
        document.body.style.overflow = 'unset';
      };
    }, [isOpen]);

    if (!isOpen) return null;

    const sizeStyles = {
      sm: 'max-w-md',
      md: 'max-w-lg',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl',
      full: 'max-w-[95vw] max-h-[95vh]',
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
      if (closeOnOverlayClick && e.target === e.currentTarget) {
        onClose();
      }
    };

    return (
      <div
        className={clsx(
          'fixed inset-0 z-50 flex items-center justify-center',
          'bg-[rgba(var(--primary-black),_0.5)]',
          'backdrop-blur-sm',
          'p-4',
          'transition-all',
          'duration-[var(--transition-medium)]',
          overlayClassName
        )}
        onClick={handleOverlayClick}
      >
        <div
          className={clsx(
            'bg-[rgb(var(--primary-white))]',
            'rounded-[var(--radius-card)]',
            'shadow-2xl',
            'w-full',
            sizeStyles[size],
            'max-h-[90vh]',
            'overflow-hidden',
            'flex',
            'flex-col',
            'transition-all',
            'duration-[var(--transition-medium)]',
            'transform',
            'scale-100',
            'opacity-100',
            className
          )}
          ref={ref}
          {...props}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              {title && (
                <h2 className="text-xl font-semibold ">
                  {title}
                </h2>
              )}
              {showCloseButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

Modal.displayName = 'Modal';