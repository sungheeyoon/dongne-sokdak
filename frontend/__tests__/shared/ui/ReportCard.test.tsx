import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { ReportCard, ReportCardSkeleton, REPORT_CARD_REGIONS } from '@/shared/ui/ReportCard'
import type { ReportCardProps } from '@/shared/ui/ReportCard'

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
}))

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
})

const baseReport: ReportCardProps = {
    id: 'r1',
    href: '/reports/r1',
    title: '도로에 큰 웅덩이가 생겼습니다',
    description: '비 온 뒤부터 물이 고여 있어 보행자가 지나가기 어렵습니다',
    category: 'FACILITY',
    status: 'OPEN',
    address: '서울특별시 성동구 성수동2가 100-1',
    voteCount: 12,
    commentCount: 3,
    createdAt: '2026-08-01T09:00:00Z',
}

function renderCard(overrides: Partial<ReportCardProps> = {}) {
    return render(<ReportCard {...baseReport} {...overrides} />)
}

describe('ReportCard — 탐색 단위', () => {
    it('카드 전체가 상세로 가는 링크다', () => {
        renderCard()

        const link = screen.getByRole('link')
        expect(link).toHaveAttribute('href', '/reports/r1')
        expect(link).toHaveAccessibleName(expect.stringContaining('도로에 큰 웅덩이가 생겼습니다') as unknown as string)
    })

    it('클릭 가능한 div에 의존하지 않는다', () => {
        const { container } = renderCard()

        container.querySelectorAll('div').forEach((div) => {
            expect(div.getAttribute('onclick')).toBeNull()
            expect(div.getAttribute('role')).not.toBe('button')
        })
    })

    it('키보드로 도달할 수 있다', () => {
        renderCard()

        const link = screen.getByRole('link')
        link.focus()
        expect(document.activeElement).toBe(link)
    })

    it('카드 안에 중첩된 인터랙티브 요소를 만들지 않는다', () => {
        const { container } = renderCard()

        const link = screen.getByRole('link')
        expect(link.querySelectorAll('a, button')).toHaveLength(0)
        expect(container.querySelectorAll('a')).toHaveLength(1)
    })
})

describe('ReportCard — 상태 표현', () => {
    it.each([
        ['OPEN', '접수됨'],
        ['IN_PROGRESS', '처리중'],
        ['RESOLVED', '해결됨'],
    ] as const)('%s 상태를 읽을 수 있는 텍스트로 보여준다', (status, label) => {
        renderCard({ status })

        expect(screen.getByText(label)).toBeInTheDocument()
    })

    it('상태를 색만으로 구분하지 않는다', () => {
        renderCard({ status: 'RESOLVED' })

        const badge = screen.getByText('해결됨')
        expect(badge.textContent?.trim()).toBe('해결됨')
    })

    it.each([
        ['NOISE', '소음'],
        ['TRASH', '쓰레기'],
        ['FACILITY', '시설물'],
        ['TRAFFIC', '교통'],
        ['OTHER', '기타'],
    ] as const)('%s 카테고리를 한글 라벨로 보여준다', (category, label) => {
        renderCard({ category })

        expect(screen.getByText(label)).toBeInTheDocument()
    })
})

describe('ReportCard — 콘텐츠 미리보기', () => {
    it('이미지가 있으면 본문 옆의 작은 썸네일로 렌더한다', () => {
        renderCard({ imageUrl: 'https://example.com/pothole.jpg' })

        const slot = screen.getByTestId(REPORT_CARD_REGIONS.media)
        expect(slot.querySelector('img')).toBeInTheDocument()
        expect(slot.className).not.toMatch(/aspect-video/)
    })

    it('이미지가 없으면 빈 미디어 면을 그리지 않고 본문만 보여준다', () => {
        renderCard({ imageUrl: undefined })

        const slot = screen.getByTestId(REPORT_CARD_REGIONS.media)
        expect(slot).toBeInTheDocument()
        expect(slot.className).not.toMatch(/aspect-video|bg-surface-muted/)
        expect(slot.querySelector('img')).not.toBeInTheDocument()
        expect(slot).toContainElement(screen.getByTestId(REPORT_CARD_REGIONS.description))
    })

    it('이미지 로드에 실패하면 썸네일만 제거하고 본문 폭을 회복한다', () => {
        renderCard({ imageUrl: 'https://example.com/broken.jpg' })

        const image = screen.getByTestId(REPORT_CARD_REGIONS.media).querySelector('img')!
        fireEvent.error(image)

        const slot = screen.getByTestId(REPORT_CARD_REGIONS.media)
        expect(slot.querySelector('img')).not.toBeInTheDocument()
        expect(slot.className).not.toMatch(/aspect-video/)
        expect(slot).toContainElement(screen.getByTestId(REPORT_CARD_REGIONS.description))
    })

    it('빈 문자열 이미지 URL을 이미지 없음으로 다룬다', () => {
        renderCard({ imageUrl: '' })

        expect(screen.getByTestId(REPORT_CARD_REGIONS.media).querySelector('img')).not.toBeInTheDocument()
    })
})

