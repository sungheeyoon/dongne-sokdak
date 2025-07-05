// 주소에서 동네 이름을 추출하는 유틸리티 함수들

export interface NeighborhoodNames {
  district: string      // 구/군 (예: "중구", "강남구")
  neighborhood: string  // 행정동 (예: "회현동", "역삼동")
  full: string         // 전체 동네 (예: "중구 회현동")
}

/**
 * 서울 중구 법정동 → 행정동 매핑 테이블
 * 출처: 서울특별시 중구 행정구역 정보
 */
const SEOUL_JUNGGU_MAPPING: { [key: string]: string } = {
  // 회현동 (행정동) ← 태평로1가, 태평로2가, 북창동, 다동, 무교동, 소공동
  '태평로1가': '회현동',
  '태평로2가': '회현동', 
  '북창동': '회현동',
  '다동': '회현동',
  '무교동': '회현동',
  '소공동': '회현동',
  
  // 명동 (행정동) ← 명동1가, 명동2가, 회현동1가, 회현동2가, 회현동3가
  '명동1가': '명동',
  '명동2가': '명동',
  '회현동1가': '명동',
  '회현동2가': '명동', 
  '회현동3가': '명동',
  
  // 필동 (행정동) ← 필동1가, 필동2가, 필동3가, 충무로1가, 충무로2가, 충무로3가
  '필동1가': '필동',
  '필동2가': '필동',
  '필동3가': '필동',
  '충무로1가': '필동',
  '충무로2가': '필동',
  '충무로3가': '필동',
  
  // 장충동 (행정동) ← 장충동1가, 장충동2가, 광희동1가, 광희동2가
  '장충동1가': '장충동',
  '장충동2가': '장충동',
  '광희동1가': '장충동',
  '광희동2가': '장충동',
  
  // 황학동 (행정동) ← 황학동, 산림동
  '황학동': '황학동',
  '산림동': '황학동',
  
  // 중림동 (행정동) ← 중림동, 예장동
  '중림동': '중림동',
  '예장동': '중림동',
  
  // 신당동 (행정동) ← 신당동, 다산동, 약수동
  '신당동': '신당동',
  '다산동': '신당동',
  '약수동': '신당동',
  
  // 동화동 (행정동) ← 동화동, 만리동1가, 만리동2가
  '동화동': '동화동',
  '만리동1가': '동화동',
  '만리동2가': '동화동',
  
  // 을지로동 (행정동) ← 을지로1가, 을지로2가, 을지로3가, 을지로4가, 을지로5가, 입정동, 산수동
  '을지로1가': '을지로동',
  '을지로2가': '을지로동',
  '을지로3가': '을지로동',
  '을지로4가': '을지로동',
  '을지로5가': '을지로동',
  '입정동': '을지로동',
  '산수동': '을지로동',
  
  // 광희동 (행정동) - 일부는 장충동에 포함되지만 구분
  '광희동': '광희동',
  
  // 순화동 (행정동) ← 순화동, 수하동, 수표동, 장교동, 관수동, 견지동, 와룡동, 방산동, 오장동, 묘동, 인현동1가, 인현동2가, 예관동, 관철동, 낙원동, 종로1가, 종로2가, 관훈동
  '순화동': '순화동',
  '수하동': '순화동',
  '수표동': '순화동',
  '장교동': '순화동',
  '관수동': '순화동',
  '견지동': '순화동',
  '와룡동': '순화동',
  '방산동': '순화동',
  '오장동': '순화동',
  '묘동': '순화동',
  '인현동1가': '순화동',
  '인현동2가': '순화동',
  '예관동': '순화동',
  '관철동': '순화동',
  '낙원동': '순화동',
  '종로1가': '순화동',
  '종로2가': '순화동',
  '관훈동': '순화동'
}

/**
 * 서울 주요 구별 행정동 매핑 테이블
 */
