'use client';

import React from 'react';
import { clsx } from 'clsx';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'external';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'medium', 
    loading = false,
    disabled,
    children, 
    ...props 
  }, ref) => {
    const baseStyles = [
      // Base styles from theme
      'inline-flex',
      'items-center',
      'justify-center',
      'font-medium',
      'transition-all',
      'duration-[var(--transition-fast)]',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-offset-2',
      'disabled:opacity-50',
      'disabled:pointer-events-none',
      'active:scale-95',
    ];

    const variantStyles = {
      primary: [
        'bg-[rgb(var(--primary-dark-brown))]',
        'text-[rgb(var(--primary-light-beige))]',
        'hover:bg-[rgb(var(--primary-black))]',
        'focus:ring-[rgb(var(--primary-dark-brown))]',
      ],
      secondary: [
        'bg-[rgb(var(--primary-light-beige))]',
        'text-[rgb(var(--primary-dark-brown))]',
        'border',
        'border-[rgb(var(--primary-dark-brown))]',
        'hover:bg-[rgb(var(--primary-dark-brown))]',
        'hover:text-[rgb(var(--primary-light-beige))]',
        'focus:ring-[rgb(var(--primary-dark-brown))]',
      ],
      outline: [
        'bg-transparent',
        'text-[rgb(var(--primary-dark-brown))]',
        'border',
        'border-[rgb(var(--primary-dark-brown))]',
        'hover:bg-[rgb(var(--primary-dark-brown))]',
        'hover:text-[rgb(var(--primary-light-beige))]',
        'focus:ring-[rgb(var(--primary-dark-brown))]',
      ],
      ghost: [
        'bg-transparent',
        'text-[rgb(var(--primary-dark-brown))]',
        'hover:bg-[rgba(var(--primary-dark-brown),_0.1)]',
        'focus:ring-[rgb(var(--primary-dark-brown))]',
      ],
      danger: [
        'bg-red-600',
        'text-white',
        'hover:bg-red-700',
        'focus:ring-red-600',
      ],
      external: [
        'bg-transparent',
        'text-[rgb(var(--primary-blue))]',
        'underline',
        'hover:text-[rgb(var(--primary-pink))]',
        'focus:ring-[rgb(var(--primary-blue))]',
      ],
    };

    const sizeStyles = {
      small: [
        'px-3',
        'py-2',
        'text-sm',
        'rounded-[var(--radius-button)]',
        'min-h-[32px]',
      ],
      medium: [
        'px-4',
        'py-3',
        'text-base',
        'rounded-[var(--radius-button)]',
        'min-h-[44px]',
      ],
      large: [
        'px-6',
        'py-4',
        'text-lg',
        'rounded-[var(--radius-button)]',
        'min-h-[52px]',
      ],
    };

    return (
      <button
        className={clsx(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        disabled={disabled || loading}
        ref={ref}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-3 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';