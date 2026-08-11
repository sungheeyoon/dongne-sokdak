'use client'

import { ReportStatus } from '@/types'
import { cn } from '@/lib/utils'

export const STATUS_FILTERS = [
    { value: 'all', label: '전체' },
    { value: ReportStatus.OPEN, label: '접수됨' },
    { value: ReportStatus.IN_PROGRESS, label: '처리중' },
    { value: ReportStatus.RESOLVED, label: '해결됨' },
] as const

interface StatusFilterChipsProps {
    value: string
    onChange: (value: string) => void
    className?: string
}

/**
 * 제보 상태 필터 칩 (UI_V2_CONTRACT.md §4.3).
 *
 * 카테고리 필터와 같은 규칙을 따른다 — 단일 선택 radiogroup,
 * 모바일에서 줄바꿈 대신 가로 스크롤.
 */
export default function StatusFilterChips({ value, onChange, className }: StatusFilterChipsProps) {
    return (
        <div
            role="radiogroup"
            aria-label="상태 필터"
            className={cn(
                'flex gap-2 overflow-x-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                className
            )}
        >
            {STATUS_FILTERS.map((option) => {
                const selected = value === option.value

                return (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => {
                            if (!selected) onChange(option.value)
                        }}
                        className={cn(
                            'min-h-11 shrink-0 rounded-full border px-4 type-label transition-colors',
                            selected
                                ? 'border-brand bg-brand-subtle text-brand'
                                : 'border-border bg-surface text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {option.label}
                    </button>
                )
            })}
        </div>
    )
}
