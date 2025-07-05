// 카카오맵 유틸리티 함수들

export const checkKakaoMapStatus = () => {
  const status = {
    windowExists: typeof window !== 'undefined',
    kakaoExists: typeof window !== 'undefined' && !!window.kakao,
    mapsExists: typeof window !== 'undefined' && !!window.kakao?.maps,
    latLngExists: typeof window !== 'undefined' && !!window.kakao?.maps?.LatLng,
    apiKey: process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY,
    hasApiKey: !!process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY,
    scriptLoaded: typeof window !== 'undefined' && !!document.querySelector('script[src*="dapi.kakao.com"]')
  }
  
  console.log('🔍 카카오맵 상태 체크:', status)
  return status
}

export const waitForKakaoMaps = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // 이미 로드되어 있으면 바로 리턴
    if (typeof window !== 'undefined' && 
        window.kakao && 
        window.kakao.maps && 
        window.kakao.maps.LatLng) {
      console.log('✅ 카카오맵 이미 로드됨')
      resolve(true)
      return
    }

    let attempts = 0
    const maxAttempts = 150 // 15초 (100ms * 150)
    
    const checkKakaoScript = () => {
      attempts++
      
      // autoload=true이므로 kakao.maps가 바로 로드되어야 함
      if (typeof window !== 'undefined' && 
          window.kakao && 
          window.kakao.maps && 
          window.kakao.maps.LatLng) {
        console.log('✅ 카카오맵 API 준비 완료 (시도:', attempts, ')')
        resolve(true)
        return
      }
      
      if (attempts >= maxAttempts) {
        console.error('❌ 카카오맵 API 로드 타임아웃 (시도:', attempts, ')')
        console.error('📊 최종 상태:', {
          windowExists: typeof window !== 'undefined',
          scriptExists: typeof window !== 'undefined' && !!document.querySelector('script[src*="dapi.kakao.com"]'),
          kakaoExists: typeof window !== 'undefined' && !!window.kakao,
          mapsExists: typeof window !== 'undefined' && !!window.kakao?.maps,
          latLngExists: typeof window !== 'undefined' && !!window.kakao?.maps?.LatLng,
          apiKey: process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY?.substring(0, 8) + '...'
        })
        resolve(false)
        return
      }
      
      // 진행 상황 로그 (3초마다)
      if (attempts % 30 === 0) {
        console.log('⏳ 카카오맵 로딩 중... (시도:', attempts, '/150)')
        console.log('📊 현재 상태:', {
          scriptExists: typeof window !== 'undefined' && !!document.querySelector('script[src*="dapi.kakao.com"]'),
          kakaoExists: typeof window !== 'undefined' && !!window.kakao,
          mapsExists: typeof window !== 'undefined' && !!window.kakao?.maps,
          latLngExists: typeof window !== 'undefined' && !!window.kakao?.maps?.LatLng
        })
      }
      
      setTimeout(checkKakaoScript, 100)
    }
    
    checkKakaoScript()
  })
}

// 카카오맵 오류 메시지 분석
export const analyzeKakaoMapError = () => {
  const issues = []
  
  if (typeof window === 'undefined') {
    issues.push('브라우저 환경이 아닙니다')
    return issues
  }
  
  // API 키 확인
  if (!process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY) {
    issues.push('카카오맵 API 키가 설정되지 않았습니다')
  } else if (process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY.length < 10) {
    issues.push('API 키가 너무 짧습니다')
  }
  
  // 스크립트 태그 확인
  const scriptExists = document.querySelector('script[src*="dapi.kakao.com"]')
  if (!scriptExists) {
    issues.push('카카오맵 스크립트 태그가 없습니다')
    return issues
  }
  
  // 네트워크 상태 확인
  if (!navigator.onLine) {
    issues.push('인터넷 연결이 끊어졌습니다')
  }
  
  // 카카오 객체 상태 확인
  if (!window.kakao) {
    issues.push('카카오 객체가 로드되지 않았습니다 (네트워크 오류 또는 API 키 문제)')
  } else if (!window.kakao.maps) {
    issues.push('카카오맵 Maps 객체가 없습니다 (API 로딩 실패)')
  } else if (!window.kakao.maps.LatLng) {
    issues.push('카카오맵 LatLng 생성자가 없습니다 (API 초기화 실패)')
  }
  
  // 기본 메시지
  if (issues.length === 0) {
    issues.push('알 수 없는 오류가 발생했습니다')
  }
  
  return issues
}

// 카카오맵 스크립트가 이미 로드되었는지 확인
export const isKakaoMapScriptLoaded = () => {
  return typeof window !== 'undefined' && 
         !!document.querySelector('script[src*="dapi.kakao.com"]')
}

// 카카오맵 강제 새로고침
export const forceReloadKakaoMap = () => {
  window.location.reload()
}
