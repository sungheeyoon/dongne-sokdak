'use client';

import React from 'react';
import { MapPin, ThumbsUp, MessageCircle, Calendar } from 'lucide-react';
import Image from 'next/image';
import { formatToAdministrativeAddress } from '@/lib/utils/addressUtils';
import { UiCard as Card, UiCardContent as CardContent, UiCardFooter as CardFooter, UiCardHeader as CardHeader, UiBadge as Badge } from '@/components/ui';
import { cn } from '@/lib/utils';

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
  NOISE: '소음', TRASH: '쓰레기', FACILITY: '시설물', TRAFFIC: '교통', OTHER: '기타'
};

const statusLabels = {
  OPEN: '접수됨', IN_PROGRESS: '처리중', RESOLVED: '해결됨'
};

const statusVariants = {
  OPEN: 'destructive',
  IN_PROGRESS: 'secondary',
  RESOLVED: 'default' // Usually green/success, but using primary for now
} as const;

export const ReportCard = React.forwardRef<HTMLDivElement, ReportCardProps>(
  ({ 
    id, title, description, category, status, imageUrl, address, location,
    voteCount = 0, commentCount = 0, createdAt, size = 'compact', onClick, className
  }, ref) => {
    
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('ko-KR', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    };

    return (
      <Card 
        ref={ref}
        onClick={onClick}
        className={cn(
          "group overflow-hidden transition-all hover:shadow-md cursor-pointer border-muted/60",
          className
        )}
      >
        <CardHeader className="p-4 pb-2 space-y-0">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-bold text-base md:text-lg line-clamp-2 leading-snug flex-1 group-hover:text-primary transition-colors">
              {title}
            </h3>
            <div className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
              status === 'OPEN' ? "bg-red-100 text-red-700" : 
              status === 'IN_PROGRESS' ? "bg-amber-100 text-amber-700" : 
              "bg-emerald-100 text-emerald-700"
            )}>
              {statusLabels[status]}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-0">
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
            {description}
          </p>
          
          {imageUrl && (
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted mb-3">
              <Image
                src={imageUrl} 
                alt={title} 
                fill
                className="object-cover transition-transform group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground/80 mt-2 font-medium">
            <span className="flex items-center gap-1">
              <ThumbsUp className="h-3.5 w-3.5" />
              {voteCount}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              {commentCount}
            </span>
            <span className="flex items-center gap-1 ml-auto">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(createdAt)}
            </span>
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0 border-t bg-muted/20 mt-2">
          <div className="flex items-center justify-between w-full pt-3">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-xs text-muted-foreground truncate font-medium">
                {address ? formatToAdministrativeAddress(address) : '위치 정보 없음'}
              </span>
            </div>
            <span className="text-[10px] font-bold text-primary/70 uppercase ml-2 shrink-0">
              #{categoryLabels[category]}
            </span>
          </div>
        </CardFooter>
      </Card>
    );
  }
);

ReportCard.displayName = 'ReportCard';