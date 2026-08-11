import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProfilePage from '@/app/profile/page'
import { ApiError } from '@/lib/api/config'
import { useUIStore } from '@/shared/stores/useUIStore'

const push = vi.fn()
const refetch = vi.fn()

let mockUser: { id: string; email: string } | null = null
let mockInitialized = true
let mockProfile: unknown = null
let mockIsLoading = false
let mockError: Error | null = null

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('@/components/Header', () => ({ default: () => null }))
vi.mock('@/features/auth/presentation/components/AuthDialog', () => ({ AuthDialog: () => null }))
vi.mock('@/components/ProfileEditModal', () => ({
    default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="profile-edit-modal" /> : null),
}))

vi.mock('@/features/auth/presentation/hooks/useAuthViewModel', () => ({
    useAuthViewModel: () => ({ user: mockUser, initialized: mockInitialized }),
}))

vi.mock('@/features/profile/presentation/hooks/useProfileViewModel', () => ({
    useProfileViewModel: () => ({
        profile: mockProfile,
        isLoading: mockIsLoading,
        error: mockError,
        refetch,
    }),
}))

const profile = {
    id: 'p1',
    userId: 'u1',
    nickname: '동네주민',
    avatarUrl: undefined,
    neighborhood: { placeName: '성수동', address: '서울 성동구 성수동', lat: 37.5, lng: 127.0 },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    stats: { reportCount: 12, commentCount: 5, voteCount: 34, joinedAt: '2026-01-01T00:00:00Z' },
}

beforeEach(() => {
    mockUser = { id: 'u1', email: 'resident@example.com' }
    mockInitialized = true
    mockProfile = profile
    mockIsLoading = false
    mockError = null
    useUIStore.setState({ isAuthModalOpen: false, authMode: 'signin' })
})

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
})

describe('프로필 — 인증 상태', () => {
    it('인증 초기화 전에는 익명 화면도 오류 화면도 노출하지 않는다', () => {
        mockInitialized = false
        mockUser = null
        mockError = new Error('boom')

        render(<ProfilePage />)

        expect(screen.queryByRole('button', { name: '로그인' })).not.toBeInTheDocument()
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
        expect(screen.getByTestId('my-activity-skeleton')).toBeInTheDocument()
    })

    it('익명 주민에게 이유와 로그인, 홈으로를 준다', () => {
        mockUser = null

        render(<ProfilePage />)

        expect(screen.getByText('로그인하면 프로필을 볼 수 있어요')).toBeInTheDocument()
        screen.getByRole('button', { name: '로그인' })
        screen.getByRole('button', { name: '홈으로' })
    })

    it('로그인 CTA가 인증 다이얼로그를 연다', async () => {
        mockUser = null
        const user = userEvent.setup()
        render(<ProfilePage />)

        await user.click(screen.getByRole('button', { name: '로그인' }))

        expect(useUIStore.getState().isAuthModalOpen).toBe(true)
        expect(push).not.toHaveBeenCalled()
    })
})

describe('프로필 — 미생성과 실패의 구분', () => {
    it('프로필이 아직 없으면 만들기 안내를 준다', () => {
        mockProfile = null
        mockError = new ApiError('프로필을 찾을 수 없습니다', 404)

        render(<ProfilePage />)

        expect(screen.getByText('프로필을 아직 만들지 않았어요')).toBeInTheDocument()
        screen.getByRole('button', { name: '프로필 만들기' })
        expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument()
    })

    it('프로필 미생성을 오류로 다루지 않는다', () => {
        mockProfile = null
        mockError = new ApiError('프로필을 찾을 수 없습니다', 404)

        render(<ProfilePage />)

        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('조회에 실패하면 미생성과 다른 화면과 재시도를 준다', async () => {
        mockProfile = null
        mockError = new ApiError('서버 오류', 500)
        const user = userEvent.setup()

        render(<ProfilePage />)

        expect(screen.getByText('프로필을 불러오지 못했어요')).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: '프로필 만들기' })).not.toBeInTheDocument()
        screen.getByRole('alert')

        await user.click(screen.getByRole('button', { name: '다시 시도' }))
        expect(refetch).toHaveBeenCalledOnce()
    })

    it('사용자 화면에 내부 기술 문구를 노출하지 않는다', () => {
        mockProfile = null
        mockError = new ApiError('HTTP error! status: 500', 500)

        const { container } = render(<ProfilePage />)

        expect(container.textContent).not.toMatch(/HTTP|status|500/)
    })
})

describe('프로필 — 정상', () => {
    it('로딩 중에는 화면 구조를 반영한 스켈레톤을 보여준다', () => {
        mockIsLoading = true
        mockProfile = null

        render(<ProfilePage />)

        expect(screen.getByTestId('my-activity-skeleton')).toBeInTheDocument()
    })

    it('닉네임과 활동 통계를 보여준다', () => {
        render(<ProfilePage />)

        expect(screen.getByText('동네주민')).toBeInTheDocument()
        expect(screen.getByText('12')).toBeInTheDocument()
        expect(screen.getByText('34')).toBeInTheDocument()
    })

    it('프로필 수정을 열 수 있다', async () => {
        const user = userEvent.setup()
        render(<ProfilePage />)

        await user.click(screen.getByRole('button', { name: '프로필 수정' }))

        expect(screen.getByTestId('profile-edit-modal')).toBeInTheDocument()
    })

    it('사용자에게 보이는 문구가 제보 용어를 따른다', () => {
        const { container } = render(<ProfilePage />)

        expect(container.textContent).not.toMatch(/리포트|게시글/)
    })
})
