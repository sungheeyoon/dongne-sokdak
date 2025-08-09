'use client'

import React from 'react'
import { clsx } from 'clsx'

export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  spacing?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export interface FormSectionProps {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}

export interface FormActionsProps {
  children: React.ReactNode
  align?: 'left' | 'center' | 'right' | 'between'
  spacing?: 'sm' | 'md' | 'lg'
  className?: string
}

export const Form: React.FC<FormProps> = ({ 
  spacing = 'md', 
  className, 
  children, 
  ...props 
}) => {
  const spacingStyles = {
    sm: 'space-y-3',
    md: 'space-y-5',
    lg: 'space-y-7'
  }

  return (
    <form
      className={clsx(spacingStyles[spacing], className)}
      {...props}
    >
      {children}
    </form>
  )
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  className
}) => {
  return (
    <div className={clsx('space-y-4', className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}

export const FormActions: React.FC<FormActionsProps> = ({
  children,
  align = 'right',
  spacing = 'md',
  className
}) => {
  const spacingStyles = {
    sm: 'space-x-2',
    md: 'space-x-3',
    lg: 'space-x-4'
  }

  const alignStyles = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between'
  }

  return (
    <div className={clsx(
      'flex items-center pt-4',
      alignStyles[align],
      spacingStyles[spacing],
      className
    )}>
      {children}
    </div>
  )
}