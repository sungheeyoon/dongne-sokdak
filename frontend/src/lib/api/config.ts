// API 기본 설정
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
export const API_V1_PREFIX = '/api/v1'

// API 엔드포인트 생성 헬퍼
export const createApiUrl = (endpoint: string) => {
  return `${API_BASE_URL}${API_V1_PREFIX}${endpoint}`
}

// HTTP 요청 헬퍼 함수
export const apiRequest = async (
  url: string, 
  options: RequestInit = {}
): Promise<any> => {
  console.log('🔗 API Request:', url, options)
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    console.log('📡 API Response:', response.status, response.statusText)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('❌ API Error:', errorData)
      
      // 401 오류는 인증 문제이므로 특별히 처리
      if (response.status === 401) {
        console.warn('⚠️ 인증이 필요한 요청입니다.')
        throw new Error('로그인이 필요합니다')
      }
      
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
    }

    if (response.status === 204) {
      return null
    }

    const data = await response.json()
    console.log('✅ API Data:', data)
    return data
  } catch (error) {
    // 네트워크 오류나 기타 예외 처리
    if (error instanceof Error) {
      console.error('❌ API Request Failed:', error.message)
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
    
    console.log('🔐 Auth Session:', session ? 'Found' : 'Not found')
    
    if (error) {
      console.log('🔐 Session Error:', error)
      throw new Error('인증 세션을 가져올 수 없습니다')
    }
    
    if (session?.access_token) {
      console.log('🎫 Access Token (first 50 chars):', session.access_token.substring(0, 50) + '...')
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    }

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
      console.log('🔑 Authorization Header Added')
    } else {
      console.warn('⚠️ No access token found!')
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
