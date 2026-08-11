import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HomeViewModeTabs from '@/features/map/presentation/components/HomeViewModeTabs'

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
})

describe('HomeViewModeTabs — 모바일 피드/지도 전환', () => {
    it('선택 상태를 보조기술이 인식할 수 있는 탭 목록이다', () => {
        render(<HomeViewModeTabs mode="feed" onModeChange={vi.fn()} />)

        const tablist = screen.getByRole('tablist', { name: '홈 보기 방식' })
        expect(tablist).toBeInTheDocument()

        expect(screen.getByRole('tab', { name: '제보 피드' })).toHaveAttribute('aria-selected', 'true')
        expect(screen.getByRole('tab', { name: '지도' })).toHaveAttribute('aria-selected', 'false')
    })

    it('지도 탭을 누르면 지도 모드를 요청한다', async () => {
        const user = userEvent.setup()
        const onModeChange = vi.fn()
        render(<HomeViewModeTabs mode="feed" onModeChange={onModeChange} />)

        await user.click(screen.getByRole('tab', { name: '지도' }))

        expect(onModeChange).toHaveBeenCalledExactlyOnceWith('map')
    })

    it('이미 선택된 탭을 다시 눌러도 모드 변경을 요청하지 않는다', async () => {
        const user = userEvent.setup()
        const onModeChange = vi.fn()
        render(<HomeViewModeTabs mode="feed" onModeChange={onModeChange} />)

        await user.click(screen.getByRole('tab', { name: '제보 피드' }))

        expect(onModeChange).not.toHaveBeenCalled()
    })

    it('탭의 히트 영역이 44px 계약을 지킨다', () => {
        render(<HomeViewModeTabs mode="map" onModeChange={vi.fn()} />)

        screen.getAllByRole('tab').forEach((tab) => {
            expect(tab.className).toMatch(/min-h-11|h-11/)
        })
    })
})
