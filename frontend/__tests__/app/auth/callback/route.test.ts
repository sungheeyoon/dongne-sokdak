import { describe, it, expect, vi, beforeEach } from 'vitest'

const exchangeCodeForSession = vi.fn()

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({})),
}))

vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: vi.fn(() => ({
    auth: { exchangeCodeForSession },
  })),
}))

import { GET } from '@/app/auth/callback/route'

describe('GET /auth/callback', () => {
  beforeEach(() => {
    exchangeCodeForSession.mockReset()
  })

  it('exchanges the code for a session and redirects to origin', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null })

    const request = new Request('https://dongne-sokdak.vercel.app/auth/callback?code=abc123')
    const response = await GET(request)

    expect(exchangeCodeForSession).toHaveBeenCalledWith('abc123')
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://dongne-sokdak.vercel.app/')
  })

  it('redirects with an authError flag and does not pretend success when the exchange fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    exchangeCodeForSession.mockResolvedValue({ error: { message: 'invalid grant' } })

    const request = new Request('https://dongne-sokdak.vercel.app/auth/callback?code=bad-code')
    const response = await GET(request)

    expect(exchangeCodeForSession).toHaveBeenCalledWith('bad-code')
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://dongne-sokdak.vercel.app/?authError=1')
    expect(consoleError).toHaveBeenCalled()

    consoleError.mockRestore()
  })

  it('redirects with an authError flag when the provider reports an error and never attempts an exchange', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const request = new Request(
      'https://dongne-sokdak.vercel.app/auth/callback?error=access_denied&error_description=User+denied+access'
    )
    const response = await GET(request)

    expect(exchangeCodeForSession).not.toHaveBeenCalled()
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://dongne-sokdak.vercel.app/?authError=1')
    expect(consoleError).toHaveBeenCalled()

    consoleError.mockRestore()
  })

  it('redirects to origin without attempting an exchange when neither code nor error is present', async () => {
    const request = new Request('https://dongne-sokdak.vercel.app/auth/callback')
    const response = await GET(request)

    expect(exchangeCodeForSession).not.toHaveBeenCalled()
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://dongne-sokdak.vercel.app/')
  })
})
