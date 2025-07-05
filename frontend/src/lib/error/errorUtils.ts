// 에러 처리 유틸리티

export interface AppError {
  type: 'network' | 'auth' | 'validation' | 'server' | 'unknown'
  message: string
  code?: string | number
  details?: any
}

// API 에러를 사용자 친화적인 메시지로 변환
export function formatApiError(error: any): AppError {
  // 네트워크 에러
  if (!error.response && error.code) {
    return {
      type: 'network',
      message: '인터넷 연결을 확인해주세요.',
      code: error.code
    }
  }

  // HTTP 상태 코드별 처리
  if (error.response) {
    const status = error.response.status
    const data = error.response.data || {}

    switch (status) {
      case 401:
        return {
          type: 'auth',
          message: '로그인이 필요합니다. 다시 로그인해주세요.',
          code: status
        }
      case 403:
        return {
          type: 'auth',
          message: '접근 권한이 없습니다.',
          code: status
        }
      case 404:
        return {
          type: 'server',
          message: '요청한 데이터를 찾을 수 없습니다.',
          code: status
        }
      case 422:
        return {
          type: 'validation',
          message: data.detail || '입력값을 확인해주세요.',
          code: status,
          details: data
        }
      case 500:
        return {
          type: 'server',
          message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          code: status
        }
      default:
        return {
          type: 'server',
          message: data.detail || `오류가 발생했습니다. (${status})`,
          code: status
        }
    }
  }

  // 기타 에러
  return {
    type: 'unknown',
    message: error.message || '알 수 없는 오류가 발생했습니다.',
    details: error
  }
}

// 위치 관련 에러 처리
export function formatLocationError(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return '위치 접근 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.'
    case error.POSITION_UNAVAILABLE:
      return '현재 위치를 확인할 수 없습니다. GPS가 켜져 있는지 확인해주세요.'
    case error.TIMEOUT:
      return '위치 정보 요청 시간이 초과되었습니다. 다시 시도해주세요.'
    default:
      return '위치 정보를 가져오는 중 오류가 발생했습니다.'
  }
}

// 로그 함수 (개발 환경에서만)
export function logError(error: AppError, context?: string) {
  if (process.env.NODE_ENV === 'development') {
    console.group(`🚨 Error${context ? ` in ${context}` : ''}`)
    console.error('Type:', error.type)
    console.error('Message:', error.message)
    if (error.code) console.error('Code:', error.code)
    if (error.details) console.error('Details:', error.details)
    console.groupEnd()
  }
}