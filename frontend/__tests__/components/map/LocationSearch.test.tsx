import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import LocationSearch from '@/components/map/LocationSearch'
import { PlaceSearchResult } from '@/features/map/domain/entities'

const searchPlaces = vi.fn()

vi.mock('@/features/map/presentation/hooks/useLocationViewModel', () => ({
    useLocationViewModel: () => ({ searchPlaces, isSearching: false })
}))

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
})

describe('LocationSearch (동네 선택 시 주소 폴백)', () => {
    it('falls back to roadAddress when the selected place has no jibeon address', async () => {
        const place: PlaceSearchResult = {
            id: '1',
            placeName: '신축빌딩',
            address: '', // 지번주소 없음 (신축 건물)
            roadAddress: '서울 종로구 종로 26',
            location: { lat: 37.57, lng: 126.98 },
        }
        searchPlaces.mockResolvedValue([place])

        const onLocationSelect = vi.fn()
        render(<LocationSearch onLocationSelect={onLocationSelect} />)

        fireEvent.change(screen.getByPlaceholderText('동네, 건물명, 지번을 검색하세요'), {
            target: { value: '신축빌딩' }
        })

        const result = await screen.findByText('신축빌딩', {}, { timeout: 3000 })
        fireEvent.click(result)

        expect(onLocationSelect).toHaveBeenCalledWith(expect.objectContaining({
            address: '서울 종로구 종로 26',
            placeName: '신축빌딩'
        }))
    })

    it('keeps using the jibeon address when it is present', async () => {
        const place: PlaceSearchResult = {
            id: '2',
            placeName: '종로타워',
            address: '서울 종로구 종로1가 54',
            roadAddress: '서울 종로구 종로 6',
            location: { lat: 37.57, lng: 126.98 },
        }
        searchPlaces.mockResolvedValue([place])

        const onLocationSelect = vi.fn()
        render(<LocationSearch onLocationSelect={onLocationSelect} />)

        fireEvent.change(screen.getByPlaceholderText('동네, 건물명, 지번을 검색하세요'), {
            target: { value: '종로타워' }
        })

        const result = await screen.findByText('종로타워', {}, { timeout: 3000 })
        fireEvent.click(result)

        expect(onLocationSelect).toHaveBeenCalledWith(expect.objectContaining({
            address: '서울 종로구 종로1가 54',
            placeName: '종로타워'
        }))
    })
})