describe('ReportCard — 긴 콘텐츠', () => {
    it('긴 제목을 2줄로 말줄임한다', () => {
        renderCard({ title: '가'.repeat(200) })

        expect(screen.getByTestId(REPORT_CARD_REGIONS.title).className).toMatch(/line-clamp-2/)
    })

    it('사진 유무와 무관하게 설명을 3줄로 말줄임한다', () => {
        renderCard({ imageUrl: 'https://example.com/p.jpg', description: '나'.repeat(500) })

        expect(screen.getByTestId(REPORT_CARD_REGIONS.description).className).toMatch(/line-clamp-3/)
    })

    it('본문을 두 번 보여주지 않는다', () => {
        renderCard({ imageUrl: undefined })

        expect(screen.getAllByTestId(REPORT_CARD_REGIONS.description)).toHaveLength(1)
    })

    it('이미지 로드에 실패해도 본문이 두 번 나오지 않는다', () => {
        renderCard({ imageUrl: 'https://example.com/broken.jpg' })

        fireEvent.error(screen.getByTestId(REPORT_CARD_REGIONS.media).querySelector('img')!)

        expect(screen.getAllByTestId(REPORT_CARD_REGIONS.description)).toHaveLength(1)
    })

    it('긴 주소가 카드 폭을 넓히지 않는다', () => {
        renderCard({ address: '서울특별시 '.repeat(30) })

        expect(screen.getByTestId(REPORT_CARD_REGIONS.location).className).toMatch(/truncate/)
    })

    it('주소가 없으면 위치 정보 없음을 알린다', () => {
        renderCard({ address: undefined })

        expect(screen.getByText('위치 정보 없음')).toBeInTheDocument()
    })

    it('주소를 시·구 + 동/도로명 + 번지 단위로 일관되게 보여준다', () => {
        renderCard({ address: '서울특별시 강남구 봉은사로 630' })

        expect(screen.getByTestId(REPORT_CARD_REGIONS.location)).toHaveTextContent('강남구 봉은사로 630')
    })

    it('숫자 지번만 받은 경우 위치를 아는 것처럼 표시하지 않는다', () => {
        renderCard({ address: '451-82' })

        expect(screen.getByTestId(REPORT_CARD_REGIONS.location)).toHaveTextContent('위치 정보 없음')
    })
})

describe('ReportCard — 반응 수', () => {
    it('공감과 댓글이 0건이어도 접근 가능한 이름과 함께 보여준다', () => {
        renderCard({ voteCount: 0, commentCount: 0 })

        expect(screen.getByLabelText('공감 0')).toBeInTheDocument()
        expect(screen.getByLabelText('댓글 0')).toBeInTheDocument()
    })

    it('반응 수가 없으면 0으로 다룬다', () => {
        renderCard({ voteCount: undefined, commentCount: undefined })

        expect(screen.getByLabelText('공감 0')).toBeInTheDocument()
        expect(screen.getByLabelText('댓글 0')).toBeInTheDocument()
    })
})

describe('ReportCardSkeleton — 실제 카드와의 구조 계약 (ADR-0009)', () => {
    it('실제 카드와 같은 주요 구역을 그린다', () => {
        const { unmount } = renderCard()
        const realRegions = Object.values(REPORT_CARD_REGIONS)
            .filter((region) => screen.queryByTestId(region))
            .sort()
        unmount()

        render(<ReportCardSkeleton />)
        const skeletonRegions = Object.values(REPORT_CARD_REGIONS)
            .filter((region) => screen.queryByTestId(region))
            .sort()

        expect(skeletonRegions).toEqual(realRegions)
    })

    it('실제 카드와 같은 컴팩트 미리보기 정책을 쓴다', () => {
        render(<ReportCardSkeleton />)

        expect(screen.getByTestId(REPORT_CARD_REGIONS.media).className).not.toMatch(/aspect-video/)
        expect(screen.getByTestId(REPORT_CARD_REGIONS.media).className).toMatch(/min-h/)
    })

    it('링크가 아니다', () => {
        render(<ReportCardSkeleton />)

        expect(screen.queryByRole('link')).not.toBeInTheDocument()
    })
})
