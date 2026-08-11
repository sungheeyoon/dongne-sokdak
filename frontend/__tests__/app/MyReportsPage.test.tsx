import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MyReportsPage from '@/app/my-reports/page'
import { useUIStore } from '@/shared/stores/useUIStore'

const push = vi.fn()
const refetch = vi.fn()

let mockUser: { id: string; email: string } | null = null
let mockInitialized = true
let mockReports: unknown[] = []
let mockIsLoading = false
let mockError: Error | null = null

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('@/components/Header', () => ({ default: () => null }))
vi.mock('@/features/auth/presentation/components/AuthDialog', () => ({ AuthDialog: () => null }))
vi.mock('@/features/reports/presentation/components/ReportModal', () => ({ default: () => null }))
vi.mock('@/features/reports/presentation/components/EditReportModal', () => ({ default: () => null }))

vi.mock('@/features/auth/presentation/hooks/useAuthViewModel', () => ({
    useAuthViewModel: () => ({ user: mockUser, initialized: mockInitialized }),
}))

vi.mock('@/features/reports/presentation/hooks/useReportsViewModel', () => ({
    useMyReportsViewModel: () => ({
        reports: mockReports,
        totalCount: mockReports.length,
        totalPages: 1,
        currentPage: 1,
        isLoading: mockIsLoading,
        error: mockError,
        refetch,
    }),
}))

const report = {
    id: 'r1',
    userId: 'u1',
    title: '도로에 큰 웅덩이가 생겼습니다',
    description: '비 온 뒤부터 물이 고여 있습니다',
    category: 'FACILITY',
    status: 'IN_PROGRESS',
    address: '서울 성동구 성수동',
    location: { lat: 37.5, lng: 127.0 },
    voteCount: 2,
    commentCount: 1,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
}

beforeEach(() => {
    mockUser = { id: 'u1', email: 'resident@example.com' }
    mockInitialized = true
    mockReports = []
    mockIsLoading = false
    mockError = null
    useUIStore.setState({ isAuthModalOpen: false, authMode: 'signin', isReportModalOpen: false })
})

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
})

describe('내 활동 — 인증 상태', () => {
    it('인증 초기화 전에는 익명 화면도 오류 화면도 노출하지 않는다', () => {
        mockInitialized = false
        mockUser = null
        mockError = new Error('boom')

        render(<MyReportsPage />)

        expect(screen.queryByRole('button', { name: '로그인' })).not.toBeInTheDocument()
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
        expect(screen.getByTestId('my-activity-skeleton')).toBeInTheDocument()
    })

    it('익명 주민에게 이유와 로그인, 홈으로를 함께 준다', () => {
        mockUser = null

        render(<MyReportsPage />)

        expect(screen.getByText('로그인하면 내 제보를 볼 수 있어요')).toBeInTheDocument()
        screen.getByRole('button', { name: '로그인' })
        screen.getByRole('button', { name: '홈으로' })
    })

    it('익명 화면을 오류로 다루지 않는다', () => {
        mockUser = null

        render(<MyReportsPage />)

        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('로그인 CTA가 인증 다이얼로그를 연다', async () => {
        mockUser = null
        const user = userEvent.setup()
        render(<MyReportsPage />)

        await user.click(screen.getByRole('button', { name: '로그인' }))

        expect(useUIStore.getState().isAuthModalOpen).toBe(true)
        expect(useUIStore.getState().authMode).toBe('signin')
        // 다이얼로그로 열리므로 다른 화면으로 보내지 않는다 — 성공하면 이 화면에 그대로 남는다
        expect(push).not.toHaveBeenCalled()
    })

    it('홈으로는 라우터를 쓴다', async () => {
        mockUser = null
        const user = userEvent.setup()
        render(<MyReportsPage />)

        await user.click(screen.getByRole('button', { name: '홈으로' }))

        expect(push).toHaveBeenCalledWith('/')
    })
})

describe('내 활동 — 데이터 상태', () => {
    it('인증된 주민의 로딩은 화면 구조를 반영한 스켈레톤이다', () => {
        mockIsLoading = true

        render(<MyReportsPage />)

        expect(screen.getByTestId('my-activity-skeleton')).toBeInTheDocument()
    })

    it('작성한 제보가 없으면 빈 상태와 제보 작성 CTA를 준다', () => {
        render(<MyReportsPage />)

        expect(screen.getByText('아직 작성한 제보가 없어요')).toBeInTheDocument()
        screen.getByRole('button', { name: '제보하기' })
    })

    it('빈 상태를 오류로 다루지 않는다', () => {
        render(<MyReportsPage />)

        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('복구 가능한 오류에는 재시도가 있고 전체 새로고침을 하지 않는다', async () => {
        mockError = new Error('boom')
        const user = userEvent.setup()
        render(<MyReportsPage />)

        screen.getByRole('alert')
        await user.click(screen.getByRole('button', { name: '다시 시도' }))

        expect(refetch).toHaveBeenCalledOnce()
    })

    it('제보가 있으면 목록으로 보여준다', () => {
        mockReports = [report]

        render(<MyReportsPage />)

        expect(screen.getByText('도로에 큰 웅덩이가 생겼습니다')).toBeInTheDocument()
    })
})

describe('내 활동 — 상태 필터', () => {
    it('모바일에서 가로 오버플로 없이 조작할 수 있는 단일 선택 그룹이다', () => {
        const { container } = render(<MyReportsPage />)

        const group = screen.getByRole('radiogroup', { name: '상태 필터' })
        expect(group.className).toMatch(/overflow-x-auto/)
        expect(group.className).not.toMatch(/flex-wrap/)
        expect(container.querySelector('[role="radiogroup"]')).toBe(group)
    })

    it('상태 라벨이 제보 상태 용어를 따른다', () => {
        render(<MyReportsPage />)

        const labels = screen.getAllByRole('radio').map((chip) => chip.textContent?.trim())
        expect(labels).toEqual(['전체', '접수됨', '처리중', '해결됨'])
    })

    it('선택 상태를 보조기술이 인식한다', async () => {
        const user = userEvent.setup()
        render(<MyReportsPage />)

        await user.click(screen.getByRole('radio', { name: '처리중' }))

        expect(screen.getByRole('radio', { name: '처리중' })).toBeChecked()
        expect(screen.getByRole('radio', { name: '전체' })).not.toBeChecked()
    })
})

describe('내 활동 — 용어', () => {
    it('사용자에게 보이는 문구가 제보 용어를 따른다', () => {
        const { container } = render(<MyReportsPage />)

        expect(container.textContent).not.toMatch(/리포트|게시글/)
    })
})
