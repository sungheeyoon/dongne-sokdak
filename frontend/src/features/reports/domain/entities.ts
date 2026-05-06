import { Report, ReportCategory, ReportStatus, Comment } from '@/types'

// 재사용을 위해 기존 타입을 그대로 참조
export type { Report, Comment }
// export enum ReportCategory { ... } 는 '@/types'에 정의된 것 사용
export { ReportCategory, ReportStatus }

export interface ReportsFilter {
    category?: ReportCategory
    status?: ReportStatus
    userId?: string
    search?: string
    limit?: number
    cursor?: string // 페이지네이션용
    north?: number
    south?: number
    east?: number
    west?: number
    page?: number // 서버사이드 페이징 지원
}

export interface PaginatedReports {
    items: Report[]
    totalCount: number
    totalPages: number
    page: number
    limit: number
}

// 비즈니스 규칙: 유효하지 않은 좌표({lat: 0, lng: 0} 또는 NaN) 필터링 (데이터 정합성)
export function isValidReportCoordinate(report: Report): boolean {
    if (!report || !report.location) return false;
    const { lat, lng } = report.location;

    // 위도/경도가 유효한 숫자인지 확인
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
        return false;
    }

    // 완전히 0,0 인 경우는 한국 영토가 아니므로(적도 근처 바다) 유효하지 않은 데이터로 간주
    if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) {
        return false;
    }

    // 선택적: 한국 위경도 바운더리 체크 추가 가능 (lat: 33~39, lng: 124~132)
    if (lat < 30 || lat > 40 || lng < 120 || lng > 135) {
        return false;
    }

    return true;
}
