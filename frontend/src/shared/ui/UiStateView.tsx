'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button as UiButton } from '@/shared/ui/UiButton'

interface StateAction {
    label: string
    onClick: () => void
}

interface UiStateViewProps {
    icon?: React.ReactNode
    title: string
    description?: React.ReactNode
    primaryAction?: StateAction
    secondaryAction?: StateAction
    className?: string
}

/**
 * 빈 상태 (UI_V2_CONTRACT.md §4.6).
 *
 * 빈 상태는 오류가 아니다 — danger 색을 쓰지 않는다. 제목은 무슨 일이
 * 일어났는지, 설명은 다음에 무엇을 할 수 있는지 말한다.
 */
export function UiEmptyState({
    icon,
    title,
    description,
    primaryAction,
    secondaryAction,
    className,
}: UiStateViewProps) {
    return (
        <div
            className={cn(
                'flex flex-col items-center rounded-lg border border-dashed border-border bg-surface px-6 py-10 text-center',
                className
            )}
        >
            {icon && <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted text-muted-foreground">{icon}</div>}
            <h3 className="type-h3">{title}</h3>
            {description && <p className="mt-2 max-w-sm type-body-sm text-muted-foreground">{description}</p>}
            {(primaryAction || secondaryAction) && (
                <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
                    {primaryAction && (
                        <UiButton className="w-full" onClick={primaryAction.onClick}>
                            {primaryAction.label}
                        </UiButton>
                    )}
                    {secondaryAction && (
                        <UiButton variant="outline" className="w-full" onClick={secondaryAction.onClick}>
                            {secondaryAction.label}
                        </UiButton>
                    )}
                </div>
            )}
        </div>
    )
}

/**
 * 오류 상태 (UI_V2_CONTRACT.md §4.7).
 *
 * 내부 기술 용어를 노출하지 않고, 복구 행동을 항상 함께 둔다.
 * 오류 범위는 실패한 영역에만 적용한다 — 페이지 전체를 교체하지 않는다.
 */
export function UiErrorState({
    icon,
    title,
    description,
    primaryAction,
    secondaryAction,
    className,
}: UiStateViewProps) {
    return (
        <div
            role="alert"
            className={cn(
                'flex flex-col items-center rounded-lg border border-border bg-surface px-6 py-10 text-center',
                className
            )}
        >
            {icon && <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-danger/10 text-danger">{icon}</div>}
            <h3 className="type-h3 text-danger">{title}</h3>
            {description && <p className="mt-2 max-w-sm type-body-sm text-muted-foreground">{description}</p>}
            {(primaryAction || secondaryAction) && (
                <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
                    {primaryAction && (
                        <UiButton className="w-full" onClick={primaryAction.onClick}>
                            {primaryAction.label}
                        </UiButton>
                    )}
                    {secondaryAction && (
                        <UiButton variant="outline" className="w-full" onClick={secondaryAction.onClick}>
                            {secondaryAction.label}
                        </UiButton>
                    )}
                </div>
            )}
        </div>
    )
}