const SEOUL_DISTRICT_MAPPING: { [key: string]: { [key: string]: string } } = {
  // 강남구 (22개 행정동)
  '강남구': {
    '역삼1동': '역삼1동', '역삼2동': '역삼2동',
    '개포1동': '개포1동', '개포2동': '개포2동', '개포4동': '개포4동',
    '신사동': '신사동', '논현1동': '논현1동', '논현2동': '논현2동',
    '압구정동': '압구정동', '청담동': '청담동', '삼성1동': '삼성1동', '삼성2동': '삼성2동',
    '대치1동': '대치1동', '대치2동': '대치2동', '대치4동': '대치4동',
    '도곡1동': '도곡1동', '도곡2동': '도곡2동',
    '세곡동': '세곡동', '일원본동': '일원본동', '일원1동': '일원1동', '일원2동': '일원2동',
    '수서동': '수서동'
  },
  
  // 서초구 (18개 행정동)
  '서초구': {
    '서초1동': '서초1동', '서초2동': '서초2동', '서초3동': '서초3동', '서초4동': '서초4동',
    '잠원동': '잠원동', '반포본동': '반포본동', '반포1동': '반포1동', '반포2동': '반포2동', '반포3동': '반포3동', '반포4동': '반포4동',
    '방배본동': '방배본동', '방배1동': '방배1동', '방배2동': '방배2동', '방배3동': '방배3동', '방배4동': '방배4동',
    '양재1동': '양재1동', '양재2동': '양재2동',
    '내곡동': '내곡동'
  },
  
  // 마포구 (16개 행정동)
  '마포구': {
    '공덕동': '공덕동', '아현동': '아현동', '용강동': '용강동', '대흥동': '대흥동',
    '신수동': '신수동', '서강동': '서강동', '서교동': '서교동', '합정동': '합정동',
    '망원1동': '망원1동', '망원2동': '망원2동', '연남동': '연남동', '성산1동': '성산1동', '성산2동': '성산2동',
    '상암동': '상암동', '산천동': '산천동', '염리동': '염리동'
  },
  
  // 용산구 (16개 행정동)
  '용산구': {
    '후암동': '후암동', '용산2가동': '용산2가동', '남영동': '남영동', '청파동': '청파동',
    '원효로1동': '원효로1동', '원효로2동': '원효로2동', '효창동': '효창동', '용문동': '용문동',
    '한강로동': '한강로동', '이촌1동': '이촌1동', '이촌2동': '이촌2동',
    '이태원1동': '이태원1동', '이태원2동': '이태원2동',
    '한남동': '한남동', '서빙고동': '서빙고동', '보광동': '보광동'
  },
  
  // 종로구 (17개 행정동)
  '종로구': {
    '청운효자동': '청운효자동', '사직동': '사직동', '삼청동': '삼청동', '부암동': '부암동',
    '평창동': '평창동', '무악동': '무악동', '교남동': '교남동', '가회동': '가회동',
    '종로1.2.3.4가동': '종로1.2.3.4가동', '종로5.6가동': '종로5.6가동',
    '이화동': '이화동', '혜화동': '혜화동', '명륜3가동': '명륜3가동', '명륜4가동': '명륜4가동',
    '창신1동': '창신1동', '창신2동': '창신2동', '창신3동': '창신3동'
  }
}

/**
 * 법정동을 행정동으로 변환하는 함수
 */
