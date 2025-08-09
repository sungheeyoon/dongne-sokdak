'use client'

import React from 'react'
import { clsx } from 'clsx'
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'
import { Button } from './Button'

export interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error'
  title?: string
  message: string
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
  children?: React.ReactNode
}

const alertIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle
}

const alertStyles = {
  info: {
    container: 'bg-blue-50 border-l-4 border-blue-400',
    icon: 'text-blue-400',
    title: 'text-blue-800',
    message: 'text-blue-700'
  },
  success: {
    container: 'bg-green-50 border-l-4 border-green-400',
    icon: 'text-green-400',
    title: 'text-green-800',
    message: 'text-green-700'
  },
  warning: {
    container: 'bg-yellow-50 border-l-4 border-yellow-400',
    icon: 'text-yellow-400',
    title: 'text-yellow-800',
    message: 'text-yellow-700'
  },
  error: {
    container: 'bg-red-50 border-l-4 border-red-400',
    icon: 'text-red-400',
    title: 'text-red-800',
    message: 'text-red-700'
  }
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  message,
  dismissible = false,
  onDismiss,
  className,
  children
}) => {
  const IconComponent = alertIcons[type]
  const styles = alertStyles[type]

  return (
    <div className={clsx(
      'p-4 rounded-md relative',
      styles.container,
      className
    )}>
      <div className="flex">
        <div className="flex-shrink-0">
          <IconComponent className={clsx('h-5 w-5', styles.icon)} />
        </div>
        
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={clsx('font-semibold text-sm mb-1', styles.title)}>
              {title}
            </h3>
          )}
          
          <div className={clsx('text-sm', styles.message)}>
            {message}
          </div>
          
          {children && (
            <div className="mt-2">
              {children}
            </div>
          )}
        </div>

        {dismissible && onDismiss && (
          <div className="ml-auto pl-3">
            <Button
              variant="ghost"
              size="small"
              onClick={onDismiss}
              className="p-1 hover:bg-opacity-20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Alert