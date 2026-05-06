// API 기본 설정
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

// API 엔드포인트 생성 헬퍼
export const createApiUrl = (endpoint: string) => {
  // 이미 전체 URL인 경우 그대로 반환
  if (endpoint.startsWith('http')) return endpoint
  
  // API_BASE_URL이 /api/v1을 포함하고 있는지 확인
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  
  return `${baseUrl}${path}`
}

// HTTP 요청 헬퍼 함수
export const apiRequest = async (
  url: string, 
  options: RequestInit = {}
): Promise<unknown> => {
  // 개발 환경에서만 로그 출력
  if (process.env.NODE_ENV === 'development') {
    if (process.env.NODE_ENV === 'development') console.log('🔗 API Request:', url)
  }
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (process.env.NODE_ENV === 'development') {
      if (process.env.NODE_ENV === 'development') console.log('📡 API Response:', response.status, response.statusText)
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('❌ API Error:', errorData)
      
      // 401 오류는 인증 문제이므로 특별히 처리
      if (response.status === 401) {
        throw new Error('로그인이 필요합니다')
      }
      
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
    }

    if (response.status === 204) {
      return null
    }

    const data = await response.json()
    return data
  } catch (error) {
    // 네트워크 오류나 기타 예외 처리
    if (error instanceof Error) {
      console.error('❌ API Request Failed:', error.message)
      
      // 연결 실패 에러 처리
      if (error.message.includes('fetch') || error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        console.error('🔌 서버 연결 실패 - 백엔드 서버가 실행되고 있는지 확인하세요')
        throw new Error('서버에 연결할 수 없습니다. 백엔드 서버가 실행되고 있는지 확인해주세요.')
      }
      
      throw error
    }
    console.error('❌ Unknown API Error:', error)
    throw new Error('API 요청 중 오류가 발생했습니다')
  }
}

// 인증 토큰이 필요한 요청을 위한 헬퍼
export const authenticatedRequest = async (
  url: string,
  options: RequestInit = {}
) => {
  try {
    // Supabase에서 토큰 가져오기
    const { supabase } = await import('../supabase')
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (process.env.NODE_ENV === 'development') {
      if (process.env.NODE_ENV === 'development') console.log('🔐 Auth Session:', session ? 'Found' : 'Not found')
    }
    
    if (error) {
      console.error('🔐 Session Error:', error)
      throw new Error('인증 세션을 가져올 수 없습니다')
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    }

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    } else {
      // No access token found
      throw new Error('로그인이 필요합니다')
    }

    return apiRequest(url, {
      ...options,
      headers,
    })
  } catch (error) {
    console.error('❌ Authenticated Request Failed:', error)
    throw error
  }
}
