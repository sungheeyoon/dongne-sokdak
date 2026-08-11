import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MapInitializationGate, { MapLoadingFallback } from '@/features/map/presentation/components/MapInitializationGate'

/** 사용자 화면에 절대 나오면 안 되는 내부 용어 */
const INTERNAL_TERMS = /Kakao|SDK|API 키|NEXT_PUBLIC|appkey|undefined|null/i

describe('MapInitializationGate', () => {
    const originalApiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY

    beforeEach(() => {
        process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY = 'test-key'
    })

    afterEach(() => {
        cleanup()
        process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY = originalApiKey
        vi.clearAllMocks()
    })

    it('shows a single loading spinner while the SDK/profile gate is pending, and never renders the children yet', () => {
        const adapter = { ready: vi.fn().mockResolvedValue(true) }

        render(
            <MapInitializationGate isAuthInitialized={false} isLoadingProfile={true} adapter={adapter as any}>
                <div>지도 본체</div>
            </MapInitializationGate>
        )

        expect(screen.getByText('지도를 불러오는 중...')).toBeInTheDocument()
        expect(screen.queryByText('지도 본체')).not.toBeInTheDocument()
    })

    it('로딩 placeholder가 최종 지도 높이를 그대로 써서 레이아웃 점프를 없앤다', () => {
        const adapter = { ready: vi.fn().mockResolvedValue(true) }

        const { container } = render(
            <MapInitializationGate
                isAuthInitialized={false}
                isLoadingProfile={true}
                adapter={adapter as any}
                height="480px"
            >
                <div>지도 본체</div>
            </MapInitializationGate>
        )

        expect(container.querySelector<HTMLElement>('[style*="height"]')?.style.height).toBe('480px')
    })

    it('renders the children once both the SDK and the profile/neighborhood lookup are ready', async () => {
        const adapter = { ready: vi.fn().mockResolvedValue(true) }

        render(
            <MapInitializationGate isAuthInitialized={true} isLoadingProfile={false} adapter={adapter as any}>
                <div>지도 본체</div>
            </MapInitializationGate>
        )

        await waitFor(() => expect(screen.getByText('지도 본체')).toBeInTheDocument(), { timeout: 3000 })
    }, 10000)

    it('실패하면 사용자 언어로 안내하고 내부 기술 용어를 노출하지 않는다', async () => {
        const adapter = { ready: vi.fn().mockResolvedValue(false) }

        const { container } = render(
            <MapInitializationGate isAuthInitialized={true} isLoadingProfile={false} adapter={adapter as any}>
                <div>지도 본체</div>
            </MapInitializationGate>
        )

        await waitFor(() => expect(screen.getByText('지금은 지도를 표시할 수 없어요')).toBeInTheDocument(), { timeout: 3000 })
        expect(container.textContent).not.toMatch(INTERNAL_TERMS)
        expect(container.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u)
        expect(screen.queryByRole('button', { name: '페이지 새로고침' })).not.toBeInTheDocument()
    }, 10000)

    it('API 키가 없어도 환경 변수 이름을 사용자에게 노출하지 않는다', async () => {
        delete process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY
        const adapter = { ready: vi.fn().mockResolvedValue(true) }

        const { container } = render(
            <MapInitializationGate isAuthInitialized={true} isLoadingProfile={false} adapter={adapter as any}>
                <div>지도 본체</div>
            </MapInitializationGate>
        )

        await waitFor(() => expect(screen.getByText('지금은 지도를 표시할 수 없어요')).toBeInTheDocument())
        expect(container.textContent).not.toMatch(INTERNAL_TERMS)
    })

    it('재시도는 페이지를 새로고침하지 않고 지도 초기화만 다시 실행한다', async () => {
        const adapter = { ready: vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true) }
        const user = userEvent.setup()

        render(
            <MapInitializationGate isAuthInitialized={true} isLoadingProfile={false} adapter={adapter as any}>
                <div>지도 본체</div>
            </MapInitializationGate>
        )

        await waitFor(() => screen.getByRole('button', { name: '지도 다시 시도' }), { timeout: 3000 })
        await user.click(screen.getByRole('button', { name: '지도 다시 시도' }))

        await waitFor(() => expect(adapter.ready).toHaveBeenCalledTimes(2), { timeout: 3000 })
        await waitFor(() => expect(screen.getByText('지도 본체')).toBeInTheDocument(), { timeout: 3000 })
    }, 15000)

    it('축소형 안내는 접힌 한 줄로 표시된다', async () => {
        const adapter = { ready: vi.fn().mockResolvedValue(false) }

        render(
            <MapInitializationGate
                isAuthInitialized={true}
                isLoadingProfile={false}
                adapter={adapter as any}
                compact
            >
                <div>지도 본체</div>
            </MapInitializationGate>
        )

        await waitFor(() => screen.getByText('지금은 지도를 표시할 수 없어요'), { timeout: 3000 })

        // 축소형은 고정 240px 박스를 쓰지 않는다 — 피드를 접힌 영역 아래로 밀어내면 안 된다
        const notice = screen.getByRole('status')
        expect(notice.getAttribute('style')).toBeNull()
        expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
    }, 10000)

    it('오류를 한 번만 공지하고 반복 알림을 만들지 않는다', async () => {
        const adapter = { ready: vi.fn().mockResolvedValue(false) }

        render(
            <MapInitializationGate isAuthInitialized={true} isLoadingProfile={false} adapter={adapter as any}>
                <div>지도 본체</div>
            </MapInitializationGate>
        )

        await waitFor(() => screen.getByText('지금은 지도를 표시할 수 없어요'), { timeout: 3000 })
        expect(screen.getAllByRole('status')).toHaveLength(1)
    }, 10000)
})

describe('MapLoadingFallback', () => {
    it('renders the same loading spinner/message the gate uses, so the dynamic-import chunk fallback matches it visually', () => {
        render(<MapLoadingFallback />)

        expect(screen.getByText('지도를 불러오는 중...')).toBeInTheDocument()
    })
})
