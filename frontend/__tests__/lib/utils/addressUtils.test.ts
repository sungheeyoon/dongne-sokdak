import { describe, it, expect } from 'vitest'
import { formatReportCardAddress, formatToAdministrativeAddress } from '@/lib/utils/addressUtils'
import { isValidReportCoordinate } from '@/features/reports/domain/entities'
import { ReportCategory, ReportStatus } from '@/types'

describe('addressUtils', () => {
  describe('formatToAdministrativeAddress', () => {
    it('should extract dong name correctly from full address', () => {
      expect(formatToAdministrativeAddress('서울 종로구 종로1가 54')).toBe('종로1가')
      expect(formatToAdministrativeAddress('인천 부평구 부개3동 123-45')).toBe('부개3동')
      expect(formatToAdministrativeAddress('서울 강남구 테헤란로 152')).toBe('테헤란로')
    })

    it('should return "주소 없음" for empty or invalid input', () => {
      expect(formatToAdministrativeAddress('')).toBe('주소 없음')
      expect(formatToAdministrativeAddress('주소 없음')).toBe('주소 없음')
    })
  })

  describe('formatReportCardAddress', () => {
    it.each([
      ['서울특별시 강남구 봉은사로 630', '강남구 봉은사로 630'],
      ['서울특별시 강남구 삼성동 451-82', '강남구 삼성동 451-82'],
      ['경상북도 성남시 수정구 가락195길 586-60', '성남시 수정구 가락195길 586-60'],
      ['충청남도 강릉시 봉은사길 지하136 (경수이김동)', '강릉시 봉은사길 지하136'],
      ['중구 태평로1가', '중구 태평로1가'],
    ])('%s를 사람이 찾을 수 있는 같은 주소 단위로 줄인다', (address, expected) => {
      expect(formatReportCardAddress(address)).toBe(expected)
    })

    it('행정 정보 없는 지번 숫자만 있으면 오해를 막기 위해 위치 없음으로 표시한다', () => {
      expect(formatReportCardAddress('451-82')).toBe('위치 정보 없음')
    })
  })
})

describe('entities', () => {
  describe('isValidReportCoordinate', () => {
    const mockReport: any = {
      id: '1',
      title: 'Test',
      description: 'Test',
      category: ReportCategory.OTHER,
      status: ReportStatus.OPEN,
      location: { lat: 37.5, lng: 127.0 },
      author_id: 'user1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    it('should return true for valid coordinates in Korea', () => {
      expect(isValidReportCoordinate(mockReport)).toBe(true)
    })

    it('should return false for (0,0)', () => {
      const invalidReport = { ...mockReport, location: { lat: 0, lng: 0 } }
      expect(isValidReportCoordinate(invalidReport)).toBe(false)
    })

    it('should return false for coordinates outside Korea', () => {
      const outsideReport = { ...mockReport, location: { lat: 20, lng: 100 } }
      expect(isValidReportCoordinate(outsideReport)).toBe(false)
    })

    it('should return false for non-numeric coordinates', () => {
      const nanReport = { ...mockReport, location: { lat: NaN, lng: 127 } }
      expect(isValidReportCoordinate(nanReport)).toBe(false)
    })
  })
})
