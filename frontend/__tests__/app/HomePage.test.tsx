import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Home from '@/app/page'
import { useUIStore } from '@/shared/stores/useUIStore'

const { reportViewModelCalls, mapComponentProps } = vi.hoisted(() => ({
    reportViewModelCalls: { list: [] as any[], map: [] as any[] },
    mapComponentProps: { current: {} as Record<string, any> },
}))

let mockUser: { email: string } | null = null

/** 데스크톱 여부를 matchMedia로 제어한다 — 모바일에서는 지도를 아예 마운트하지 않는다. */
function setViewport(kind: 'mobile' | 'desktop') {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: kind === 'desktop' && query.includes('min-width'),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }))
}

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/components/Header', () => ({ default: () => null }))
vi.mock('@/features/auth/presentation/components/AuthDialog', () => ({ AuthDialog: () => null }))
vi.mock('@/features/reports/presentation/components/ReportModal', () => ({ default: () => null }))
vi.mock('@/components/UnifiedSearch', () => ({
    default: () => <div data-testid="unified-search" />,
}))

let mockMapStatus: 'loading' | 'ready' | 'error' = 'ready'
const mapRetry = vi.fn()

vi.mock('@/features/map/presentation/hooks/useMapInitializationViewModel', () => ({
    useMapInitializationViewModel: () => ({
        status: mockMapStatus,
        technicalReason: mockMapStatus === 'error' ? 'Kakao SDK ready()가 false를 반환' : null,
        retry: mapRetry,
    }),
}))

vi.mock('@/features/map/presentation/components/MapComponent', () => ({
    default: (props: Record<string, any>) => {
        mapComponentProps.current = props
        return <div data-testid="map" data-height={props.height} />
    },
}))

vi.mock('@/features/profile/presentation/hooks/useProfileViewModel', () => ({
    useProfileViewModel: () => ({ profile: null, isLoading: false }),
}))

vi.mock('@/features/auth/presentation/hooks/useAuthViewModel', () => ({
    useAuthViewModel: () => ({ user: mockUser, initialized: true }),
}))

vi.mock('@/features/map/presentation/hooks/useLocationViewModel', () => ({
    useLocationViewModel: () => ({ reverseGeocode: vi.fn(), searchPlaces: vi.fn(), isSearching: false }),
}))

vi.mock('@/features/map/presentation/hooks/useMapFocusViewModel', () => ({
    useMapFocusViewModel: () => ({ lat: 37.5, lng: 127.0 }),
}))

const reports = [
    {
        id: 'r1',
        title: '도로에 큰 웅덩이가 생겼습니다',
        description: '비 온 뒤부터 물이 고여 있습니다',
        category: 'FACILITY',
        status: 'OPEN',
        address: '서울 성동구 성수동',
        location: { lat: 37.5, lng: 127.0 },
        voteCount: 3,
        commentCount: 1,
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-01T00:00:00Z',
        userId: 'u1',
    },
]

let mockListError: Error | null = null
let mockListReports = reports
const listRefetch = vi.fn()

vi.mock('@/features/reports/presentation/hooks/useReportsViewModel', () => ({
    useMapReportsViewModel: (params: any) => {
        reportViewModelCalls.map.push(params)
        return { reports: mockListReports, isLoading: false, currentLimit: 100 }
    },
    useListReportsViewModel: (params: any) => {
        reportViewModelCalls.list.push(params)
        return {
            reports: mockListError ? [] : mockListReports,
            totalCount: mockListError ? 0 : mockListReports.length,
            totalPages: 1,
            currentPage: 1,
            isLoading: false,
            error: mockListError,
            refetch: listRefetch,
        }
    },
}))

beforeEach(() => {
    mockUser = null
    mockMapStatus = 'ready'
    mockListError = null
    mockListReports = reports
    reportViewModelCalls.list.length = 0
    reportViewModelCalls.map.length = 0
    mapComponentProps.current = {}
    setViewport('mobile')
    useUIStore.setState({
        isAuthModalOpen: false,
        isReportModalOpen: false,
        authMode: 'signin',
        searchQuery: '',
        searchMode: 'location',
        triggerMapSearch: 0,
        useMapBoundsFilter: true,
        currentMapBounds: null,
        selectedMapMarkers: null,
        pendingIntent: null,
    })
})

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
})

