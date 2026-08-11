import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthDialog } from '@/features/auth/presentation/components/AuthDialog'
import { useUIStore } from '@/shared/stores/useUIStore'

const signIn = vi.fn()

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/features/auth/presentation/hooks/useAuthViewModel', () => ({
    useAuthViewModel: () => ({
        signIn,
        signUp: vi.fn(),
        signInWithKakao: vi.fn(),
        signInWithGoogle: vi.fn(),
    }),
}))

beforeEach(() => {
    useUIStore.setState({ isAuthModalOpen: true, authMode: 'signin' })
})

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
})

describe('AuthDialog — 용어와 이름', () => {
    it('제목이 붙여 쓴 브랜드명 "동네속닥"이다', () => {
        render(<AuthDialog />)

        const dialog = screen.getByRole('dialog')
        expect(dialog).toHaveAccessibleName('동네속닥')
    })

    it('닫기 버튼에 한국어 접근 가능한 이름이 있다', () => {
        render(<AuthDialog />)

        screen.getByRole('button', { name: '닫기' })
        expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
    })
})

describe('AuthDialog — 폼 접근성', () => {
    it('이메일과 비밀번호 입력에 label이 연결되어 있다', () => {
        render(<AuthDialog />)

        expect(screen.getByLabelText('이메일')).toBeInTheDocument()
        expect(screen.getByLabelText('비밀번호')).toBeInTheDocument()
    })

    it('검증 오류가 입력과 프로그래매틱하게 연결된다', async () => {
        const user = userEvent.setup()
        render(<AuthDialog />)

        await user.type(screen.getByLabelText('이메일'), 'not-an-email')
        await user.click(screen.getByRole('button', { name: '로그인' }))

        const email = screen.getByLabelText('이메일')
        await waitFor(() => expect(email).toHaveAttribute('aria-invalid', 'true'))

        const describedBy = email.getAttribute('aria-describedby')
        expect(describedBy).toBeTruthy()
        const message = describedBy!
            .split(' ')
            .map((id) => document.getElementById(id))
            .find((node) => node?.textContent?.includes('이메일'))
        expect(message).toBeTruthy()
    })
})

describe('AuthDialog — 의미 기반 토큰', () => {
    it('인증 흐름이 직접 gray/blue/red 계열 유틸리티를 쓰지 않는다', () => {
        render(<AuthDialog />)

        const raw = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"] *'))
            .flatMap((el) => el.className.toString().split(/\s+/))
            .filter((cls) => /^(bg|text|border|ring)-(gray|slate|zinc|neutral|blue|violet|red|green|amber|emerald)-\d{2,3}$/.test(cls))

        expect(raw).toEqual([])
    })
})

describe('AuthDialog — 키보드', () => {
    it('열릴 때 포커스가 다이얼로그 안으로 들어간다', async () => {
        render(<AuthDialog />)

        const dialog = screen.getByRole('dialog')
        await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
    })

    it('Escape로 닫히고 스토어 상태가 갱신된다', async () => {
        const user = userEvent.setup()
        render(<AuthDialog />)

        await user.keyboard('{Escape}')

        await waitFor(() => expect(useUIStore.getState().isAuthModalOpen).toBe(false))
    })

    it('Tab 포커스가 다이얼로그를 벗어나지 않는다', async () => {
        const user = userEvent.setup()
        render(<AuthDialog />)

        const dialog = screen.getByRole('dialog')
        for (let i = 0; i < 12; i += 1) {
            await user.tab()
            expect(dialog.contains(document.activeElement)).toBe(true)
        }
    })
})
