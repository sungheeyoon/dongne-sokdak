import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ErrorDisplay from '@/shared/ui/ErrorDisplay'

describe('ErrorDisplay', () => {
    it('renders a lucide icon instead of an emoji', () => {
        const { container } = render(<ErrorDisplay error="문제가 생겼어요" title="오류" />)

        expect(container.querySelector('svg')).toBeInTheDocument()
        expect(container.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u)
    })

    it('shows both a soft retry button and a hard reload button when onRetry is provided', () => {
        const onRetry = vi.fn()
        render(<ErrorDisplay error="문제가 생겼어요" onRetry={onRetry} />)

        screen.getByRole('button', { name: '다시 시도' }).click()
        expect(onRetry).toHaveBeenCalled()
        expect(screen.getByRole('button', { name: '페이지 새로고침' })).toBeInTheDocument()
    })

    it('only shows the reload button when onRetry is omitted', () => {
        render(<ErrorDisplay error="문제가 생겼어요" />)

        expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: '페이지 새로고침' })).toBeInTheDocument()
    })

    it('renders a lucide icon in compact mode too', () => {
        const { container } = render(<ErrorDisplay error="문제가 생겼어요" compact />)

        expect(container.querySelector('svg')).toBeInTheDocument()
    })
})
