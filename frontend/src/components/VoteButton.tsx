'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addVote, removeVote, checkUserVote, getVoteCount } from '@/lib/api/votes'
import { useAuth } from '@/hooks/useAuth'

interface VoteButtonProps {
  reportId: string
  initialCount?: number
}

export default function VoteButton({ reportId, initialCount = 0 }: VoteButtonProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: userVoted = false } = useQuery({
    queryKey: ['vote', reportId, user?.id],
    queryFn: () => checkUserVote(reportId),
    enabled: !!user
  })

  const { data: voteCount = initialCount } = useQuery({
    queryKey: ['voteCount', reportId],
    queryFn: () => getVoteCount(reportId),
    initialData: initialCount
  })

  const toggleVoteMutation = useMutation({
    mutationFn: async () => {
      console.log('🔄 토글 시작 - 현재 상태:', { userVoted, reportId })
      
      if (userVoted) {
        console.log('👎 공감 취소 요청')
        await removeVote(reportId)
      } else {
        console.log('👍 공감 추가 요청')
        await addVote(reportId)
      }
    },
    onSuccess: () => {
      console.log('✅ 공감 토글 성공')
      queryClient.invalidateQueries({ queryKey: ['vote', reportId] })
      queryClient.invalidateQueries({ queryKey: ['voteCount', reportId] })
      queryClient.invalidateQueries({ queryKey: ['report', reportId] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
    onError: (error: any) => {
      console.error('❌ 공감 토글 실패:', error)
      const errorMessage = error.message || '알 수 없는 오류가 발생했습니다.'
      
      // 일반적인 오류 메시지들을 사용자 친화적으로 변환
      if (errorMessage.includes('이미 이 제보에 공감했습니다')) {
        alert('이미 공감한 제보입니다.')
      } else if (errorMessage.includes('자신의 제보에는 공감할 수 없습니다')) {
        alert('자신의 제보에는 공감할 수 없습니다.')
      } else {
        alert(`공감 처리 중 오류가 발생했습니다: ${errorMessage}`)
      }
    }
  })

  const handleVote = () => {
    if (!user) {
      alert('로그인 후 공감할 수 있습니다.')
      return
    }
    toggleVoteMutation.mutate()
  }

  return (
    <button
      onClick={handleVote}
      disabled={toggleVoteMutation.isPending}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 ${
        userVoted
          ? 'bg-blue-100 text-blue-800 border-2 border-blue-300 hover:bg-blue-200'
          : 'bg-gray-100 text-gray-700 border-2 border-gray-300 hover:bg-gray-200'
      }`}
    >
      <span className={`text-lg ${userVoted ? '👍' : '👍'}`}>
        {userVoted ? '👍' : '👍'}
      </span>
      <span>
        공감 {voteCount}
      </span>
      {toggleVoteMutation.isPending && (
        <span className="text-xs">처리중...</span>
      )}
    </button>
  )
}
