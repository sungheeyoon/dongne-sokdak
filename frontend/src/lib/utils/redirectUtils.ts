// 환경별 안전한 리다이렉트 유틸리티

/**
 * 현재 환경에 맞는 안전한 홈 URL을 반환
 */
export const getSafeHomeUrl = (): string => {
  if (typeof window === 'undefined') {
    return '/'
  }

  const currentOrigin = window.location.origin
  
  // 개발 환경 확인 (포트 번호 포함)
  const isLocalDev = currentOrigin.includes('localhost') || 
                    currentOrigin.includes('127.0.0.1') ||
                    currentOrigin.includes('192.168.') ||
                    currentOrigin.includes(':3000') ||
                    currentOrigin.includes(':3001') ||
                    currentOrigin.includes(':3002') ||
                    currentOrigin.includes(':5173') || // Vite
                    currentOrigin.includes(':8080')    // 다른 개발 서버

  // 환경별 로깅
  if (isLocalDev) {
    if (process.env.NODE_ENV === 'development') console.log(`🏠 로컬 개발 환경 감지: ${currentOrigin}`)
    if (process.env.NODE_ENV === 'development') console.log(`🏠 로컬 홈으로 리다이렉트: ${currentOrigin}/`)
  } else {
    if (process.env.NODE_ENV === 'development') console.log(`🏠 프로덕션 환경 감지: ${currentOrigin}`)
    if (process.env.NODE_ENV === 'development') console.log(`🏠 프로덕션 홈으로 리다이렉트: ${currentOrigin}/`)
  }

  return '/'
}

/**
 * OAuth 리다이렉트 URL 생성
 */
export const getOAuthRedirectUrl = (provider: string): string => {
  if (typeof window === 'undefined') {
    return '/auth/callback'
  }

  const currentOrigin = window.location.origin
  const callbackPath = '/auth/callback'
  const redirectUrl = `${currentOrigin}${callbackPath}`
  
  // 개발 환경 확인 (포트 번호 포함)
  const isLocalDev = currentOrigin.includes('localhost') || 
                    currentOrigin.includes('127.0.0.1') ||
                    currentOrigin.includes('192.168.') ||
                    currentOrigin.includes(':3000') ||
                    currentOrigin.includes(':3001') ||
                    currentOrigin.includes(':3002') ||
                    currentOrigin.includes(':5173') || // Vite
                    currentOrigin.includes(':8080')    // 다른 개발 서버

  if (isLocalDev) {
    if (process.env.NODE_ENV === 'development') console.log(`🔄 ${provider} OAuth 로컬 개발 환경 감지: ${currentOrigin}`)
    if (process.env.NODE_ENV === 'development') console.log(`🔄 ${provider} OAuth 로컬 리다이렉트 URL: ${redirectUrl}`)
  } else {
    if (process.env.NODE_ENV === 'development') console.log(`🔄 ${provider} OAuth 프로덕션 환경 감지: ${currentOrigin}`)
    if (process.env.NODE_ENV === 'development') console.log(`🔄 ${provider} OAuth 프로덕션 리다이렉트 URL: ${redirectUrl}`)
  }

  return redirectUrl
}

/**
 * 현재 환경이 개발 환경인지 확인
 */
export const isDevEnvironment = (): boolean => {
  if (typeof window === 'undefined') {
    return process.env.NODE_ENV === 'development'
  }

  const currentOrigin = window.location.origin
  return currentOrigin.includes('localhost') || 
         currentOrigin.includes('127.0.0.1') ||
         currentOrigin.includes('192.168.') ||
         currentOrigin.includes(':3000') ||
         currentOrigin.includes(':3001') ||
         currentOrigin.includes(':3002') ||
         currentOrigin.includes(':5173') || // Vite
         currentOrigin.includes(':8080') || // 다른 개발 서버
         process.env.NODE_ENV === 'development'
}

/**
 * 안전한 URL 유효성 검사
 */
export const isSafeRedirectUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url, window.location.origin)
    const currentOrigin = window.location.origin
    
    // 같은 origin인지 확인
    if (urlObj.origin !== currentOrigin) {
      console.warn(`⚠️ 다른 도메인으로의 리다이렉트는 허용되지 않습니다: ${url}`)
      return false
    }
    
    return true
  } catch {
    // 상대 경로인 경우
    return url.startsWith('/') && !url.startsWith('//')
  }
}