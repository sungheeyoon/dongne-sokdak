import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import MyNeighborhoodModal from '@/components/MyNeighborhoodModal'
import { PlaceSearchResult } from '@/features/map/domain/entities'

const searchPlaces = vi.fn()
const updateNeighborhood = vi.fn().mockResolvedValue(undefined)
const resetToMyNeighborhood = vi.fn()

vi.mock('@/features/map/presentation/hooks/useLocationViewModel', () => ({
    useLocationViewModel: () => ({ searchPlaces, isSearching: false })
}))

vi.mock('@/features/profile/presentation/hooks/useProfileViewModel', () => ({
    useProfileViewModel: () => ({
        profile: { neighborhood: undefined },
        updateNeighborhood,
        isUpdatingNeighborhood: false,
        deleteNeighborhood: vi.fn(),
        isDeletingNeighborhood: false,
    })
}))

vi.mock('@/features/map/presentation/hooks/useMapControllerViewModel', () => ({
    useMapControllerViewModel: () => ({ resetToMyNeighborhood })
}))

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
})

describe('MyNeighborhoodModal (내 동네 저장 시 주소 폴백)', () => {
    it('saves the roadAddress as the neighborhood address when the place has no jibeon address', async () => {
        const place: PlaceSearchResult = {
            id: '1',
            placeName: '신축빌딩',
            address: '',
            roadAddress: '인천 부평구 부평대로 26',
            location: { lat: 37.49, lng: 126.72 },
        }
        searchPlaces.mockResolvedValue([place])

        render(<MyNeighborhoodModal isOpen={true} onClose={vi.fn()} />)

        fireEvent.change(screen.getByPlaceholderText('동네 이름(예: 논현동)으로 검색'), {
            target: { value: '신축빌딩' }
        })

        const result = await screen.findByText('신축빌딩', {}, { timeout: 3000 })
        fireEvent.click(result)

        await waitFor(() => expect(updateNeighborhood).toHaveBeenCalledWith(expect.objectContaining({
            address: '인천 부평구 부평대로 26',
            placeName: '신축빌딩'
        })))
    })
})
