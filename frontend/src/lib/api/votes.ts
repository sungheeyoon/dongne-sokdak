import { createApiUrl, authenticatedRequest, apiRequest } from './config'

// 공감 추가 (인증 필요)
export const addVote = async (reportId: string): Promise<void> => {
  console.log('👍 Adding vote for report:', reportId)
  
  await authenticatedRequest(
    createApiUrl('/votes/'),
    {
      method: 'POST',
      body: JSON.stringify({ report_id: reportId })
    }
  )
  
  console.log('✅ Vote added successfully')
}

// 공감 취소 (인증 필요)
export const removeVote = async (reportId: string): Promise<void> => {
  console.log('👎 Removing vote for report:', reportId)
  
  await authenticatedRequest(
    createApiUrl(`/votes/report/${reportId}`), // 끝 슬래시 제거
    { method: 'DELETE' }
  )
  
  console.log('✅ Vote removed successfully')
}

// 공감 여부 확인 (인증 필요)
export const checkUserVote = async (reportId: string): Promise<boolean> => {
  try {
    const response = await authenticatedRequest(
      createApiUrl(`/votes/check/${reportId}`) // 끝 슬래시 제거
    )
    return response.voted || false
  } catch (error) {
    console.log('❌ Vote check failed:', error)
    return false
  }
}

// 제보별 공감 수 조회 (인증 불필요)
export const getVoteCount = async (reportId: string): Promise<number> => {
  try {
    const response = await apiRequest(
      createApiUrl(`/votes/count/${reportId}`) // 끝 슬래시 제거
    )
    return response.count || 0
  } catch (error) {
    console.log('❌ Vote count failed:', error)
    return 0
  }
}
