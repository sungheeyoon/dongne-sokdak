import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import {
  PortfolioNoticeModal,
  PORTFOLIO_NOTICE_STORAGE_KEY,
  PORTFOLIO_NOTICE_VERSION,
} from '@/shared/ui/PortfolioNoticeModal'

describe('PortfolioNoticeModal', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'healthy' }), { status: 200 })
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the notice content when open', () => {
    render(<PortfolioNoticeModal isOpen={true} onClose={() => {}} />)

    expect(screen.getByText(/포트폴리오 데모 안내/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /더미 데이터/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /서버 콜드 스타트/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '확인하고 시작하기' })).toBeInTheDocument()
  })

  it('triggers a wake-up fetch to /health on open', async () => {
    render(<PortfolioNoticeModal isOpen={true} onClose={() => {}} />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(calledUrl).toMatch(/\/health$/)
    expect(calledUrl).not.toMatch(/\/api\/v\d+\/health$/)
  })

  it('shows ready status after a successful wake-up', async () => {
    render(<PortfolioNoticeModal isOpen={true} onClose={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('서버 준비 완료')).toBeInTheDocument()
    })
  })

  it('persists dismissal to localStorage and calls onClose when confirming', () => {
    const onClose = vi.fn()
    render(<PortfolioNoticeModal isOpen={true} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: '확인하고 시작하기' }))

    expect(window.localStorage.getItem(PORTFOLIO_NOTICE_STORAGE_KEY)).toBe(
      PORTFOLIO_NOTICE_VERSION
    )
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not skip fetch when wake-up returns non-ok', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response('', { status: 503 })
    )

    render(<PortfolioNoticeModal isOpen={true} onClose={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText(/서버 응답 없음/)).toBeInTheDocument()
    })
  })
})
