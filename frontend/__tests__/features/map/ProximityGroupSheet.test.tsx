import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProximityGroupSheet } from '@/features/map/presentation/components/ProximityGroupSheet'
import { ReportCategory, ReportStatus, Report as ReportType } from '@/types'

function makeReport(id: string, title: string): ReportType {
  return {
    id,
    userId: 'u1',
    title,
    description: 'desc',
    location: { lat: 37.5, lng: 127.0 },
    category: ReportCategory.NOISE,
    status: ReportStatus.OPEN,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  }
}

describe('ProximityGroupSheet', () => {
  it('lists every report in the group', () => {
    const group = {
      id: 'proximity-a',
      center: { lat: 37.5, lng: 127.0 },
      members: [makeReport('a', '제보 A'), makeReport('b', '제보 B')],
    }

    render(<ProximityGroupSheet group={group} onClose={vi.fn()} onSelectReport={vi.fn()} />)

    expect(screen.getByText('제보 A')).toBeInTheDocument()
    expect(screen.getByText('제보 B')).toBeInTheDocument()
  })

  it('calls onSelectReport (not navigation) when a report is picked', () => {
    const onSelectReport = vi.fn()
    const reportA = makeReport('a', '제보 A')
    const group = { id: 'proximity-a', center: { lat: 37.5, lng: 127.0 }, members: [reportA] }

    render(<ProximityGroupSheet group={group} onClose={vi.fn()} onSelectReport={onSelectReport} />)

    fireEvent.click(screen.getByText('제보 A'))

    expect(onSelectReport).toHaveBeenCalledWith(reportA)
  })

  it('shows the member count in the title', () => {
    const group = {
      id: 'proximity-a',
      center: { lat: 37.5, lng: 127.0 },
      members: [makeReport('a', '제보 A'), makeReport('b', '제보 B'), makeReport('c', '제보 C')],
    }

    render(<ProximityGroupSheet group={group} onClose={vi.fn()} onSelectReport={vi.fn()} />)

    expect(screen.getByText(/3건/)).toBeInTheDocument()
  })
})
