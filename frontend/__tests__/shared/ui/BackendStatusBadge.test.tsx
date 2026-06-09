import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BackendStatusBadge, getHealthCheckUrl } from '@/shared/ui/BackendStatusBadge'

describe('BackendStatusBadge', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'alive' }), { status: 200 })
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('targets the DB-free /health/live endpoint', () => {
    const url = getHealthCheckUrl()
    expect(url).toMatch(/\/health\/live$/)
    expect(url).not.toMatch(/\/api\/v\d+\/health/)
  })

  it('renders the demo notice tooltip content', () => {
    render(<BackendStatusBadge />)

    expect(screen.getByText(/Render 무료 플랜/)).toBeInTheDocument()
    expect(screen.getByText(/더미 데이터/)).toBeInTheDocument()
  })

  it('pings /health/live on mount', async () => {
    render(<BackendStatusBadge />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })
    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(calledUrl).toMatch(/\/health\/live$/)
  })

  it('shows the normal status after a successful ping', async () => {
    render(<BackendStatusBadge />)

    await waitFor(() => {
      expect(screen.getByText(/데모 · 서버 정상/)).toBeInTheDocument()
    })
  })

  it('shows the no-response status when the ping is not ok', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response('', { status: 503 })
    )

    render(<BackendStatusBadge />)

    await waitFor(() => {
      expect(screen.getByText(/데모 · 응답 없음/)).toBeInTheDocument()
    })
  })
})
