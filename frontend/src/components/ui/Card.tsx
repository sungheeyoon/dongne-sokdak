'use client';

import React from 'react';
import { clsx } from 'clsx';
import { Button } from './Button';

export interface CardProps {
  theme?: 'light' | 'dark';
  size?: 'compact' | 'medium' | 'large';
  title: string;
  description?: string;
  image?: string;
  buttonText?: string;
  onButtonClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ 
    theme = 'light',
    size = 'medium',
    title,
    description,
    image,
    buttonText,
    onButtonClick,
    className,
    children,
    ...props 
  }, ref) => {
    const baseStyles = [
      'rounded-[var(--radius-card)]',
      'overflow-hidden',
      'transition-all',
      'duration-500',
      'ease-in-out',
      'hover:shadow-lg',
      'group',
    ];

    const themeStyles = {
      light: [
        'bg-[rgb(var(--primary-light-beige))]',
        '',
        'border',
        'border-gray-200',
      ],
      dark: [
        'bg-[rgb(var(--primary-dark-brown))]',
        'text-[rgb(var(--primary-light-beige))]',
        'border',
        'border-[rgb(var(--primary-black))]',
      ],
    };

    const sizeStyles = {
      compact: {
        minHeight: 'min-h-[200px]',
        padding: image ? 'p-0' : 'p-4',
        innerPadding: image ? 'p-4' : '',
        imageHeight: 'aspect-[4/3]',
        titleSize: 'text-base',
        descriptionSize: 'text-sm',
      },
      medium: {
        minHeight: 'min-h-[280px]',
        padding: image ? 'p-0' : 'p-6',
        innerPadding: image ? 'p-6' : '',
        imageHeight: 'aspect-video',
        titleSize: 'text-lg',
        descriptionSize: 'text-base',
      },
      large: {
        minHeight: 'min-h-[400px]',
        padding: image ? 'p-0' : 'p-8',
        innerPadding: image ? 'p-8' : '',
        imageHeight: 'aspect-[16/10]',
        titleSize: 'text-xl',
        descriptionSize: 'text-lg',
      },
    };

    const currentSize = sizeStyles[size];
    
    return (
      <div
        className={clsx(
          baseStyles,
          themeStyles[theme],
          currentSize.padding,
          currentSize.minHeight,
          className
        )}
        ref={ref}
        {...props}
      >
        {image && (
          <div className={clsx(currentSize.imageHeight, 'w-full overflow-hidden')}>
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        )}
        
        <div className={image ? currentSize.innerPadding : ''}>
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className={clsx(
                'font-medium',
                'leading-tight',
                theme === 'light' ? '' : 'text-[rgb(var(--primary-light-beige))]',
                currentSize.titleSize
              )}>
                {title}
              </h3>
              
              {description && (
                <p className={clsx(
                  currentSize.descriptionSize,
                  'leading-relaxed',
                  theme === 'light' 
                    ? 'text-[rgba(var(--primary-dark-brown),_0.8)]' 
                    : 'text-[rgba(var(--primary-light-beige),_0.8)]'
                )}>
                  {description}
                </p>
              )}
            </div>

            {children && (
              <div className="space-y-3">
                {children}
              </div>
            )}

            {buttonText && onButtonClick && (
              <div className="pt-2">
                <Button
                  variant={theme === 'light' ? 'ghost' : 'secondary'}
                  size="small"
                  onClick={onButtonClick}
                  className={clsx(
                    'transition-all',
                    'duration-[var(--transition-fast)]',
                    theme === 'light' 
                      ? 'hover:bg-[rgba(var(--primary-dark-brown),_0.1)]' 
                      : 'hover:bg-[rgba(var(--primary-light-beige),_0.1)]'
                  )}
                >
                  {buttonText}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

Card.displayName = 'Card';