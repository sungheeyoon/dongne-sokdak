/**
 * 주소에서 장소명과 주소를 분리하는 유틸리티 함수들
 */
import { formatToAdministrativeAddress } from './addressUtils';

export interface LocationDisplay {
  placeName: string;
  address: string;
  showSeparate: boolean; // 장소명과 주소를 분리해서 표시할지 여부
}

/**
 * 제보의 주소 정보를 분석하여 장소명과 주소를 분리
 */
export function parseReportLocation(address?: string): LocationDisplay {
  if (!address) {
    return {
      placeName: '위치 정보 없음',
      address: '',
      showSeparate: false
    };
  }

  // 패턴 1: "롯데마트 부평점, 인천광역시 부평구 ..." 형태
  const commaPattern = /^([^,]+),\s*(.+)$/;
  const commaMatch = address.match(commaPattern);
  
  if (commaMatch) {
    const [, placeName, addressPart] = commaMatch;
    // 장소명이 의미가 있는 경우 (단순 주소가 아닌 경우)
    if (!isSimpleAddress(placeName)) {
      return {
        placeName: placeName.trim(),
        address: formatToAdministrativeAddress(addressPart.trim()),
        showSeparate: true
      };
    }
  }

  // 패턴 2: "서울특별시 강남구 테헤란로 123 (역삼동, ABC빌딩)" 형태
  const buildingPattern = /^(.+?)\s*\(.*?([^,\)]+빌딩|[^,\)]+센터|[^,\)]+타워|[^,\)]+몰|[^,\)]+마트|[^,\)]+점)\).*$/;
  const buildingMatch = address.match(buildingPattern);
  
  if (buildingMatch) {
    const [, addressPart, placeName] = buildingMatch;
    return {
      placeName: placeName.trim(),
      address: formatToAdministrativeAddress(addressPart.trim()),
      showSeparate: true
    };
  }

  // 패턴 3: "ABC빌딩 서울특별시..." 형태 (장소명이 앞에 있는 경우)
  const frontPlacePattern = /^([^가-힣]*(?:빌딩|센터|타워|몰|마트|점|역|학교|병원|은행|카페|식당))\s+(.+)$/;
  const frontPlaceMatch = address.match(frontPlacePattern);
  
  if (frontPlaceMatch) {
    const [, placeName, addressPart] = frontPlaceMatch;
    return {
      placeName: placeName.trim(),
      address: formatToAdministrativeAddress(addressPart.trim()),
      showSeparate: true
    };
  }

  // 패턴 4: 특정 키워드가 포함된 경우 (예: "부평역 근처", "강남구청 앞")
  const landmarkPattern = /(.*?(?:역|구청|시청|학교|병원|은행|마트|몰|점))\s+(.+)/;
  const landmarkMatch = address.match(landmarkPattern);
  
  if (landmarkMatch) {
    const [, placeName, addressPart] = landmarkMatch;
    if (!isSimpleAddress(placeName)) {
      return {
        placeName: placeName.trim(),
        address: formatToAdministrativeAddress(addressPart.trim()),
        showSeparate: true
      };
    }
  }

  // 분리할 수 없는 경우 전체를 주소로 처리
  return {
    placeName: '',
    address: formatToAdministrativeAddress(address),
    showSeparate: false
  };
}

/**
 * 단순한 주소인지 확인 (장소명으로 의미가 없는 경우)
 */
function isSimpleAddress(text: string): boolean {
  // 단순 주소 패턴들
  const simplePatterns = [
    /^\d+번지?$/, // "123번지"
    /^[가-힣]+시$/, // "부평시"
    /^[가-힣]+구$/, // "강남구"
    /^[가-힣]+동$/, // "역삼동"
    /^[가-힣]+로\s*\d*$/, // "테헤란로"
    /^\d+$/, // 단순 숫자
    /^[가-힣]+시\s+[가-힣]+구$/ // "서울시 강남구"
  ];

  return simplePatterns.some(pattern => pattern.test(text.trim()));
}

/**
 * 행정동 기반으로 동네명 추출
 */
export function getDisplayNeighborhood(address: string): string {
  return formatToAdministrativeAddress(address);
}