describe('홈 — 모바일 기본 진입', () => {
    it('기본 콘텐츠가 제보 피드이며 지도를 마운트하지 않는다', () => {
        render(<Home />)

        expect(screen.getByRole('tab', { name: '제보 피드' })).toHaveAttribute('aria-selected', 'true')
        expect(screen.queryByTestId('map')).not.toBeInTheDocument()
        expect(screen.getByText('도로에 큰 웅덩이가 생겼습니다')).toBeInTheDocument()
    })

    it('아직 지도 bounds가 없어도 기본 중심의 초기 지역을 조회해 0건으로 멈추지 않는다', () => {
        render(<Home />)

        expect(reportViewModelCalls.list.at(-1)).toMatchObject({
            mode: 'bounds',
            bounds: expect.objectContaining({ north: expect.any(Number), south: expect.any(Number) }),
        })
    })

    it('첫 화면에 탐색 컨텍스트, 카테고리 필터, 제보하기가 함께 보인다', () => {
        render(<Home />)

        screen.getByRole('tablist', { name: '홈 보기 방식' })
        screen.getByRole('radiogroup', { name: '카테고리 필터' })
        expect(screen.getAllByRole('button', { name: '제보하기' }).length).toBeGreaterThan(0)
    })

    it('모바일 제보하기 CTA가 안전 영역 계약을 지킨다', () => {
        render(<Home />)

        const cta = screen.getByTestId('mobile-compose-cta')
        expect(cta.className).toMatch(/pb-safe/)
    })

    it('빈 상태에서도 제보하기 행동을 하단 CTA 하나로만 제공한다', () => {
        mockListReports = []
        render(<Home />)

        expect(screen.getAllByRole('button', { name: '제보하기' })).toHaveLength(1)
    })
})

describe('홈 — 피드/지도 전환', () => {
    it('지도 모드로 바꾸면 지도를 마운트한다', async () => {
        const user = userEvent.setup()
        render(<Home />)

        await user.click(screen.getByRole('tab', { name: '지도' }))

        expect(screen.getByTestId('map')).toBeInTheDocument()
    })

    it('지도 모드는 고정 픽셀 계산 대신 남은 패널 높이를 전부 쓴다', async () => {
        const user = userEvent.setup()
        render(<Home />)

        await user.click(screen.getByRole('tab', { name: '지도' }))

        expect(screen.getByTestId('map')).toHaveAttribute('data-height', '100%')
        expect(screen.getByTestId('mobile-map-panel').className).toMatch(/flex-1|min-h-0/)
    })

    it('선택한 제보를 지도 위 최대 40% 하단 시트에 보여준다', async () => {
        useUIStore.setState({ selectedMapMarkers: reports as any })
        const user = userEvent.setup()
        render(<Home />)

        await user.click(screen.getByRole('tab', { name: '지도' }))

        const sheet = screen.getByTestId('mobile-selected-reports-sheet')
        expect(sheet.className).toMatch(/max-h-\[40%\]/)
        expect(within(sheet).getByText('도로에 큰 웅덩이가 생겼습니다')).toBeInTheDocument()
    })

    it('전환만으로는 새 영역 조회를 실행하지 않는다', async () => {
        const user = userEvent.setup()
        render(<Home />)

        const before = useUIStore.getState().triggerMapSearch

        await user.click(screen.getByRole('tab', { name: '지도' }))
        await user.click(screen.getByRole('tab', { name: '제보 피드' }))

        expect(useUIStore.getState().triggerMapSearch).toBe(before)
    })
})

describe('홈 — 데스크톱', () => {
    beforeEach(() => setViewport('desktop'))

    it('지도와 현재 영역 제보를 함께 노출한다', () => {
        render(<Home />)

        expect(screen.getByTestId('map')).toBeInTheDocument()
        expect(screen.getByText('도로에 큰 웅덩이가 생겼습니다')).toBeInTheDocument()
    })

    it('전환 탭을 노출하지 않는다', () => {
        render(<Home />)

        expect(screen.queryByRole('tablist', { name: '홈 보기 방식' })).not.toBeInTheDocument()
    })
})

