import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import { ProximityGroupMarker } from '@/features/map/presentation/components/ProximityGroupMarker'

vi.mock('react-kakao-maps-sdk', () => ({
  CustomOverlayMap: ({ children }: { children: React.ReactNode }) => <div data-testid="overlay">{children}</div>
}))

describe('ProximityGroupMarker', () => {
  it('renders the member count', () => {
    render(<ProximityGroupMarker center={{ lat: 37.5, lng: 127.0 }} count={3} onClick={vi.fn()} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<ProximityGroupMarker center={{ lat: 37.5, lng: 127.0 }} count={2} onClick={onClick} />)

    fireEvent.click(screen.getByTestId('proximity-group-marker'))

    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
