'use client'

import { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'
import { useAuthViewModel } from '../hooks/useAuthViewModel'
import { useUIStore } from '@/shared/stores/useUIStore'
import { UiEmptyState } from '@/shared/ui'

interface AuthRequiredGateProps {
    /** 로그인이 왜 필요한지 — 화면마다 다르다 */
    title: string
    description: string
    /** 인증을 복구하는 동안 보여줄, 이 화면 구조를 반영한 스켈레톤 */
    skeleton: ReactNode
    children: ReactNode
}

/**
 * 인증 상태에 따라 화면을 가르는 게이트 (UI_V2_CONTRACT.md §8).
 *
 * 인증 초기화가 끝나기 전에는 익명 화면도 오류 화면도 보여주지 않는다 —
 * 순간 노출되는 "로그인이 필요합니다"는 이미 로그인한 주민에게 거짓말이다.
 *
 * 로그인은 다이얼로그로 열린다. 다른 화면으로 보내지 않으므로 성공하면
 * 주민은 원래 보려던 화면에 그대로 남는다.
 */
export default function AuthRequiredGate({ title, description, skeleton, children }: AuthRequiredGateProps) {
    const { user, initialized } = useAuthViewModel()
    const { openAuthModal } = useUIStore()
    const router = useRouter()

    if (!initialized) {
        return <>{skeleton}</>
    }

    if (!user) {
        return (
            <UiEmptyState
                icon={<Lock className="h-7 w-7" aria-hidden="true" />}
                title={title}
                description={description}
                primaryAction={{ label: '로그인', onClick: () => openAuthModal('signin') }}
                secondaryAction={{ label: '홈으로', onClick: () => router.push('/') }}
            />
        )
    }

    return <>{children}</>
}
