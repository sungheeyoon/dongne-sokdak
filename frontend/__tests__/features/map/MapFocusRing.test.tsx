import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MapFocusRing } from '@/features/map/presentation/components/MapFocusRing'

vi.mock('react-kakao-maps-sdk', () => ({
  CustomOverlayMap: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

describe('MapFocusRing', () => {
  it('개별 핀의 머리 부분에 맞춰 정적인 포커스 표시를 위로 보정한다', () => {
    render(<MapFocusRing center={{ lat: 37.5, lng: 127 }} variant="marker" />)

    const ring = screen.getByTestId('map-focus-ring')
    expect(ring.getAttribute('data-variant')).toBe('marker')
    expect(ring.style.transform).toContain('translateY')
    expect(ring.innerHTML).not.toContain('@keyframes')
    expect(ring.innerHTML).not.toContain('animation')
  })

  it('근접 그룹은 좌표 중심에 포커스 표시를 둔다', () => {
    render(<MapFocusRing center={{ lat: 37.5, lng: 127 }} variant="group" />)

    expect(screen.getByTestId('map-focus-ring').style.transform).toBe('none')
  })
})
