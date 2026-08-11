'use client'

import { ReportCategory } from '@/types'
import { cn } from '@/lib/utils'

export const CATEGORY_FILTERS = [
    { value: 'all', label: '전체' },
    { value: ReportCategory.NOISE, label: '소음' },
    { value: ReportCategory.TRASH, label: '쓰레기' },
    { value: ReportCategory.FACILITY, label: '시설물' },
    { value: ReportCategory.TRAFFIC, label: '교통' },
    { value: ReportCategory.OTHER, label: '기타' },
] as const

interface CategoryFilterChipsProps {
    value: string
    onChange: (value: string) => void
    className?: string
}

/**
 * 카테고리 필터 칩 (UI_V2_CONTRACT.md §4.3).
 *
 * 모바일에서 줄바꿈으로 고아 항목을 만들지 않고 가로 스크롤한다.
 * 단일 선택이므로 radiogroup으로 노출한다.
 */
export default function CategoryFilterChips({ value, onChange, className }: CategoryFilterChipsProps) {
    return (
        <div
            role="radiogroup"
            aria-label="카테고리 필터"
            className={cn(
                'flex gap-2 overflow-x-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                className
            )}
        >
            {CATEGORY_FILTERS.map((category) => {
                const selected = value === category.value

                return (
                    <button
                        key={category.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => {
                            if (!selected) onChange(category.value)
                        }}
                        className={cn(
                            'min-h-11 shrink-0 rounded-full border px-4 type-label transition-colors',
                            selected
                                ? 'border-brand bg-brand-subtle text-brand'
                                : 'border-border bg-surface text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {category.label}
                    </button>
                )
            })}
        </div>
    )
}
