import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ReportDetailPage from '@/app/reports/[id]/page'
import { REPORT_DETAIL_REGIONS } from '@/features/reports/presentation/components/ReportDetailView'

const push = vi.fn()
const refetch = vi.fn()
const deleteReport = vi.fn().mockResolvedValue(undefined)

let mockUser: { id: string; email: string } | null = null
let mockReport: Record<string, unknown> | undefined
let mockIsLoading = false
let mockError: Error | null = null

vi.mock('next/navigation', () => ({
    useParams: () => ({ id: 'r1' }),
    useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
}))

vi.mock('@/components/Header', () => ({ default: () => null }))
vi.mock('@/features/auth/presentation/components/AuthDialog', () => ({ AuthDialog: () => null }))
vi.mock('@/features/reports/presentation/components/ReportModal', () => ({ default: () => null }))
vi.mock('@/features/reports/presentation/components/EditReportModal', () => ({ default: () => null }))
vi.mock('@/features/reports/presentation/components/Comments', () => ({
    default: () => <div data-testid="comments" />,
}))
vi.mock('@/features/reports/presentation/components/VoteButton', () => ({
    default: () => <button type="button">공감 3</button>,
}))
vi.mock('@/features/map/presentation/components/MapComponent', () => ({
    default: () => <div data-testid="detail-map" />,
}))

vi.mock('@/features/auth/presentation/hooks/useAuthViewModel', () => ({
    useAuthViewModel: () => ({ user: mockUser, initialized: true }),
}))

vi.mock('@/features/reports/presentation/hooks/useReportsViewModel', () => ({
    useReportViewModel: () => ({ report: mockReport, isLoading: mockIsLoading, error: mockError, refetch }),
}))

vi.mock('@/features/reports/presentation/hooks/useMutateReportViewModel', () => ({
    useMutateReportViewModel: () => ({ deleteReport }),
}))

const report = {
    id: 'r1',
    userId: 'owner',
    title: '도로에 큰 웅덩이가 생겼습니다',
    description: '비 온 뒤부터 물이 고여 있어 보행자가 지나가기 어렵습니다',
    category: 'FACILITY',
    status: 'IN_PROGRESS',
    imageUrl: 'https://example.com/pothole.jpg',
    address: '서울 성동구 성수동2가 100-1',
    location: { lat: 37.5, lng: 127.0 },
    voteCount: 3,
    commentCount: 2,
    createdAt: '2026-08-01T09:00:00Z',
    updatedAt: '2026-08-01T09:00:00Z',
}

beforeEach(() => {
    mockUser = { id: 'other', email: 'neighbour@example.com' }
    mockReport = { ...report }
    mockIsLoading = false
    mockError = null
})

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
})

describe('제보 상세 — 읽기', () => {
    it('제목, 상태, 카테고리, 작성 시각을 함께 보여준다', () => {
        render(<ReportDetailPage />)

        expect(screen.getByRole('heading', { level: 1, name: '도로에 큰 웅덩이가 생겼습니다' })).toBeInTheDocument()
        expect(screen.getByText('처리중')).toBeInTheDocument()
        expect(screen.getByText('시설물')).toBeInTheDocument()
        expect(screen.getByTestId(REPORT_DETAIL_REGIONS.meta)).toBeInTheDocument()
    })

    it('목록 카드와 같은 상태 용어를 쓴다', () => {
        mockReport = { ...report, status: 'RESOLVED' }

        render(<ReportDetailPage />)

        expect(screen.getByText('해결됨')).toBeInTheDocument()
    })

    it('본문 다음에 위치를 보조 정보로 보여준다', () => {
        render(<ReportDetailPage />)

        const body = screen.getByTestId(REPORT_DETAIL_REGIONS.body)
        const location = screen.getByTestId(REPORT_DETAIL_REGIONS.location)

        expect(body.compareDocumentPosition(location) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        expect(within(location).getByText(/성수동/)).toBeInTheDocument()
        expect(screen.getByTestId('detail-map')).toBeInTheDocument()
    })

    it('이미지가 없으면 미디어 구역을 그리지 않는다', () => {
        mockReport = { ...report, imageUrl: undefined }

        render(<ReportDetailPage />)

        expect(screen.queryByTestId(REPORT_DETAIL_REGIONS.media)).not.toBeInTheDocument()
    })

    it('비율이 큰 이미지에도 레이아웃이 무너지지 않게 높이를 제한한다', () => {
        render(<ReportDetailPage />)

        const image = within(screen.getByTestId(REPORT_DETAIL_REGIONS.media)).getByRole('img')
        expect(image.className).toMatch(/object-contain/)
        expect(image.className).toMatch(/max-h-/)
    })

    it('참여 영역과 댓글을 제공한다', () => {
        render(<ReportDetailPage />)

        expect(screen.getByTestId(REPORT_DETAIL_REGIONS.participation)).toBeInTheDocument()
        expect(screen.getByTestId('comments')).toBeInTheDocument()
    })
})

describe('제보 상세 — 소유자 행동', () => {
    it('소유자가 아니면 수정·삭제를 보여주지 않는다', () => {
        render(<ReportDetailPage />)

        expect(screen.queryByRole('button', { name: '제보 수정' })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: '제보 삭제' })).not.toBeInTheDocument()
    })

    it('소유자에게만 수정·삭제를 보여주고 참여 행동과 구분한다', () => {
        mockUser = { id: 'owner', email: 'owner@example.com' }

        render(<ReportDetailPage />)

        const ownerActions = screen.getByTestId(REPORT_DETAIL_REGIONS.ownerActions)
        within(ownerActions).getByRole('button', { name: '제보 수정' })
        within(ownerActions).getByRole('button', { name: '제보 삭제' })
        expect(within(ownerActions).queryByRole('button', { name: /공감/ })).not.toBeInTheDocument()
    })
})

