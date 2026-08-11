import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useMapInitializationViewModel } from '@/features/map/presentation/hooks/useMapInitializationViewModel'

type Props = {
    isAuthInitialized: boolean
    isLoadingProfile: boolean
    adapter: any
}

describe('useMapInitializationViewModel (지도 마운트 전 단일 게이트)', () => {
    const originalApiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY

    beforeEach(() => {
        process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY = 'test-key'
    })

    afterEach(() => {
        process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY = originalApiKey
    })

    it('starts in the loading status', () => {
        const adapter = { ready: vi.fn().mockResolvedValue(true) }
        const { result } = renderHook(() => useMapInitializationViewModel({
            isAuthInitialized: true,
            isLoadingProfile: false,
            adapter: adapter as any,
        }))

        expect(result.current.status).toBe('loading')
    })

    it('becomes ready once the SDK is ready and the profile/neighborhood lookup has already resolved', async () => {
        const adapter = { ready: vi.fn().mockResolvedValue(true) }
        const { result } = renderHook(() => useMapInitializationViewModel({
            isAuthInitialized: true,
            isLoadingProfile: false,
            adapter: adapter as any,
        }))

        await waitFor(() => expect(result.current.status).toBe('ready'), { timeout: 3000 })
    }, 10000)

    it('stays loading while the profile is still resolving even after the SDK reports ready, then flips to ready once it resolves', async () => {
        const adapter = { ready: vi.fn().mockResolvedValue(true) }
        const { result, rerender } = renderHook<ReturnType<typeof useMapInitializationViewModel>, Props>(
            (props) => useMapInitializationViewModel(props),
            {
                initialProps: {
                    isAuthInitialized: true,
                    isLoadingProfile: true,
                    adapter: adapter as any,
                },
            }
        )

        // Give the SDK wait a chance to resolve — it must not flip to 'ready' by itself.
        await waitFor(() => expect(adapter.ready).toHaveBeenCalled(), { timeout: 3000 })
        expect(result.current.status).toBe('loading')

        rerender({
            isAuthInitialized: true,
            isLoadingProfile: false,
            adapter: adapter as any,
        })

        await waitFor(() => expect(result.current.status).toBe('ready'), { timeout: 3000 })
    }, 10000)

    it('reports an error when the injected adapter says the SDK failed to load', async () => {
        const adapter = { ready: vi.fn().mockResolvedValue(false) }
        const { result } = renderHook(() => useMapInitializationViewModel({
            isAuthInitialized: true,
            isLoadingProfile: false,
            adapter: adapter as any,
        }))

        await waitFor(() => expect(result.current.status).toBe('error'), { timeout: 3000 })
        // 기술 상세는 개발 로그용으로만 남는다 — 화면 문구로 쓰지 않는다 (#20)
        expect(result.current.technicalReason).toMatch(/ready\(\)/)
    }, 10000)

    it('reports an error when the adapter rejects during initialization', async () => {
        const adapter = { ready: vi.fn().mockRejectedValue(new Error('boom')) }
        const { result } = renderHook(() => useMapInitializationViewModel({
            isAuthInitialized: true,
            isLoadingProfile: false,
            adapter: adapter as any,
        }))

        await waitFor(() => expect(result.current.status).toBe('error'), { timeout: 3000 })
        expect(result.current.technicalReason).toMatch(/boom/)
    }, 10000)

    it('reports a missing API key immediately, without waiting on the adapter', async () => {
        process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY = ''
        const adapter = { ready: vi.fn().mockResolvedValue(true) }
        const { result } = renderHook(() => useMapInitializationViewModel({
            isAuthInitialized: true,
            isLoadingProfile: false,
            adapter: adapter as any,
        }))

        await waitFor(() => expect(result.current.status).toBe('error'), { timeout: 3000 })
        expect(result.current.technicalReason).toMatch(/NEXT_PUBLIC_KAKAO_MAP_API_KEY/)
        expect(adapter.ready).not.toHaveBeenCalled()
    }, 10000)

    it('retry는 지도 초기화만 다시 실행한다', async () => {
        const adapter = { ready: vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true) }
        const { result } = renderHook(() => useMapInitializationViewModel({
            isAuthInitialized: true,
            isLoadingProfile: false,
            adapter: adapter as any,
        }))

        await waitFor(() => expect(result.current.status).toBe('error'), { timeout: 3000 })

        act(() => result.current.retry())

        await waitFor(() => expect(result.current.status).toBe('ready'), { timeout: 3000 })
        expect(adapter.ready).toHaveBeenCalledTimes(2)
    }, 15000)
})
