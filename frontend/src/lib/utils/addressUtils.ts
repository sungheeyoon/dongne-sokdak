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
 * 기존 주소를 행정동 기준으로 표기 (동으로 끝나면 동만, 로로 끝나면 로만 표기)
 */
export const formatToAdministrativeAddress = (address: string): string => {
  if (!address || address === '주소 없음') return '주소 없음'
  
  // 주소를 공백 기준으로 분리
  const parts = address.split(' ').filter(part => part.trim())
  
  // 마지막 부분부터 검사 (번지 제외)
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i]
    
    // 순수 숫자는 건너뛰기 (번지)
    if (/^\d+$/.test(part)) {
      continue
    }
    
    // '동'으로 끝나는 경우 (행정동) - 동만 표기
    if (part.endsWith('동')) {
      return part
    }
    
    // '로'로 끝나는 경우 (도로명) - 로만 표기  
    if (part.endsWith('로')) {
      return part
    }
    
    // '가'로 끝나는 경우 (법정동) - 가만 표기 (예: 종로1가, 태평로1가)
    if (part.endsWith('가')) {
      return part
    }
  }
  
  // 서울특별시, 인천광역시 등 제거
  const cleanAddress = address
    .replace(/(서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|경기도|강원도|충청북도|충청남도|전라북도|전라남도|경상북도|경상남도|제주특별자치도)\s*/g, '')
  
  const cleanParts = cleanAddress.split(' ').filter(part => part.trim())
  
  // 다시 동/로/가 검사 (번지 제외)
  for (let i = cleanParts.length - 1; i >= 0; i--) {
    const part = cleanParts[i]
    
    // 순수 숫자는 건너뛰기 (번지)
    if (/^\d+$/.test(part)) {
      continue
    }
    
    if (part.endsWith('동') || part.endsWith('로') || part.endsWith('가')) {
      return part
    }
  }
  
  // 해당사항 없으면 번지를 제외한 마지막 의미있는 부분 반환
  for (let i = cleanParts.length - 1; i >= 0; i--) {
    const part = cleanParts[i]
    // 순수 숫자가 아닌 첫 번째 부분 반환
    if (!/^\d+$/.test(part)) {
      return part
    }
  }
  
  return cleanParts[cleanParts.length - 1] || '주소 없음'
}

/**
 * 카카오 장소 검색 결과를 행정동 주소로 변환
 */
export const convertPlaceToAdministrativeAddress = (place: any): string => {
  // 전체 주소 정보를 보존하면서 반환 (원본 그대로 저장)
  // 나중에 formatToAdministrativeAddress로 변환할 수 있도록 원본 유지
  if (place.address_name) {
    return place.address_name; // 원본 주소 그대로 저장 (예: "서울 종로구 종로1가 54")
  }
  
  if (place.road_address_name) {
    return place.road_address_name;
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
 * 주소에서 동 또는 로 이름만 추출 (예: "부평구 부개3동" -> "부개3동", "을지로" -> "을지로")
 */
export const extractDongName = (address: string): string => {
  return formatToAdministrativeAddress(address)
}