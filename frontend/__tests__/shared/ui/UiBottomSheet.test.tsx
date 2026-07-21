import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { UiBottomSheet } from '@/shared/ui/UiBottomSheet'

describe('UiBottomSheet', () => {
  it('renders nothing when closed', () => {
    render(
      <UiBottomSheet isOpen={false} onClose={vi.fn()}>
        <p>content</p>
      </UiBottomSheet>
    )

    expect(screen.queryByText('content')).not.toBeInTheDocument()
  })

  it('renders children when open', () => {
    render(
      <UiBottomSheet isOpen={true} onClose={vi.fn()}>
        <p>content</p>
      </UiBottomSheet>
    )

    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('closes when the overlay is clicked', () => {
    const onClose = vi.fn()
    render(
      <UiBottomSheet isOpen={true} onClose={onClose}>
        <p>content</p>
      </UiBottomSheet>
    )

    fireEvent.click(screen.getByTestId('bottom-sheet-overlay'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not close when the panel content is clicked', () => {
    const onClose = vi.fn()
    render(
      <UiBottomSheet isOpen={true} onClose={onClose}>
        <p>content</p>
      </UiBottomSheet>
    )

    fireEvent.click(screen.getByText('content'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(
      <UiBottomSheet isOpen={true} onClose={onClose}>
        <p>content</p>
      </UiBottomSheet>
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders an optional title', () => {
    render(
      <UiBottomSheet isOpen={true} onClose={vi.fn()} title="근처 제보 3건">
        <p>content</p>
      </UiBottomSheet>
    )

    expect(screen.getByText('근처 제보 3건')).toBeInTheDocument()
  })
})
