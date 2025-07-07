/**
 * 카카오 주소 API를 사용한 행정동 기반 주소 변환 유틸리티
 */

interface KakaoAddressResult {
  address?: {
    region_1depth_name: string  // 시/도 (예: 서울특별시)
    region_2depth_name: string  // 구/군 (예: 중구, 부평구) 
    region_3depth_name: string  // 동/읍/면 (예: 명동, 부개3동)
    address_name: string        // 전체 주소
  }
  road_address?: {
    region_1depth_name: string
    region_2depth_name: string
    region_3depth_name: string
    address_name: string
  }
}

/**
 * 좌표를 행정동 기반 주소로 변환
 */
export const convertToAdministrativeAddress = async (
  lat: number, 
  lng: number
): Promise<string> => {
  return new Promise((resolve) => {
    if (!window.kakao?.maps?.services) {
      resolve('주소 변환 불가')
      return
    }

    const geocoder = new window.kakao.maps.services.Geocoder()
    
    geocoder.coord2Address(lng, lat, (result: KakaoAddressResult[], status: any) => {
      if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
        const addr = result[0]
        
        // 행정동 우선 표시
        if (addr.address?.region_3depth_name) {
          // 구 + 동 형태로 표시 (예: "부평구 부개3동")
          const gu = addr.address.region_2depth_name
          const dong = addr.address.region_3depth_name
          
          // "구"가 포함되지 않은 경우 추가
          const guName = gu.includes('구') ? gu : `${gu}구`
          
          resolve(`${guName} ${dong}`)
        } else if (addr.road_address?.region_3depth_name) {
          // 도로명 주소에서 행정동 정보 사용
          const gu = addr.road_address.region_2depth_name
          const dong = addr.road_address.region_3depth_name
          const guName = gu.includes('구') ? gu : `${gu}구`
          
          resolve(`${guName} ${dong}`)
        } else {
          // 행정동 정보가 없으면 구 단위까지만 표시
          const gu = addr.address?.region_2depth_name || addr.road_address?.region_2depth_name
          if (gu) {
            const guName = gu.includes('구') || gu.includes('군') || gu.includes('시') ? gu : `${gu}구`
            resolve(guName)
          } else {
            resolve('주소 없음')
          }
        }
      } else {
        resolve('주소 변환 실패')
      }
    })
  })
}

/**
 * 기존 주소를 행정동 형태로 변환
 */
export const formatToAdministrativeAddress = (address: string): string => {
  if (!address || address === '주소 없음') return '주소 없음'
  
  // 이미 행정동 형태인지 확인 (예: "부평구 부개3동")
  const dongPattern = /(.+?구)\s+(.+?동)/
  const match = address.match(dongPattern)
  
  if (match) {
    return `${match[1]} ${match[2]}`
  }
  
  // 서울특별시, 인천광역시 등 제거하고 구 + 동 추출
  const cleanAddress = address
    .replace(/(서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|경기도|강원도|충청북도|충청남도|전라북도|전라남도|경상북도|경상남도|제주특별자치도)\s*/g, '')
  
  // 구/군/시 + 동/읍/면 패턴 찾기
  const adminPattern = /(.+?(?:구|군|시))\s+(.+?(?:동|읍|면))/
  const adminMatch = cleanAddress.match(adminPattern)
  
  if (adminMatch) {
    return `${adminMatch[1]} ${adminMatch[2]}`
  }
  
  // 동만 있는 경우 (예: "명동2가")
  const dongOnlyPattern = /(.+?동)/
  const dongOnlyMatch = cleanAddress.match(dongOnlyPattern)
  
  if (dongOnlyMatch) {
    return dongOnlyMatch[1]
  }
  
  // 변환 실패 시 원본 주소의 앞부분만 반환
  const parts = cleanAddress.split(' ')
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1]}`
  }
  
  return parts[0] || '주소 없음'
}

/**
 * 카카오 장소 검색 결과를 행정동 주소로 변환
 */
export const convertPlaceToAdministrativeAddress = (place: any): string => {
  // 카카오 장소 검색 API 결과에서 행정동 주소 추출
  if (place.road_address_name) {
    return formatToAdministrativeAddress(place.road_address_name)
  } else if (place.address_name) {
    return formatToAdministrativeAddress(place.address_name)
  }
  
  return '주소 없음'
}

/**
 * 여러 제보의 주소가 같은 행정동인지 확인
 */
export const isSameAdministrativeArea = (address1: string, address2: string): boolean => {
  const formatted1 = formatToAdministrativeAddress(address1)
  const formatted2 = formatToAdministrativeAddress(address2)
  
  return formatted1 === formatted2
}

/**
 * 주소에서 동 이름만 추출 (예: "부평구 부개3동" -> "부개3동")
 */
export const extractDongName = (address: string): string => {
  const dongPattern = /(.+?동)/
  const match = address.match(dongPattern)
  
  return match ? match[1] : address
}