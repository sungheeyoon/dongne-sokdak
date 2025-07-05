// 테스트용 더미 데이터 생성기
import { Report, ReportCategory, ReportStatus } from '@/types'

export const generateDummyReport = (override: Partial<Report> = {}): Report => {
  const categories = Object.values(ReportCategory)
  const statuses = Object.values(ReportStatus)
  
  const randomCategory = categories[Math.floor(Math.random() * categories.length)]
  const randomStatus = statuses[Math.floor(Math.random() * statuses.length)]
  
  return {
    id: `dummy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId: 'test-user',
    title: `테스트 제보 ${Math.floor(Math.random() * 100)}`,
    description: '이것은 테스트용 더미 데이터입니다. 실제 제보 내용이 아닙니다.',
    imageUrl: null, // 실제 업로드된 이미지만 표시
    location: {
      lat: 37.5665 + (Math.random() - 0.5) * 0.1, // 서울 시청 근처 랜덤
      lng: 126.9780 + (Math.random() - 0.5) * 0.1
    },
    address: '서울시 중구 테스트동',
    category: randomCategory,
    status: randomStatus,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    voteCount: Math.floor(Math.random() * 50),
    commentCount: Math.floor(Math.random() * 20),
    userVoted: Math.random() > 0.5,
    ...override
  }
}

export const generateDummyReports = (count: number = 10): Report[] => {
  return Array.from({ length: count }, () => generateDummyReport())
}
