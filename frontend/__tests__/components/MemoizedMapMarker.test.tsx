import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import MemoizedMapMarker from '@/components/MemoizedMapMarker'

vi.mock('react-kakao-maps-sdk', () => ({
  MapMarker: ({ image, zIndex }: { image: { size: { width: number, height: number } }, zIndex: number }) => (
    <div
      data-testid="map-marker"
      data-width={image.size.width}
      data-height={image.size.height}
      data-z-index={zIndex}
    />
  )
}))

describe('MemoizedMapMarker — 선택 상태', () => {
  it('선택 시 과도하게 커지지 않고 36px로만 강조한다', () => {
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
    expect(marker.getAttribute('data-width')).toBe('36')
    expect(marker.getAttribute('data-height')).toBe('36')
    expect(marker.getAttribute('data-z-index')).toBe('50')
  })
})
