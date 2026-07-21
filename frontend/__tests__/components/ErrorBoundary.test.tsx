import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ErrorBoundary from '@/components/ErrorBoundary'

function Boom(): React.ReactNode {
    throw new Error('kaboom')
}

describe('ErrorBoundary', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('renders the shared error UI (lucide icon, no emoji) when a child throws', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})

        const { container } = render(
            <ErrorBoundary>
                <Boom />
            </ErrorBoundary>
        )

        expect(screen.getByText('앗! 문제가 발생했습니다')).toBeInTheDocument()
        expect(container.querySelector('svg')).toBeInTheDocument()
        expect(container.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u)
    })

    it('offers a soft retry that clears the error state and re-renders children', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        let shouldThrow = true
        function MaybeBoom() {
            if (shouldThrow) throw new Error('kaboom')
            return <div>recovered</div>
        }

        render(
            <ErrorBoundary>
                <MaybeBoom />
            </ErrorBoundary>
        )

        expect(screen.getByText('앗! 문제가 발생했습니다')).toBeInTheDocument()
        shouldThrow = false
        fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))

        expect(screen.getByText('recovered')).toBeInTheDocument()
    })

    it('renders a normal child without any error UI', () => {
        render(
            <ErrorBoundary>
                <div>all good</div>
            </ErrorBoundary>
        )

        expect(screen.getByText('all good')).toBeInTheDocument()
        expect(screen.queryByText('앗! 문제가 발생했습니다')).not.toBeInTheDocument()
    })
})