describe('제보 상세 — 삭제 확인', () => {
    beforeEach(() => {
        mockUser = { id: 'owner', email: 'owner@example.com' }
    })

    it('초기 포커스를 취소에 두고 위험 행동 문구에 대상을 쓴다', async () => {
        const user = userEvent.setup()
        render(<ReportDetailPage />)

        await user.click(screen.getByRole('button', { name: '제보 삭제' }))

        const dialog = await screen.findByRole('dialog')
        await waitFor(() => {
            expect(within(dialog).getByRole('button', { name: '취소' })).toHaveFocus()
        })
        within(dialog).getByRole('button', { name: '제보 삭제하기' })
    })

    it('Escape로 닫힌다', async () => {
        const user = userEvent.setup()
        render(<ReportDetailPage />)

        await user.click(screen.getByRole('button', { name: '제보 삭제' }))
        await screen.findByRole('dialog')

        await user.keyboard('{Escape}')

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
        expect(deleteReport).not.toHaveBeenCalled()
    })

    it('확인하면 삭제하고 홈으로 보낸다', async () => {
        const user = userEvent.setup()
        render(<ReportDetailPage />)

        await user.click(screen.getByRole('button', { name: '제보 삭제' }))
        const dialog = await screen.findByRole('dialog')
        await user.click(within(dialog).getByRole('button', { name: '제보 삭제하기' }))

        await waitFor(() => expect(deleteReport).toHaveBeenCalledWith('r1'))
        await waitFor(() => expect(push).toHaveBeenCalledWith('/'))
    })
})

describe('제보 상세 — 로딩과 오류', () => {
    it('스켈레톤이 실제 화면의 주요 구역을 공유한다 (ADR-0009)', () => {
        const { unmount } = render(<ReportDetailPage />)
        const realRegions = Object.values(REPORT_DETAIL_REGIONS)
            .filter((region) => screen.queryByTestId(region))
            .sort()
        unmount()

        mockIsLoading = true
        mockReport = undefined
        render(<ReportDetailPage />)
        const skeletonRegions = Object.values(REPORT_DETAIL_REGIONS)
            .filter((region) => screen.queryByTestId(region))
            .sort()

        expect(skeletonRegions).toEqual(realRegions)
    })

    it('오류에는 재시도와 목록 복귀를 함께 준다', async () => {
        mockError = new Error('boom')
        mockReport = undefined
        const user = userEvent.setup()

        render(<ReportDetailPage />)

        const alert = screen.getByRole('alert')
        await user.click(within(alert).getByRole('button', { name: '다시 시도' }))
        expect(refetch).toHaveBeenCalledOnce()

        await user.click(within(alert).getByRole('button', { name: '목록으로' }))
        expect(push).toHaveBeenCalledWith('/')
    })

    it('내부 기술 문구를 사용자 화면에 노출하지 않는다', () => {
        mockError = new Error('HTTP error! status: 500')
        mockReport = undefined

        const { container } = render(<ReportDetailPage />)

        expect(container.textContent).not.toMatch(/HTTP|status|500/)
    })
})

describe('제보 상세 — 의미 기반 토큰', () => {
    it('직접 gray/blue/red 계열 유틸리티를 쓰지 않는다', () => {
        mockUser = { id: 'owner', email: 'owner@example.com' }
        const { container } = render(<ReportDetailPage />)

        const raw = Array.from(container.querySelectorAll<HTMLElement>('*'))
            .flatMap((el) => el.className.toString().split(/\s+/))
            .filter((cls) => /^(bg|text|border|ring)-(gray|slate|zinc|neutral|blue|violet|red|green|amber|emerald|rose)-\d{2,3}$/.test(cls))

        expect(raw).toEqual([])
    })
})