describe('홈 — 조회 트리거', () => {
    it('카테고리 변경은 명시적 의도이므로 영역 조회를 커밋한다', async () => {
        const user = userEvent.setup()
        render(<Home />)

        const before = useUIStore.getState().triggerMapSearch
        await user.click(screen.getByRole('radio', { name: '소음' }))

        expect(useUIStore.getState().triggerMapSearch).toBe(before + 1)
    })
})

describe('홈 — 제보하기', () => {
    it('로그인 주민은 제보 작성 화면을 연다', async () => {
        mockUser = { email: 'resident@example.com' }
        const user = userEvent.setup()
        render(<Home />)

        await user.click(within(screen.getByTestId('mobile-compose-cta')).getByRole('button', { name: '제보하기' }))

        expect(useUIStore.getState().isReportModalOpen).toBe(true)
        expect(useUIStore.getState().isAuthModalOpen).toBe(false)
    })

    it('익명 주민은 로그인 안내를 받고 복귀 의도가 기억된다', async () => {
        const user = userEvent.setup()
        render(<Home />)

        await user.click(within(screen.getByTestId('mobile-compose-cta')).getByRole('button', { name: '제보하기' }))

        expect(useUIStore.getState().isAuthModalOpen).toBe(true)
        expect(useUIStore.getState().authMode).toBe('signin')
        expect(useUIStore.getState().isReportModalOpen).toBe(false)
        expect(useUIStore.getState().pendingIntent).toBe('compose-report')
    })
})

describe('홈 — 지도 상태와 제보 상태의 분리', () => {
    it('지도 초기화 실패가 제보 피드를 오류 화면으로 대체하지 않는다', () => {
        mockMapStatus = 'error'
        setViewport('desktop')

        render(<Home />)

        expect(screen.getByText('지금은 지도를 표시할 수 없어요')).toBeInTheDocument()
        expect(screen.getByText('도로에 큰 웅덩이가 생겼습니다')).toBeInTheDocument()
        expect(screen.getByRole('radiogroup', { name: '카테고리 필터' })).toBeInTheDocument()
    })

    it('지도 실패 화면에 내부 기술 문구를 노출하지 않는다', () => {
        mockMapStatus = 'error'
        setViewport('desktop')

        const { container } = render(<Home />)

        expect(container.textContent).not.toMatch(/Kakao|SDK|NEXT_PUBLIC/i)
    })

    it('지도가 실패해도 카테고리 변경 같은 명시적 조회 트리거는 계속 동작한다', async () => {
        mockMapStatus = 'error'
        const user = userEvent.setup()
        render(<Home />)

        const before = useUIStore.getState().triggerMapSearch
        await user.click(screen.getByRole('radio', { name: '소음' }))

        expect(useUIStore.getState().triggerMapSearch).toBe(before + 1)
    })

    it('지도 재시도는 지도 초기화만 다시 실행하고 조회 조건을 건드리지 않는다', async () => {
        mockMapStatus = 'error'
        setViewport('desktop')
        const user = userEvent.setup()
        render(<Home />)

        const before = useUIStore.getState().triggerMapSearch
        await user.click(screen.getByRole('button', { name: '지도 다시 시도' }))

        expect(mapRetry).toHaveBeenCalledOnce()
        expect(useUIStore.getState().triggerMapSearch).toBe(before)
    })

    it('제보 조회 실패는 지도와 별도의 재시도를 목록 영역에만 그린다', async () => {
        mockListError = new Error('boom')
        setViewport('desktop')
        const user = userEvent.setup()

        render(<Home />)

        expect(screen.getByTestId('map')).toBeInTheDocument()
        const alert = screen.getByRole('alert')
        expect(alert.textContent).toMatch('제보를 불러오지 못했어요')

        await user.click(within(alert).getByRole('button', { name: '다시 시도' }))
        expect(listRefetch).toHaveBeenCalledOnce()
    })

    it('제보 0건인 정상 빈 상태를 오류와 구분한다', () => {
        mockListReports = []

        render(<Home />)

        expect(screen.getByText('이 지역에는 아직 제보가 없어요')).toBeInTheDocument()
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
})
