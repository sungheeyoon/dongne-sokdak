import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Header from '@/components/Header'
import { useUIStore } from '@/shared/stores/useUIStore'

const push = vi.fn()
const signOut = vi.fn()
let mockUser: { email: string } | null = null
let mockIsAdmin = false

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push, refresh: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/features/auth/presentation/hooks/useAuthViewModel', () => ({
    useAuthViewModel: () => ({ user: mockUser, signOut, initialized: true }),
}))

vi.mock('@/features/profile/presentation/hooks/useProfileViewModel', () => ({
    useProfileViewModel: () => ({ profile: null, isLoading: false }),
}))

vi.mock('@/features/admin/presentation/hooks/useAdminViewModel', () => ({
    useAdminViewModel: () => ({ isAdmin: () => mockIsAdmin }),
}))

vi.mock('@/components/MyNeighborhoodModal', () => ({
    default: () => null,
}))

/**
 * 히트 영역 계약: 모바일 주요 액션은 최소 44px(= Tailwind 11)이다.
 * jsdom은 레이아웃을 계산하지 않으므로 계약 클래스의 존재로 검증한다.
 */
function assertTouchTarget(element: HTMLElement) {
    const cls = element.className
    expect(cls, `${element.getAttribute('aria-label') ?? element.textContent} 의 히트 영역`).toMatch(
        /min-h-11|min-h-\[44px\]|h-11|h-12|h-13|h-14/
    )
    expect(cls, `${element.getAttribute('aria-label') ?? element.textContent} 의 히트 영역`).toMatch(
        /min-w-11|min-w-\[44px\]|w-11|w-12|w-full/
    )
}

beforeEach(() => {
    mockUser = null
    mockIsAdmin = false
    useUIStore.setState({ isAuthModalOpen: false, authMode: 'signin', isReportModalOpen: false })
})

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
})

describe('Header — 로고', () => {
    it('로고는 실제 링크이며 홈을 목적지로 가진다', () => {
        render(<Header />)

        const logo = screen.getByRole('link', { name: /동네속닥/ })
        expect(logo).toHaveAttribute('href', '/')
    })

    it('로고의 접근 가능한 이름에 띄어쓴 "동네 속닥"을 쓰지 않는다', () => {
        render(<Header />)

        const logo = screen.getByRole('link', { name: /동네속닥/ })
        expect(logo.textContent ?? '').not.toMatch(/동네\s+속닥/)
    })
})

describe('Header — 익명 주민의 인증 진입', () => {
    it('데스크톱에서 로그인과 회원가입에 접근할 수 있다', async () => {
        render(<Header />)

        const desktopNav = screen.getByRole('navigation', { name: '주요 메뉴' })
        within(desktopNav).getByRole('button', { name: '로그인' })
        within(desktopNav).getByRole('button', { name: '회원가입' })
    })

    it('데스크톱 로그인 버튼이 로그인 모드로 인증 다이얼로그를 연다', async () => {
        const user = userEvent.setup()
        render(<Header />)

        const desktopNav = screen.getByRole('navigation', { name: '주요 메뉴' })
        await user.click(within(desktopNav).getByRole('button', { name: '로그인' }))

        expect(useUIStore.getState().isAuthModalOpen).toBe(true)
        expect(useUIStore.getState().authMode).toBe('signin')
    })

    it('모바일 메뉴 안에서도 로그인과 회원가입에 접근할 수 있다', async () => {
        const user = userEvent.setup()
        render(<Header />)

        await user.click(screen.getByRole('button', { name: '메뉴 열기' }))

        const mobileNav = screen.getByRole('navigation', { name: '모바일 메뉴' })
        within(mobileNav).getByRole('button', { name: '로그인' })
        within(mobileNav).getByRole('button', { name: '회원가입' })
    })

    it('모바일 회원가입 버튼이 회원가입 모드로 인증 다이얼로그를 연다', async () => {
        const user = userEvent.setup()
        render(<Header />)

        await user.click(screen.getByRole('button', { name: '메뉴 열기' }))
        const mobileNav = screen.getByRole('navigation', { name: '모바일 메뉴' })
        await user.click(within(mobileNav).getByRole('button', { name: '회원가입' }))

        expect(useUIStore.getState().isAuthModalOpen).toBe(true)
        expect(useUIStore.getState().authMode).toBe('signup')
    })
})

