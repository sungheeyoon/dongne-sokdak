'use client'

import { useEffect } from 'react'
import { ThumbsUp } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useAuthViewModel } from '@/features/auth/presentation/hooks/useAuthViewModel'
import { useUIStore } from '@/shared/stores/useUIStore'
import { useVotesViewModel } from '../hooks/useVotesViewModel'
import { cn } from '@/lib/utils'

interface VoteButtonProps {
    reportId: string
    initialCount?: number
}

/** 도메인 오류 메시지를 주민이 읽을 문장으로 옮긴다 — 내부 문구를 그대로 노출하지 않는다. */
function toUserMessage(message: string): string {
    if (message.includes('이미 이 제보에 공감했습니다')) return '이미 공감한 제보예요'
    if (message.includes('자신의 제보에는 공감할 수 없습니다')) return '내가 쓴 제보에는 공감할 수 없어요'
    return '공감을 처리하지 못했어요. 잠시 후 다시 시도해주세요'
}

export default function VoteButton({ reportId, initialCount = 0 }: VoteButtonProps) {
    const { user } = useAuthViewModel()
    const { openAuthModal } = useUIStore()

    const {
        voteCount,
        userVoted,
        toggleVote,
        isToggling,
        toggleError
    } = useVotesViewModel({ reportId, userId: user?.id, initialCount })

    // 렌더 중에 알림을 띄우지 않는다 — 부수효과는 커밋 이후에만 일어나야 한다.
    useEffect(() => {
        if (!toggleError) return
        toast.error(toUserMessage(toggleError.message || ''), { id: `vote-error-${reportId}` })
    }, [toggleError, reportId])

    const handleVote = () => {
        if (!user) {
            openAuthModal('signin')
            toast('로그인하면 공감할 수 있어요.', { id: 'vote-requires-login' })
            return
        }
        toggleVote()
    }

    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={handleVote}
                disabled={isToggling}
                aria-pressed={userVoted}
                aria-label={userVoted ? `공감 취소, 현재 공감 ${voteCount}` : `공감하기, 현재 공감 ${voteCount}`}
                className={cn(
                    'inline-flex min-h-11 items-center gap-2 rounded-full border px-4 type-label transition-colors',
                    'disabled:pointer-events-none disabled:bg-surface-muted disabled:text-muted-foreground',
                    userVoted
                        ? 'border-brand bg-brand-subtle text-brand'
                        : 'border-border-strong bg-surface text-foreground hover:bg-surface-muted'
                )}
            >
                <ThumbsUp className="h-4 w-4" aria-hidden="true" />
                공감 {voteCount}
            </button>

            {/* 상태 변화를 텍스트로도 전달한다 (UI_V2_CONTRACT.md §8) */}
            <span aria-live="polite" className="sr-only">
                {isToggling ? '공감을 처리하는 중이에요' : `공감 ${voteCount}${userVoted ? ', 공감함' : ''}`}
            </span>
        </div>
    )
}
