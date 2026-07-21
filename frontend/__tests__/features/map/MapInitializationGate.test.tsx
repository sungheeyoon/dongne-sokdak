import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import MapInitializationGate, { MapLoadingFallback } from '@/features/map/presentation/components/MapInitializationGate'

describe('MapInitializationGate', () => {
    const originalApiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY

    beforeEach(() => {
        process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY = 'test-key'
    })

    afterEach(() => {
        process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY = originalApiKey
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

    it('renders the children once both the SDK and the profile/neighborhood lookup are ready', async () => {
        const adapter = { ready: vi.fn().mockResolvedValue(true) }

        render(
            <MapInitializationGate isAuthInitialized={true} isLoadingProfile={false} adapter={adapter as any}>
                <div>지도 본체</div>
            </MapInitializationGate>
        )

        await waitFor(() => expect(screen.getByText('지도 본체')).toBeInTheDocument(), { timeout: 3000 })
    }, 10000)

    it('shows the shared error UI (no emoji, retry via reload) when the SDK fails to load', async () => {
        const adapter = { ready: vi.fn().mockResolvedValue(false) }

        const { container } = render(
            <MapInitializationGate isAuthInitialized={true} isLoadingProfile={false} adapter={adapter as any}>
                <div>지도 본체</div>
            </MapInitializationGate>
        )

        await waitFor(() => expect(screen.getByText('카카오 SDK 로딩 실패')).toBeInTheDocument(), { timeout: 3000 })
        expect(container.querySelector('svg')).toBeInTheDocument()
        expect(container.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u)
        expect(screen.getByRole('button', { name: '페이지 새로고침' })).toBeInTheDocument()
    }, 10000)
})

describe('MapLoadingFallback', () => {
    it('renders the same loading spinner/message the gate uses, so the dynamic-import chunk fallback matches it visually', () => {
        render(<MapLoadingFallback />)

        expect(screen.getByText('지도를 불러오는 중...')).toBeInTheDocument()
    })
})
