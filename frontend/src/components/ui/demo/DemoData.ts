// 더미/데모 데이터 - UI 테스트용

import { Report, ReportCategory } from '@/types'

export const demoReports: Report[] = [
  {
    id: 'demo-1',
    title: '아파트 단지 내 소음 문제',
    description: '밤 늦은 시간까지 계속되는 공사 소음으로 인해 주민들이 불편을 겪고 있습니다. 특히 새벽 시간대에도 소음이 지속되어 수면에 방해가 됩니다.',
    category: ReportCategory.NOISE,
    location: { lat: 37.5665, lng: 126.9780 },
    address: '서울특별시 중구 명동1가',
    imageUrl: '/demo/noise-report.jpg',
    status: 'OPEN',
    voteCount: 15,
    commentCount: 8,
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    userId: 'demo-user-1'
  },
  {
    id: 'demo-2',
    title: '버스정류장 쓰레기 무단투기',
    description: '버스정류장 주변에 생활쓰레기가 무단으로 버려져 있어 환경이 매우 불쾌합니다. 특히 음식물 쓰레기로 인한 악취가 심각합니다.',
    category: ReportCategory.TRASH,
    location: { lat: 37.5651, lng: 126.9895 },
    address: '서울특별시 중구 명동2가',
    status: 'IN_PROGRESS',
    voteCount: 23,
    commentCount: 12,
    createdAt: '2024-01-14T14:20:00Z',
    updatedAt: '2024-01-14T14:20:00Z',
    userId: 'demo-user-2'
  },
  {
    id: 'demo-3',
    title: '가로등 고장으로 인한 안전 문제',
    description: '주요 통행로의 가로등이 며칠째 고장난 상태로 방치되어 있습니다. 밤에 지나다니기 위험하고, 특히 학생들의 통학에 문제가 됩니다.',
    category: ReportCategory.FACILITY,
    location: { lat: 37.5640, lng: 126.9810 },
    address: '서울특별시 중구 회현동1가',
    status: 'RESOLVED',
    voteCount: 31,
    commentCount: 18,
    createdAt: '2024-01-13T09:15:00Z',
    updatedAt: '2024-01-16T11:00:00Z',
    userId: 'demo-user-3',
    adminComment: '담당 부서에서 가로등 수리 완료했습니다. 신고해주셔서 감사합니다.'
  },
  {
    id: 'demo-4',
    title: '불법 주정차로 인한 교통 체증',
    description: '상가 앞 도로에 불법 주정차된 차량들로 인해 교통 흐름이 원활하지 않습니다. 출퇴근 시간에 특히 심각한 정체가 발생합니다.',
    category: ReportCategory.TRAFFIC,
    location: { lat: 37.5670, lng: 126.9850 },
    address: '서울특별시 중구 소공동',
    status: 'OPEN',
    voteCount: 42,
    commentCount: 25,
    createdAt: '2024-01-16T08:45:00Z',
    updatedAt: '2024-01-16T08:45:00Z',
    userId: 'demo-user-4'
  },
  {
    id: 'demo-5',
    title: '공원 내 운동기구 파손',
    description: '동네 공원의 운동기구가 파손되어 사용할 수 없는 상태입니다. 주민들이 자주 이용하는 시설이므로 빠른 수리가 필요합니다.',
    category: ReportCategory.OTHER,
    location: { lat: 37.5680, lng: 126.9770 },
    address: '서울특별시 중구 태평로1가',
    status: 'IN_PROGRESS',
    voteCount: 18,
    commentCount: 7,
    createdAt: '2024-01-12T16:30:00Z',
    updatedAt: '2024-01-15T10:20:00Z',
    userId: 'demo-user-5'
  }
]

export const demoUsers = [
  {
    id: 'demo-user-1',
    nickname: '명동주민',
    email: 'user1@demo.com',
    avatar_url: null,
    role: 'user'
  },
  {
    id: 'demo-user-2',
    nickname: '환경지킨이',
    email: 'user2@demo.com',
    avatar_url: null,
    role: 'user'
  },
  {
    id: 'demo-user-3',
    nickname: '안전지킴이',
    email: 'user3@demo.com',
    avatar_url: null,
    role: 'user'
  },
  {
    id: 'demo-user-4',
    nickname: '교통모니터',
    email: 'user4@demo.com',
    avatar_url: null,
    role: 'moderator'
  },
  {
    id: 'demo-user-5',
    nickname: '공원관리자',
    email: 'user5@demo.com',
    avatar_url: null,
    role: 'user'
  }
]

export const demoComments = [
  {
    id: 'demo-comment-1',
    reportId: 'demo-1',
    userId: 'demo-user-2',
    content: '저도 같은 문제로 고생하고 있습니다. 관할 부서에 신고했는데 아직 답변이 없네요.',
    createdAt: '2024-01-15T12:00:00Z'
  },
  {
    id: 'demo-comment-2',
    reportId: 'demo-1',
    userId: 'demo-user-3',
    content: '공사 시간을 제한하는 조례가 있을 텐데요. 구청에 문의해보시면 어떨까요?',
    createdAt: '2024-01-15T14:30:00Z'
  },
  {
    id: 'demo-comment-3',
    reportId: 'demo-2',
    userId: 'demo-user-1',
    content: '매일 지나다니는 길인데 정말 심각합니다. 빠른 조치 부탁드립니다.',
    createdAt: '2024-01-14T16:45:00Z'
  }
]

// 데모 그룹 데이터 (지도 마커용)
export const demoGroupedReports = [
  {
    id: 'group-1',
    reports: [demoReports[0]],
    location: { lat: 37.5665, lng: 126.9780 },
    address: '서울특별시 중구 명동1가',
    count: 1,
    primaryCategory: ReportCategory.NOISE
  },
  {
    id: 'group-2',
    reports: [demoReports[1], demoReports[4]],
    location: { lat: 37.5651, lng: 126.9895 },
    address: '서울특별시 중구 명동2가',
    count: 2,
    primaryCategory: ReportCategory.TRASH
  },
  {
    id: 'group-3',
    reports: [demoReports[2]],
    location: { lat: 37.5640, lng: 126.9810 },
    address: '서울특별시 중구 회현동1가',
    count: 1,
    primaryCategory: ReportCategory.FACILITY
  },
  {
    id: 'group-4',
    reports: [demoReports[3]],
    location: { lat: 37.5670, lng: 126.9850 },
    address: '서울특별시 중구 소공동',
    count: 1,
    primaryCategory: ReportCategory.TRAFFIC
  }
]