describe('Header — 모바일 메뉴 토글', () => {
    it('앱 셸과 홈이 같은 1024px 데스크톱 브레이크포인트를 쓴다', async () => {
        const user = userEvent.setup()
        render(<Header />)

        expect(screen.getByRole('banner').firstElementChild?.className).toMatch(/h-14.*lg:h-16/)
        expect(screen.getByAltText('동네속닥').className).toMatch(/h-8.*w-\[120px\]/)
        expect(screen.getByRole('navigation', { name: '주요 메뉴' }).className).toMatch(/hidden lg:flex/)
        expect(screen.getByRole('button', { name: '메뉴 열기' }).parentElement?.className).toMatch(/lg:hidden/)

        await user.click(screen.getByRole('button', { name: '메뉴 열기' }))
        expect(screen.getByRole('navigation', { name: '모바일 메뉴' }).className).toMatch(/lg:hidden/)
    })

    it('토글 버튼에 접근 가능한 이름과 확장 상태가 있다', async () => {
        const user = userEvent.setup()
        render(<Header />)

        const toggle = screen.getByRole('button', { name: '메뉴 열기' })
        expect(toggle).toHaveAttribute('aria-expanded', 'false')

        await user.click(toggle)

        const openToggle = screen.getByRole('button', { name: '메뉴 닫기' })
        expect(openToggle).toHaveAttribute('aria-expanded', 'true')
        expect(screen.getByRole('navigation', { name: '모바일 메뉴' })).toBeInTheDocument()
    })

    it('다시 누르면 모바일 메뉴가 닫힌다', async () => {
        const user = userEvent.setup()
        render(<Header />)

        await user.click(screen.getByRole('button', { name: '메뉴 열기' }))
        await user.click(screen.getByRole('button', { name: '메뉴 닫기' }))

        expect(screen.queryByRole('navigation', { name: '모바일 메뉴' })).not.toBeInTheDocument()
    })

    it('토글 버튼이 최소 44px 히트 영역 계약을 지킨다', () => {
        render(<Header />)

        assertTouchTarget(screen.getByRole('button', { name: '메뉴 열기' }))
    })
})

describe('Header — 로그인한 주민', () => {
    beforeEach(() => {
        mockUser = { email: 'resident@example.com' }
    })

    it('아이콘 전용 버튼에 모두 접근 가능한 이름이 있다', () => {
        render(<Header />)

        // 모바일 제보하기는 아이콘 전용이므로 aria-label로 이름을 얻는다.
        const iconOnlyReportButton = screen
            .getAllByRole('button', { name: '제보하기' })
            .find((button) => button.getAttribute('aria-label') === '제보하기')

        expect(iconOnlyReportButton).toBeDefined()
        assertTouchTarget(iconOnlyReportButton!)
        screen.getByRole('button', { name: '프로필 메뉴 열기' })
    })

    it('제보하기가 제보 작성 화면을 연다', async () => {
        const user = userEvent.setup()
        render(<Header />)

        const desktopNav = screen.getByRole('navigation', { name: '주요 메뉴' })
        await user.click(within(desktopNav).getByRole('button', { name: '제보하기' }))

        expect(useUIStore.getState().isReportModalOpen).toBe(true)
    })

    it('프로필 메뉴를 키보드로 열고 닫을 수 있다', async () => {
        const user = userEvent.setup()
        render(<Header />)

        const trigger = screen.getByRole('button', { name: '프로필 메뉴 열기' })
        trigger.focus()
        await user.keyboard('{Enter}')

        const menu = screen.getByRole('menu', { name: '프로필 메뉴' })
        within(menu).getByRole('menuitem', { name: '프로필 설정' })
        within(menu).getByRole('menuitem', { name: '로그아웃' })

        await user.keyboard('{Escape}')
        expect(screen.queryByRole('menu', { name: '프로필 메뉴' })).not.toBeInTheDocument()
    })
})

describe('Header — 의미 기반 토큰', () => {
    it('앱 셸이 직접 gray/blue/violet 계열 유틸리티를 쓰지 않는다', () => {
        mockUser = { email: 'resident@example.com' }
        mockIsAdmin = true
        const { container } = render(<Header />)

        const raw = Array.from(container.querySelectorAll<HTMLElement>('*'))
            .flatMap((el) => el.className.toString().split(/\s+/))
            .filter((cls) => /^(bg|text|border|ring)-(gray|slate|zinc|neutral|blue|violet|red|green|amber|emerald)-\d{2,3}$/.test(cls))

        expect(raw).toEqual([])
    })
})
