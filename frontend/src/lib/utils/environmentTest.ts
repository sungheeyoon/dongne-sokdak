// 환경 감지 테스트 유틸리티

/**
 * 현재 환경 정보를 콘솔에 출력하는 디버깅 함수
 */
export const debugEnvironment = () => {
  if (typeof window === 'undefined') {
    if (process.env.NODE_ENV === 'development') console.log('🔍 서버 사이드 환경')
    console.log('NODE_ENV:', process.env.NODE_ENV)
    return
  }

  const currentOrigin = window.location.origin
  const currentUrl = window.location.href
  
  if (process.env.NODE_ENV === 'development') console.log('🔍 클라이언트 환경 정보:')
  if (process.env.NODE_ENV === 'development') console.log('  - Origin:', currentOrigin)
  if (process.env.NODE_ENV === 'development') console.log('  - Full URL:', currentUrl)
  console.log('  - NODE_ENV:', process.env.NODE_ENV)
  
  // 각 조건 체크
  const conditions = {
    'localhost 포함': currentOrigin.includes('localhost'),
    '127.0.0.1 포함': currentOrigin.includes('127.0.0.1'),
    '192.168. 포함': currentOrigin.includes('192.168.'),
    ':3000 포함': currentOrigin.includes(':3000'),
    ':3001 포함': currentOrigin.includes(':3001'),
    ':3002 포함': currentOrigin.includes(':3002'),
    ':5173 포함': currentOrigin.includes(':5173'),
    ':8080 포함': currentOrigin.includes(':8080')
  }
  
  if (process.env.NODE_ENV === 'development') console.log('🔍 개발 환경 조건 체크:')
  Object.entries(conditions).forEach(([condition, result]) => {
    if (process.env.NODE_ENV === 'development') console.log(`  - ${condition}: ${result ? '✅' : '❌'}`)
  })
  
  const isLocalDev = Object.values(conditions).some(Boolean) || process.env.NODE_ENV === 'development'
  if (process.env.NODE_ENV === 'development') console.log(`🔍 최종 판단: ${isLocalDev ? '로컬 개발 환경' : '프로덕션 환경'}`)
  
  return {
    origin: currentOrigin,
    url: currentUrl,
    conditions,
    isLocalDev
  }
}