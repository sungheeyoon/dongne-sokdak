import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CategoryFilterChips from '@/features/reports/presentation/components/CategoryFilterChips'

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
})

describe('CategoryFilterChips', () => {
    it('단일 선택 그룹으로 노출되고 선택 상태를 전달한다', () => {
        render(<CategoryFilterChips value="NOISE" onChange={vi.fn()} />)

        screen.getByRole('radiogroup', { name: '카테고리 필터' })
        expect(screen.getByRole('radio', { name: '소음' })).toBeChecked()
        expect(screen.getByRole('radio', { name: '전체' })).not.toBeChecked()
    })

    it('모든 제보 카테고리와 전체 보기를 제공한다', () => {
        render(<CategoryFilterChips value="all" onChange={vi.fn()} />)

        const labels = screen.getAllByRole('radio').map((chip) => chip.textContent?.trim())
        expect(labels).toEqual(['전체', '소음', '쓰레기', '시설물', '교통', '기타'])
    })

    it('다른 카테고리를 고르면 값을 올려보낸다', async () => {
        const user = userEvent.setup()
        const onChange = vi.fn()
        render(<CategoryFilterChips value="all" onChange={onChange} />)

        await user.click(screen.getByRole('radio', { name: '쓰레기' }))

        expect(onChange).toHaveBeenCalledExactlyOnceWith('TRASH')
    })

    it('같은 카테고리를 다시 눌러도 변경을 요청하지 않는다', async () => {
        const user = userEvent.setup()
        const onChange = vi.fn()
        render(<CategoryFilterChips value="all" onChange={onChange} />)

        await user.click(screen.getByRole('radio', { name: '전체' }))

        expect(onChange).not.toHaveBeenCalled()
    })

    it('모바일에서 줄바꿈으로 고아 항목을 만들지 않고 가로 스크롤한다', () => {
        const { container } = render(<CategoryFilterChips value="all" onChange={vi.fn()} />)

        const group = container.querySelector('[role="radiogroup"]')!
        expect(group.className).toMatch(/overflow-x-auto/)
        expect(group.className).not.toMatch(/flex-wrap/)
    })

    it('칩의 히트 영역이 44px 계약을 지킨다', () => {
        render(<CategoryFilterChips value="all" onChange={vi.fn()} />)

        screen.getAllByRole('radio').forEach((chip) => {
            expect(chip.className).toMatch(/min-h-11|h-11/)
        })
    })
})
