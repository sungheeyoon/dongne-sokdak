import { Report, ReportCategory, ReportStatus } from '../../types'
import { createApiUrl, authenticatedRequest, apiRequest } from './config'

export interface CreateReportData {
  title: string
  description: string
  imageUrl?: string
  location: { lat: number; lng: number }
  address?: string
  category: ReportCategory
}

export interface UpdateReportData {
  title?: string
  description?: string
  imageUrl?: string
  category?: ReportCategory
  status?: ReportStatus
}

export interface ReportsFilter {
  category?: ReportCategory
  status?: ReportStatus
  userId?: string  // 사용자별 제보 조회 추가
  search?: string  // 검색 기능 추가
  limit?: number
  offset?: number
}

// 제보 생성 (인증 포함)
export const createReport = async (data: CreateReportData): Promise<Report> => {
  console.log('📝 Creating report with data:', data)

  const requestData = {
    title: data.title,
    description: data.description,
    image_url: data.imageUrl,
    location: data.location,
    address: data.address,
    category: data.category
  }

  const response = await authenticatedRequest(
    createApiUrl('/reports/'), // 슬래시 추가!
    {
      method: 'POST',
      body: JSON.stringify(requestData)
    }
  )

  return transformReportData(response)
}

// 제보 목록 조회
export const getReports = async (filter: ReportsFilter = {}): Promise<Report[]> => {
  const params = new URLSearchParams()

  if (filter.limit) params.append('limit', filter.limit.toString())
  if (filter.category) params.append('category', filter.category)
  if (filter.status) params.append('status', filter.status)
  if (filter.userId) params.append('user_id', filter.userId)
  if (filter.search) params.append('search', filter.search)

  const url = createApiUrl('/reports/') + (params.toString() ? `?${params.toString()}` : '') // 슬래시 추가!
  console.log('🔗 Request URL:', url)

  const response = await apiRequest(url)
  console.log('📊 Response data:', response)

  return (response as any[]).map(transformReportData)
}

// 데이터 변환 헬퍼 함수
function transformReportData(report: any): Report {
  return {
    id: report.id,
    userId: report.user_id,
    title: report.title,
    description: report.description,
    imageUrl: report.image_url,
    location: report.location || { lat: 0, lng: 0 },
    address: report.address,
    category: report.category,
    status: report.status,
    createdAt: report.created_at,
    updatedAt: report.updated_at,
    voteCount: report.vote_count || 0,
    commentCount: report.comment_count || 0,
    userVoted: report.user_voted || false
  }
}
// 특정 제보 조회
export const getReport = async (id: string): Promise<Report> => {
  console.log('🔍 Getting report:', id)

  const response = await apiRequest(createApiUrl(`/reports/${id}/`))
  console.log('📄 Report data:', response)

  return transformReportData(response)
}

// 제보 삭제
export const deleteReport = async (id: string): Promise<void> => {
  console.log('🗑️ Deleting report:', id)

  await authenticatedRequest(
    createApiUrl(`/reports/${id}/`),
    { method: 'DELETE' }
  )

  console.log('✅ Report deleted successfully')
}
// 제보 수정 (인증 필요)
export const updateReport = async (id: string, data: UpdateReportData): Promise<Report> => {
  console.log('✏️ Updating report:', id, data)

  const requestData = {
    title: data.title,
    description: data.description,
    image_url: data.imageUrl,
    category: data.category,
    status: data.status
  }

  const response = await authenticatedRequest(
    createApiUrl(`/reports/${id}`),
    {
      method: 'PUT',
      body: JSON.stringify(requestData)
    }
  )

  console.log('✅ Report updated successfully:', response)
  return transformReportData(response)
}

// 맵 영역 기준 제보 조회 (새로운 방식)
export const getReportsInBounds = async (params: {
  north: number
  south: number
  east: number
  west: number
  category?: ReportCategory
  search?: string
  limit?: number
}): Promise<Report[]> => {
  const searchParams = new URLSearchParams()

  searchParams.append('north', params.north.toString())
  searchParams.append('south', params.south.toString())
  searchParams.append('east', params.east.toString())
  searchParams.append('west', params.west.toString())
  if (params.category) searchParams.append('category', params.category)
  if (params.search) searchParams.append('search', params.search)
  if (params.limit) searchParams.append('limit', params.limit.toString())

  const url = createApiUrl(`/reports/bounds?${searchParams.toString()}`)
  console.log('🗺️ Map bounds reports request:', url)

  const response = await apiRequest(url)
  console.log('📊 Map bounds reports response:', (response as any[]).length, 'reports')

  return (response as any[]).map(transformReportData)
}

// 근처 제보 조회 (기존 방식 - 호환성 유지)
export const getNearbyReports = async (params: {
  lat: number
  lng: number
  radius_km?: number
  category?: ReportCategory
  limit?: number
}): Promise<Report[]> => {
  const searchParams = new URLSearchParams()

  searchParams.append('lat', params.lat.toString())
  searchParams.append('lng', params.lng.toString())
  if (params.radius_km) searchParams.append('radius_km', params.radius_km.toString())
  if (params.category) searchParams.append('category', params.category)
  if (params.limit) searchParams.append('limit', params.limit.toString())

  const url = createApiUrl(`/reports/nearby?${searchParams.toString()}`)
  console.log('📍 Nearby reports request:', url)

  const response = await apiRequest(url)
  console.log('📊 Nearby reports response:', (response as any[]).length, 'reports')

  return (response as any[]).map(transformReportData)
}

// 내 동네 기준 제보 조회 (새로 추가된 API)
export const getMyNeighborhoodReports = async (params?: {
  radius_km?: number
  category?: ReportCategory
  limit?: number
}): Promise<Report[]> => {
  const searchParams = new URLSearchParams()

  if (params?.radius_km) searchParams.append('radius_km', params.radius_km.toString())
  if (params?.category) searchParams.append('category', params.category)
  if (params?.limit) searchParams.append('limit', params.limit.toString())

  const url = createApiUrl(`/reports/my-neighborhood?${searchParams.toString()}`)
  console.log('🏠 My neighborhood reports request:', url)

  const response = await authenticatedRequest(url)
  console.log('📊 My neighborhood reports response:', (response as any[]).length, 'reports')

  return (response as any[]).map(transformReportData)
}
