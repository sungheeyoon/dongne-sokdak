'use client'

import { Map, List } from 'lucide-react'
import { cn } from '@/lib/utils'

export type HomeViewMode = 'feed' | 'map'

interface HomeViewModeTabsProps {
    mode: HomeViewMode
    onModeChange: (mode: HomeViewMode) => void
    className?: string
}

const TABS: { value: HomeViewMode; label: string; Icon: typeof Map }[] = [
    { value: 'feed', label: '제보 피드', Icon: List },
    { value: 'map', label: '지도', Icon: Map },
]

/**
 * 모바일 홈의 피드/지도 전환 (UI_V2_CONTRACT.md §7.3).
 *
 * 전환은 표현만 바꾼다 — 영역 조회를 실행하지 않는다 (ADR-0007).
 */
export default function HomeViewModeTabs({ mode, onModeChange, className }: HomeViewModeTabsProps) {
    return (
        <div
            role="tablist"
            aria-label="홈 보기 방식"
            className={cn('flex gap-1 rounded-full bg-surface-muted p-1', className)}
        >
            {TABS.map(({ value, label, Icon }) => {
                const selected = mode === value

                return (
                    <button
                        key={value}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        tabIndex={selected ? 0 : -1}
                        onClick={() => {
                            if (!selected) onModeChange(value)
                        }}
                        className={cn(
                            'flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 type-label transition-colors',
                            selected
                                ? 'bg-surface text-brand shadow-e1'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        {label}
                    </button>
                )
            })}
        </div>
    )
}
