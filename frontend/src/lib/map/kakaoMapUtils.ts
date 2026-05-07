// 카카오맵 유틸리티 함수들

// 타입 안전성을 위한 전역 선언
declare global {
  interface Window {
    kakao: any;
  }
}

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
  
  if (process.env.NODE_ENV === 'development') console.log('🔍 카카오맵 상태 체크:', status)
  return status
}

export const waitForKakaoMaps = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // 이미 로드되어 있으면 바로 리턴
    if (typeof window !== 'undefined' && 
        window.kakao && 
        window.kakao.maps && 
        window.kakao.maps.LatLng) {
      if (process.env.NODE_ENV === 'development') console.log('✅ 카카오맵 이미 로드됨')
      resolve(true)
      return
    }

    // 스크립트 로드 상태를 먼저 확인
    let scriptLoadAttempts = 0
    const maxScriptAttempts = 100 // 10초
    
    const waitForScript = () => {
      scriptLoadAttempts++
      
      const scriptExists = document.querySelector('script[src*="dapi.kakao.com"]')
      if (!scriptExists) {
        if (scriptLoadAttempts >= maxScriptAttempts) {
          console.error('❌ 카카오맵 스크립트 로드 실패')
          resolve(false)
          return
        }
        setTimeout(waitForScript, 100)
        return
      }
      
      // 스크립트가 있으면 카카오 객체 로딩 대기
      waitForKakaoObjects()
    }

    const waitForKakaoObjects = () => {
      let attempts = 0
      const maxAttempts = 200 // 20초 (100ms * 200)
      
      const checkKakaoScript = () => {
        attempts++
        
        try {
          // 더 상세한 체크로 변경
          if (typeof window !== 'undefined') {
            // window.kakao 존재 확인
            if (!window.kakao) {
              if (attempts % 50 === 0) {
                if (process.env.NODE_ENV === 'development') console.log('⏳ window.kakao 객체 대기 중... (시도:', attempts, ')')
              }
              if (attempts >= maxAttempts) {
                console.error('❌ window.kakao 로드 타임아웃')
                resolve(false)
                return
              }
              setTimeout(checkKakaoScript, 100)
              return
            }

            // window.kakao.maps 존재 확인
            if (!window.kakao.maps) {
              // autoload=false인 경우 수동으로 load 호출
              if (typeof window.kakao.load === 'function') {
                if (process.env.NODE_ENV === 'development') console.log('🔄 카카오맵 수동 로드 시도...')
                try {
                  window.kakao.load(() => {
                    if (process.env.NODE_ENV === 'development') console.log('✅ 카카오맵 수동 로드 완료')
                    setTimeout(checkKakaoScript, 100)
                  })
                } catch (loadError) {
                  console.error('❌ 카카오맵 로드 함수 호출 실패:', loadError)
                  setTimeout(checkKakaoScript, 100)
                }
                return
              }
              
              // window.kakao가 있지만 maps가 없는 경우, load 함수 체크
              if (window.kakao && !window.kakao.maps) {
                // kakao 객체는 있지만 maps가 아직 로드되지 않은 경우
                if (window.kakao.load) {
                  if (process.env.NODE_ENV === 'development') console.log('🔄 카카오맵 수동 로드 재시도...')
                  try {
                    window.kakao.load(() => {
                      if (process.env.NODE_ENV === 'development') console.log('✅ 카카오맵 수동 로드 완료 (재시도)')
                      setTimeout(checkKakaoScript, 100)
                    })
                  } catch (loadError) {
                    console.error('❌ 카카오맵 로드 함수 호출 실패 (재시도):', loadError)
                    setTimeout(checkKakaoScript, 100)
                  }
                  return
                }
                
                // maps 객체가 완전히 없는 경우, 강제로 로드 시도
                try {
                  if (process.env.NODE_ENV === 'development') console.log('🔄 카카오맵 강제 로드 시도...')
                  if ((window as any).kakao?.maps?.load) {
                    (window as any).kakao.maps.load(() => {
                      if (process.env.NODE_ENV === 'development') console.log('✅ 카카오맵 강제 로드 완료')
                      setTimeout(checkKakaoScript, 100)
                    })
                    return
                  }
                } catch (forceLoadError) {
                  console.error('❌ 카카오맵 강제 로드 실패:', forceLoadError)
                }
              }
              
              if (attempts % 50 === 0) {
                if (process.env.NODE_ENV === 'development') console.log('⏳ window.kakao.maps 객체 대기 중... (시도:', attempts, ')')
                if (process.env.NODE_ENV === 'development') console.log('📊 kakao 객체 상태:', {
                  kakao: !!window.kakao,
                  maps: !!window.kakao.maps,
                  loadFunction: typeof window.kakao.load,
                  kakaoType: typeof window.kakao
                })
              }
              if (attempts >= maxAttempts) {
                console.error('❌ window.kakao.maps 로드 타임아웃')
                resolve(false)
                return
              }
              setTimeout(checkKakaoScript, 100)
              return
            }

            // 핵심 API들 존재 확인
            const hasRequiredAPIs = !!(
              window.kakao.maps.LatLng &&
              window.kakao.maps.Map &&
              window.kakao.maps.Marker &&
              window.kakao.maps.InfoWindow &&
              window.kakao.maps.services &&
              window.kakao.maps.services.Geocoder
            )

            if (hasRequiredAPIs) {
              if (process.env.NODE_ENV === 'development') console.log('✅ 카카오맵 API 준비 완료 (시도:', attempts, ')')
              resolve(true)
              return
            } else {
              if (attempts % 50 === 0) {
                if (process.env.NODE_ENV === 'development') console.log('⏳ 카카오맵 필수 API 로딩 중... (시도:', attempts, ')')
                if (process.env.NODE_ENV === 'development') console.log('📊 API 상태:', {
                  LatLng: !!window.kakao.maps.LatLng,
                  Map: !!window.kakao.maps.Map,
                  Marker: !!window.kakao.maps.Marker,
                  InfoWindow: !!window.kakao.maps.InfoWindow,
                  services: !!window.kakao.maps.services,
                  Geocoder: !!window.kakao.maps.services?.Geocoder
                })
              }
            }
          }
        } catch (error) {
          console.error('❌ 카카오맵 체크 중 오류:', error)
        }
        
        if (attempts >= maxAttempts) {
          console.error('❌ 카카오맵 API 로드 타임아웃 (시도:', attempts, ')')
          console.error('📊 최종 상태:', {
            windowExists: typeof window !== 'undefined',
            scriptExists: typeof window !== 'undefined' && !!document.querySelector('script[src*="dapi.kakao.com"]'),
            kakaoExists: typeof window !== 'undefined' && !!window.kakao,
            mapsExists: typeof window !== 'undefined' && !!window.kakao?.maps,
            latLngExists: typeof window !== 'undefined' && !!window.kakao?.maps?.LatLng,
            apiKey: process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY?.substring(0, 8) + '...',
            currentURL: window.location.href
          })
          resolve(false)
          return
        }
        
        setTimeout(checkKakaoScript, 100)
      }
      
      checkKakaoScript()
    }
    
    waitForScript()
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
