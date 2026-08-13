import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import MemoizedMapMarker from '@/components/MemoizedMapMarker'

vi.mock('react-kakao-maps-sdk', () => ({
  MapMarker: ({ image, zIndex }: {
    image: {
      src: string
      size: { width: number, height: number }
      options: { offset: { x: number, y: number } }
    }
    zIndex: number
  }) => (
    <div
      data-testid="map-marker"
      data-width={image.size.width}
      data-height={image.size.height}
      data-offset-x={image.options.offset.x}
      data-offset-y={image.options.offset.y}
      data-svg={decodeURIComponent(image.src)}
      data-z-index={zIndex}
    />
  )
}))

describe('MemoizedMapMarker — 선택 상태', () => {
  it('포커스 원과 36px 핀을 하나의 이미지에 넣어 머리 중심이 어긋날 수 없게 한다', () => {
    render(
      <MemoizedMapMarker
        id="r1"
        lat={37.5}
        lng={127}
        category="TRASH"
        isSelected
        onClick={vi.fn()}
      />
    )

    const marker = screen.getByTestId('map-marker')
    expect(marker.getAttribute('data-width')).toBe('48')
    expect(marker.getAttribute('data-height')).toBe('52')
    expect(marker.getAttribute('data-offset-x')).toBe('24')
    expect(marker.getAttribute('data-offset-y')).toBe('52')
    expect(marker.getAttribute('data-svg')).toContain('data-focus-halo="true"')
    expect(marker.getAttribute('data-svg')).toContain('<svg x="6" y="16" width="36" height="36"')
    expect(marker.getAttribute('data-z-index')).toBe('50')
  })
})
