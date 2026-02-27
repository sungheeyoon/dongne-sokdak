import { Report, ReportCategory, ReportStatus, Comment } from '@/types'

// 재사용을 위해 기존 타입을 그대로 참조
export type { Report, Comment }
// export enum ReportCategory { ... } 는 '@/types'에 정의된 것 사용
export { ReportCategory, ReportStatus }

export interface ReportsFilter {
    category?: ReportCategory
    search?: string
    limit?: number
    cursor?: string // 페이지네이션용
    north?: number
    south?: number
    east?: number
    west?: number
}