function convertToAdministrativeDong(district: string, address: string, roadAddress?: string): string {
  // 서울 중구 매핑
  if (district === '중구') {
    // 주소에서 법정동 찾기
    for (const [legalDong, adminDong] of Object.entries(SEOUL_JUNGGU_MAPPING)) {
      if (address.includes(legalDong)) {
        return adminDong
      }
    }
    
    // 도로명 주소 기반 매핑
    if (roadAddress || address.includes('로') || address.includes('길')) {
      const addressToCheck = roadAddress || address
      
      // 주요 도로명별 행정동 매핑
      if (addressToCheck.includes('세종대로') || addressToCheck.includes('시청')) {
        return '회현동'
      } else if (addressToCheck.includes('을지로')) {
        return '을지로동'
      } else if (addressToCheck.includes('명동')) {
        return '명동'
      } else if (addressToCheck.includes('충무로')) {
        return '필동'
      } else if (addressToCheck.includes('소공로') || addressToCheck.includes('롯데')) {
        return '회현동'
      } else if (addressToCheck.includes('장충단로')) {
        return '장충동'
      } else if (addressToCheck.includes('동호로')) {
        return '장충동'
      } else if (addressToCheck.includes('중림로')) {
        return '중림동'
      } else if (addressToCheck.includes('다산로')) {
        return '신당동'
      }
    }
    
    // 기본값: 회현동 (중구청 소재지)
    return '회현동'
  }
  
  // 다른 서울 구들의 상세 행정동 매핑
  if (SEOUL_DISTRICT_MAPPING[district]) {
    const districtMapping = SEOUL_DISTRICT_MAPPING[district]
    
    // 주소에서 구체적인 행정동 찾기 (예: 역삼1동, 강남역 등)
    for (const [key, adminDong] of Object.entries(districtMapping)) {
      if (address.includes(key) || address.includes(key.replace('동', ''))) {
        return adminDong
      }
    }
    
    // 도로명이나 랜드마크 기반 추론
    const addressToCheck = roadAddress || address
    
    if (district === '강남구') {
      if (addressToCheck.includes('테헤란로') || addressToCheck.includes('강남역')) {
        return '역삼1동'
      } else if (addressToCheck.includes('압구정로') || addressToCheck.includes('압구정역')) {
        return '압구정동'
      } else if (addressToCheck.includes('청담')) {
        return '청담동'
      } else if (addressToCheck.includes('삼성역') || addressToCheck.includes('봉은사로')) {
        return '삼성1동'
      } else if (addressToCheck.includes('대치')) {
        return '대치1동'
      } else if (addressToCheck.includes('도곡역')) {
        return '도곡1동'
      } else if (addressToCheck.includes('수서역')) {
        return '수서동'
      }
      return '역삼1동' // 기본값
    }
    
    if (district === '서초구') {
      if (addressToCheck.includes('서초역') || addressToCheck.includes('서초대로')) {
        return '서초2동'
      } else if (addressToCheck.includes('강남역')) {
        return '서초1동'
      } else if (addressToCheck.includes('반포대로') || addressToCheck.includes('반포역')) {
        return '반포1동'
      } else if (addressToCheck.includes('고속터미널')) {
        return '반포본동'
      } else if (addressToCheck.includes('방배역')) {
        return '방배본동'
      } else if (addressToCheck.includes('양재역')) {
        return '양재1동'
      }
      return '서초2동' // 기본값
    }
    
    if (district === '마포구') {
      if (addressToCheck.includes('공덕역') || addressToCheck.includes('마포대로')) {
        return '공덕동'
      } else if (addressToCheck.includes('홍대') || addressToCheck.includes('홍익대')) {
        return '서교동'
      } else if (addressToCheck.includes('합정역')) {
        return '합정동'
      } else if (addressToCheck.includes('망원역')) {
        return '망원1동'
      } else if (addressToCheck.includes('상암동') || addressToCheck.includes('DMC')) {
        return '상암동'
      }
      return '서교동' // 기본값 (홍대 지역)
    }
    
    if (district === '용산구') {
      if (addressToCheck.includes('용산역')) {
        return '용산2가동'
      } else if (addressToCheck.includes('이태원')) {
        return '이태원1동'
      } else if (addressToCheck.includes('한남동') || addressToCheck.includes('한남대교')) {
        return '한남동'
      } else if (addressToCheck.includes('이촌역')) {
        return '이촌1동'
      }
      return '용산2가동' // 기본값
    }
    
    if (district === '종로구') {
      if (addressToCheck.includes('종로1가') || addressToCheck.includes('종각역')) {
        return '종로1.2.3.4가동'
      } else if (addressToCheck.includes('혜화역') || addressToCheck.includes('대학로')) {
        return '혜화동'
      } else if (addressToCheck.includes('삼청동')) {
        return '삼청동'
      } else if (addressToCheck.includes('북촌')) {
        return '가회동'
      }
      return '종로1.2.3.4가동' // 기본값
    }
  }
  
  // 매핑이 없는 구는 기존 방식 유지 (구 단위 표시)
  if (district) {
    return district.replace(/구$/, '동')
  }
  
  return '알 수 없음'
}

/**
 * 주소에서 행정동 정보를 우선 추출합니다 (부개3동, 양평1동 등)
 * @param address 전체 주소 
 * @param roadAddress 도로명주소
 * @returns 행정동 기반 동네 정보
 */
