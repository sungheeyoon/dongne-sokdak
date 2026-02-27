'use client'

import { ThumbsUp } from 'lucide-react';
import { useAuthViewModel } from '@/features/auth/presentation/hooks/useAuthViewModel'
import { useVotesViewModel } from '../hooks/useVotesViewModel'

interface VoteButtonProps {
    reportId: string
    initialCount?: number
}

export default function VoteButton({ reportId, initialCount = 0 }: VoteButtonProps) {
    const { user } = useAuthViewModel()

    const {
        voteCount,
        userVoted,
        toggleVote,
        isToggling,
        toggleError
    } = useVotesViewModel({ reportId, userId: user?.id, initialCount })

    const handleVote = () => {
        if (!user) {
            alert('로그인 후 공감할 수 있습니다.')
            return
        }
        toggleVote()
    }

    // Handle toggle errors gracefully
    if (toggleError) {
        const errorMessage = toggleError.message || '알 수 없는 오류가 발생했습니다.'
        if (errorMessage.includes('이미 이 제보에 공감했습니다')) {
            alert('이미 공감한 제보입니다.')
        } else if (errorMessage.includes('자신의 제보에는 공감할 수 없습니다')) {
            alert('자신의 제보에는 공감할 수 없습니다.')
        } else {
            alert(`공감 처리 중 오류가 발생했습니다: ${errorMessage}`)
        }
    }

    return (
        <button
            onClick={handleVote}
            disabled={isToggling}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 ${userVoted
                    ? 'bg-blue-100 text-blue-800 border-2 border-blue-300 hover:bg-blue-200'
                    : 'bg-gray-100 text-gray-700 border-2 border-gray-300 hover:bg-gray-200'
                }`}
        >
            <span className={`text-lg ${userVoted ? 'text-blue-800' : 'text-gray-700'}`}>
                <ThumbsUp width={20} height={20} />
            </span>
            <span>
                공감 {voteCount}
            </span>
            {isToggling && (
                <span className="text-xs">처리중...</span>
            )}
        </button>
    )
}
