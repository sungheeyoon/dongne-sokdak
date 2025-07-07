// 환경변수 검증 유틸리티

interface EnvConfig {
  NEXT_PUBLIC_SUPABASE_URL?: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string
  NEXT_PUBLIC_API_URL?: string
  NEXT_PUBLIC_KAKAO_MAP_API_KEY?: string
  NEXT_PUBLIC_KAKAO_REST_API_KEY?: string
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// 필수 환경변수 목록
const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_KAKAO_MAP_API_KEY'
] as const

// 선택적 환경변수 (기본값 있음)
const OPTIONAL_ENV_VARS = [
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_KAKAO_REST_API_KEY'
] as const

// 환경변수 검증 함수
export function validateEnvironment(): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // 필수 환경변수 확인
  REQUIRED_ENV_VARS.forEach(envVar => {
    const value = process.env[envVar]
    if (!value) {
      errors.push(`필수 환경변수 ${envVar}가 설정되지 않았습니다.`)
    } else if (value.length < 10) {
      warnings.push(`환경변수 ${envVar}의 값이 너무 짧습니다. 올바른 값인지 확인해주세요.`)
    }
  })

  // API URL 형식 검증
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  if (apiUrl && !apiUrl.startsWith('http')) {
    errors.push('NEXT_PUBLIC_API_URL은 http:// 또는 https://로 시작해야 합니다.')
  }

  // Supabase URL 형식 검증
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (supabaseUrl && !supabaseUrl.includes('supabase.co')) {
    warnings.push('NEXT_PUBLIC_SUPABASE_URL이 올바른 Supabase URL 형식이 아닐 수 있습니다.')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// 환경변수 정보 출력 (개발용)
export function logEnvironmentStatus() {
  if (process.env.NODE_ENV !== 'development') return

  const result = validateEnvironment()
  
  console.group('🔧 Environment Variables Status')
  
  // 성공한 설정들
  REQUIRED_ENV_VARS.forEach(envVar => {
    const value = process.env[envVar]
    if (value) {
      console.log(`✅ ${envVar}: ${value.substring(0, 20)}...`)
    }
  })

  OPTIONAL_ENV_VARS.forEach(envVar => {
    const value = process.env[envVar]
    if (value) {
      console.log(`✅ ${envVar}: ${value}`)
    } else {
      console.log(`⚠️ ${envVar}: 설정되지 않음 (선택사항)`)
    }
  })

  // 에러와 경고
  if (result.errors.length > 0) {
    console.group('❌ Errors')
    result.errors.forEach(error => console.error(error))
    console.groupEnd()
  }

  if (result.warnings.length > 0) {
    console.group('⚠️ Warnings') 
    result.warnings.forEach(warning => console.warn(warning))
    console.groupEnd()
  }

  console.groupEnd()
  
  return result
}

// 런타임에서 환경변수 가져오기 (안전한 방법)
export function getEnvVar(key: keyof EnvConfig, defaultValue?: string): string {
  const value = process.env[key]
  if (!value && !defaultValue) {
    throw new Error(`환경변수 ${key}가 설정되지 않았습니다.`)
  }
  return value || defaultValue || ''
}