export function extractAdministrativeDong(
  address: string, 
  roadAddress?: string
): NeighborhoodNames {
  let district = ''
  let neighborhood = ''
  
  try {
    // 지번주소에서 행정동 추출 (예: "인천 부평구 부개3동 123-45")
    const addressParts = address.split(' ')
    
    if (addressParts.length >= 3) {
      const cityIndex = addressParts.findIndex(part => 
        part.includes('시') || part.includes('도') || part === '서울' || part === '부산' || 
        part === '대구' || part === '인천' || part === '광주' || part === '대전' || 
        part === '울산' || part === '세종'
      )
      
      if (cityIndex !== -1 && addressParts.length > cityIndex + 2) {
        district = addressParts[cityIndex + 1] // 구/군
        
        // 행정동 찾기 (숫자+동 패턴 우선)
        for (let i = cityIndex + 2; i < addressParts.length; i++) {
          const part = addressParts[i]
          // "부개3동", "양평1동" 같은 패턴 매칭
          if (/\d+동$/.test(part)) {
            neighborhood = part
            break
          }
          // 일반 동명
          else if (part.endsWith('동')) {
            neighborhood = part
            break
          }
          // 가명 (태평로1가 등)
          else if (/\d*가$/.test(part)) {
            neighborhood = part
            break
          }
        }
        
        // 동을 찾지 못한 경우, 법정동을 행정동으로 매핑
        if (!neighborhood) {
          neighborhood = convertToAdministrativeDong(district, address, roadAddress)
        }
      }
    }
    
    // 구 정보가 없으면 도로명주소에서 시도
    if (!district && roadAddress) {
      const roadParts = roadAddress.split(' ')
      const cityIndex = roadParts.findIndex(part => 
        part.includes('시') || part.includes('도') || part === '서울' || part === '부산' || 
        part === '대구' || part === '인천' || part === '광주' || part === '대전' || 
        part === '울산' || part === '세종'
      )
      
      if (cityIndex !== -1 && roadParts.length > cityIndex + 1) {
        district = roadParts[cityIndex + 1]
      }
    }
    
    // 동네 이름이 없으면 구 이름으로 대체
    if (!neighborhood && district) {
      neighborhood = district
    }
    
  } catch (error) {
    console.error('행정동 추출 오류:', error)
  }
  
  // 결과 정리 - 행정동 우선 표기
  const full = neighborhood && district ? 
    (neighborhood.includes(district.replace(/[구군]$/, '')) ? neighborhood : `${district} ${neighborhood}`) :
    neighborhood || district || '동네'
  
  return {
    district: district || '알 수 없음',
    neighborhood: neighborhood || '알 수 없음', 
    full: full.replace(/\s+/g, ' ').trim() // 공백 정리
  }
}

/**
 * 장소명에서 행정동 기반 동네 이름 추정
 * @param placeName 장소명 (예: "시청역1호선", "롯데월드타워")
 * @param address 주소
 * @returns 행정동 기반 사용자 친화적인 동네 이름 (부개3동, 양평1동 등)
 */
export function getDisplayNeighborhoodName(
  placeName: string,
  address: string,
  roadAddress?: string
): string {
  const extracted = extractAdministrativeDong(address, roadAddress)
  
  // 행정동이 명확한 경우 우선 사용 (부개3동, 양평1동 등)
  if (extracted.neighborhood && /\d+동$/.test(extracted.neighborhood)) {
    return extracted.neighborhood
  }
  
  // 일반 동명이 있는 경우
  if (extracted.neighborhood && extracted.neighborhood.endsWith('동')) {
    return extracted.neighborhood
  }
  
  // 가명이 있는 경우 (태평로1가 등)
  if (extracted.neighborhood && /\d*가$/.test(extracted.neighborhood)) {
    return extracted.neighborhood
  }
  
  // 역명인 경우 동네 이름 우선
  if (placeName.includes('역') || placeName.includes('호선')) {
    return extracted.full
  }
  
  // 건물명인 경우 동네 이름 우선
  if (placeName.includes('타워') || placeName.includes('빌딩') || placeName.includes('몰') || placeName.includes('마트')) {
    return extracted.full
  }
  
  // 일반 장소명은 그대로 사용하되, 너무 길면 동네 이름으로
  if (placeName.length > 8) {
    return extracted.full
  }
  
  return placeName
}

// 기존 함수와의 호환성을 위해 alias 추가
export const extractNeighborhoodFromAddress = extractAdministrativeDong

/**
 * 동네 이름 목록 (자주 사용되는 동네들)
 */
export const POPULAR_NEIGHBORHOODS = [
  '강남구', '서초구', '송파구', '강동구',
  '마포구', '용산구', '중구', '종로구',
  '강서구', '양천구', '구로구', '금천구',
  '영등포구', '동작구', '관악구', '강북구',
  '성북구', '중랑구', '동대문구', '성동구',
  '광진구', '은평구', '서대문구', '노원구',
  '도봉구', '부평구', '계양구', '서구'
]

/**
 * 동네 이름 검증 및 정리
 */
export function normalizeNeighborhoodName(name: string): string {
  return name
    .replace(/\s+/g, ' ')           // 연속 공백 제거
    .replace(/^\s+|\s+$/g, '')      // 앞뒤 공백 제거
    .replace(/\d+호선?/g, '')       // 호선 정보 제거
    .replace(/지하철?/g, '')        // 지하철 문구 제거
    .trim()
}
