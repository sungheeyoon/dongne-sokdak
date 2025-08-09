'use client';

import React from 'react';
import { clsx } from 'clsx';
import { MapPin, ThumbsUp, MessageCircle, Calendar } from 'lucide-react';
import Image from 'next/image';
import { formatToAdministrativeAddress } from '@/lib/utils/addressUtils';

export interface ReportCardProps {
  id: string;
  title: string;
  description: string;
  category: 'NOISE' | 'TRASH' | 'FACILITY' | 'TRAFFIC' | 'OTHER';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  imageUrl?: string;
  address?: string;
  location?: { lat: number; lng: number };
  voteCount?: number;
  commentCount?: number;
  createdAt: string;
  size?: 'compact' | 'medium';
  onClick?: () => void;
  className?: string;
}

const categoryLabels = {
  NOISE: '소음',
  TRASH: '쓰레기',
  FACILITY: '시설물',
  TRAFFIC: '교통',
  OTHER: '기타'
};

const categoryColors = {
  NOISE: 'bg-red-50 text-red-700 border-red-200',
  TRASH: 'bg-teal-50 text-teal-700 border-teal-200',
  FACILITY: 'bg-blue-50 text-blue-700 border-blue-200',
  TRAFFIC: 'bg-green-50 text-green-700 border-green-200',
  OTHER: 'bg-yellow-50 text-yellow-700 border-yellow-200'
};

const statusLabels = {
  OPEN: '접수됨',
  IN_PROGRESS: '처리중',
  RESOLVED: '해결됨'
};

const statusColors = {
  OPEN: 'bg-red-100 text-red-800 border-red-200',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  RESOLVED: 'bg-green-100 text-green-800 border-green-200'
};

export const ReportCard = React.forwardRef<HTMLDivElement, ReportCardProps>(
  ({ 
    id,
    title,
    description,
    category,
    status,
    imageUrl,
    address,
    location,
    voteCount = 0,
    commentCount = 0,
    createdAt,
    size = 'compact',
    onClick,
    className,
    ...otherProps 
  }, ref) => {
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const sizeStyles = {
      compact: {
        minHeight: 'min-h-[280px]',
        padding: 'p-4 md:p-6',
        titleSize: 'text-base md:text-lg',
        descriptionSize: 'text-sm',
        imageHeight: 'h-32 md:h-40',
      },
      medium: {
        minHeight: 'min-h-[320px]',
        padding: 'p-6',
        titleSize: 'text-lg md:text-xl',
        descriptionSize: 'text-base',
        imageHeight: 'h-40 md:h-48',
      },
    };

    const currentSize = sizeStyles[size] || sizeStyles.compact;

    const baseStyles = [
      'bg-[rgb(var(--primary-white))]',
      'rounded-[var(--radius-card)]',
      'shadow-sm',
      'border-2',
      'border-gray-300',
      'transition-all',
      'duration-[var(--transition-medium)]',
      'cursor-pointer',
      'transform',
      'hover:shadow-lg',
      'hover:border-[rgb(var(--primary-blue))]',
      'hover:-translate-y-1',
      'active:scale-95',
      'flex',
      'flex-col',
      currentSize.minHeight,
      currentSize.padding,
    ];

    // DOM에 전달할 안전한 props만 선택 (존재하는 속성들만)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { ...safeProps } = otherProps || {};

    return (
      <div
        className={clsx(baseStyles, className)}
        onClick={onClick}
        ref={ref}
        {...safeProps}
      >
        {/* Header: Title and Status */}
        <div className="flex justify-between items-start mb-3 md:mb-4">
          <h3 className={clsx(
            'font-bold',
            '',
            'line-clamp-2',
            'leading-tight',
            'flex-1',
            'pr-2',
            currentSize.titleSize
          )}>
            {title}
          </h3>
          <span className={clsx(
            'px-2 md:px-3',
            'py-1',
            'rounded-full',
            'text-xs',
            'font-semibold',
            'flex-shrink-0',
            statusColors[status]
          )}>
            {statusLabels[status]}
          </span>
        </div>
        
        {/* Description */}
        <p 
          className={clsx(
            'text-[rgba(var(--primary-dark-brown),_0.8)]',
            imageUrl ? 'mb-3 md:mb-4' : 'mb-2 md:mb-3',
            'leading-relaxed',
            'flex-1',
            currentSize.descriptionSize
          )}
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {description}
        </p>
        
        {/* Image */}
        {imageUrl && (
          <div className="mb-3 md:mb-4 relative overflow-hidden rounded-lg border border-gray-300">
            <Image
              src={imageUrl} 
              alt="제보 이미지" 
              width={400}
              height={size === 'compact' ? 160 : 192}
              className={clsx('w-full object-cover', currentSize.imageHeight)}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={false}
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = `<img src="${imageUrl}" alt="제보 이미지" class="w-full ${currentSize.imageHeight} object-cover" />`;
                }
              }}
            />
          </div>
        )}
        
        {/* Footer: Always at bottom */}
        <div className={clsx('mt-auto', imageUrl ? '' : 'mt-4')}>
          {/* Category, Vote, Comment, Date */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center text-sm gap-2 md:gap-0">
            <div className="flex items-center space-x-2 md:space-x-4">
              <span className={clsx(
                'px-2 md:px-3',
                'py-1',
                'rounded-full',
                'font-medium',
                'border',
                'text-xs md:text-sm',
                categoryColors[category]
              )}>
                {categoryLabels[category]}
              </span>
              <div className="flex items-center space-x-2 md:space-x-3 text-[rgba(var(--primary-dark-brown),_0.7)]">
                <span className="flex items-center space-x-1 touch-manipulation">
                  <ThumbsUp className="h-4 w-4" />
                  <span className="font-medium">{voteCount}</span>
                </span>
                <span className="flex items-center space-x-1 touch-manipulation">
                  <MessageCircle className="h-4 w-4" />
                  <span className="font-medium">{commentCount}</span>
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-1 text-[rgba(var(--primary-dark-brown),_0.6)] font-medium text-xs md:text-sm">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(createdAt)}</span>
            </div>
          </div>

          {/* Address */}
          {(address || location) && (
            <div className={clsx(
              imageUrl ? 'mt-2 md:mt-3 pt-2 md:pt-3' : 'mt-2 pt-2',
              'border-t border-gray-200'
            )}>
              <div className="flex items-start">
                <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-[rgb(var(--primary-blue))]" />
                <div className="flex-1 min-w-0">
                  <span className="text-[rgba(var(--primary-dark-brown),_0.7)] text-xs md:text-sm truncate">
                    {address ? formatToAdministrativeAddress(address) : `위도 ${location?.lat.toFixed(4)}, 경도 ${location?.lng.toFixed(4)}`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

ReportCard.displayName = 'ReportCard';