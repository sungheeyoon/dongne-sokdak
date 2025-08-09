'use client'

import React, { forwardRef } from 'react'
import { clsx } from 'clsx'

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  hint?: string
  variant?: 'default' | 'filled' | 'outlined'
  inputSize?: 'sm' | 'md' | 'lg'
  startIcon?: React.ReactNode
  endIcon?: React.ReactNode
  fullWidth?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({
    label,
    error,
    hint,
    variant = 'default',
    inputSize = 'md',
    startIcon,
    endIcon,
    fullWidth = true,
    className,
    ...props
  }, ref) => {
    const sizeStyles = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-3 text-base',
      lg: 'px-5 py-4 text-lg'
    }

    const variantStyles = {
      default: 'border-2 border-gray-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200',
      filled: 'border border-gray-300 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200',
      outlined: 'border-2 border-gray-400 bg-transparent focus:border-blue-600 focus:ring-2 focus:ring-blue-300'
    }

    const inputClasses = clsx(
      'rounded-lg font-medium transition-all duration-200 outline-none',
      'placeholder:text-gray-400 placeholder:font-normal',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100',
      sizeStyles[inputSize],
      variantStyles[variant],
      error && 'border-red-500 focus:border-red-500 focus:ring-red-200',
      fullWidth && 'w-full',
      (startIcon || endIcon) && 'flex items-center',
      startIcon && 'pl-10',
      endIcon && 'pr-10',
      className
    )

    return (
      <div className={clsx('relative', fullWidth && 'w-full')}>
        {label && (
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {startIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              {startIcon}
            </div>
          )}
          
          <input
            ref={ref}
            className={inputClasses}
            {...props}
          />
          
          {endIcon && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              {endIcon}
            </div>
          )}
        </div>

        {error && (
          <p className="text-red-600 text-sm mt-1 font-medium">
            {error}
          </p>
        )}
        
        {hint && !error && (
          <p className="text-gray-500 text-xs mt-1">
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'