'use client';

import React from 'react';
import { clsx } from 'clsx';
import { Button } from './Button';

export interface HeroSectionProps {
  title: string;
  subtitle?: string;
  buttonText?: string;
  onButtonClick?: () => void;
  backgroundImage?: string;
  className?: string;
  children?: React.ReactNode;
}

export const HeroSection = React.forwardRef<HTMLDivElement, HeroSectionProps>(
  ({ 
    title,
    subtitle,
    buttonText,
    onButtonClick,
    backgroundImage,
    className,
    children,
    ...props 
  }, ref) => {
    const baseStyles = [
      // Structure from theme
      'min-h-[600px]',
      'h-[619px]',
      'flex',
      'items-center',
      'justify-center',
      'text-left',
      'relative',
      'overflow-hidden',
    ];

    const backgroundStyles = [
      'bg-[rgb(var(--primary-light-beige))]',
      'bg-cover',
      'bg-center',
      'bg-no-repeat',
    ];

    const backgroundImageStyle = backgroundImage 
      ? { backgroundImage: `url(${backgroundImage})` }
      : {};

    return (
      <div
        className={clsx(
          baseStyles,
          backgroundStyles,
          className
        )}
        style={backgroundImageStyle}
        ref={ref}
        {...props}
      >
        {/* Background overlay if image is provided */}
        {backgroundImage && (
          <div className="absolute inset-0 bg-[rgba(var(--primary-dark-brown),_0.4)]" />
        )}

        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
          <div className="max-w-4xl">
            <div className="space-y-8">
              {/* Main Title */}
              <h1 className={clsx(
                'text-5xl',
                'md:text-6xl',
                'lg:text-7xl',
                'font-medium',
                'leading-tight',
                'mb-0',
                backgroundImage 
                  ? 'text-[rgb(var(--primary-white))]'
                  : ''
              )}>
                {title}
              </h1>

              {/* Subtitle */}
              {subtitle && (
                <p className={clsx(
                  'text-lg',
                  'md:text-xl',
                  'lg:text-2xl',
                  'leading-relaxed',
                  'max-w-2xl',
                  backgroundImage 
                    ? 'text-[rgba(var(--primary-white),_0.9)]'
                    : 'text-[rgba(var(--primary-dark-brown),_0.8)]'
                )}>
                  {subtitle}
                </p>
              )}

              {/* Action Button */}
              {buttonText && onButtonClick && (
                <div className="pt-4">
                  <Button
                    variant={backgroundImage ? 'secondary' : 'primary'}
                    size="large"
                    onClick={onButtonClick}
                    className={clsx(
                      'text-lg',
                      'px-8',
                      'py-4',
                      'min-w-[160px]',
                      'shadow-lg',
                      'hover:shadow-xl',
                      'transform',
                      'hover:-translate-y-1',
                      'transition-all',
                      'duration-300'
                    )}
                  >
                    {buttonText}
                  </Button>
                </div>
              )}

              {/* Custom Content */}
              {children && (
                <div className="pt-6">
                  {children}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Optional decorative elements */}
        <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[rgba(var(--primary-light-beige),_0.3)] to-transparent pointer-events-none" />
      </div>
    );
  }
);

HeroSection.displayName = 'HeroSection';