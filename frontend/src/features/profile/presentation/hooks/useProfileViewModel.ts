import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ProfileUseCases } from '../../domain/usecases'
import { apiProfileRepository } from '../../data/apiProfileRepository'
import { useAuthViewModel } from '@/features/auth/presentation/hooks/useAuthViewModel'
import { ProfileUpdate, NeighborhoodInfo } from '../../domain/entities'

const profileUseCases = new ProfileUseCases(apiProfileRepository)

export const useProfileViewModel = () => {
    const { user } = useAuthViewModel()
    const queryClient = useQueryClient()

    // Queries
    const profileQuery = useQuery({
        queryKey: ['profile', 'me'],
        queryFn: () => profileUseCases.getMyProfile(),
        enabled: !!user,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: false,
    })

    // Mutations
    const updateProfileMutation = useMutation({
        mutationFn: (data: ProfileUpdate) => profileUseCases.updateMyProfile(data),
        onSuccess: (data) => {
            queryClient.setQueryData(['profile', 'me'], data)
        }
    })

    const updateAvatarMutation = useMutation({
        mutationFn: (file: File) => profileUseCases.updateAvatar(file),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile', 'me'] })
        }
    })

    const updateNeighborhoodMutation = useMutation({
        mutationFn: (neighborhood: NeighborhoodInfo) => profileUseCases.updateMyNeighborhood(neighborhood),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile', 'me'] })
        }
    })

    const deleteNeighborhoodMutation = useMutation({
        mutationFn: () => profileUseCases.deleteMyNeighborhood(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile', 'me'] })
        }
    })

    return {
        profile: profileQuery.data,
        isLoading: profileQuery.isLoading,
        error: profileQuery.error,

        updateProfile: updateProfileMutation.mutateAsync,
        isUpdatingProfile: updateProfileMutation.isPending,

        updateAvatar: updateAvatarMutation.mutateAsync,
        isUpdatingAvatar: updateAvatarMutation.isPending,

        updateNeighborhood: updateNeighborhoodMutation.mutateAsync,
        isUpdatingNeighborhood: updateNeighborhoodMutation.isPending,

        deleteNeighborhood: deleteNeighborhoodMutation.mutateAsync,
        isDeletingNeighborhood: deleteNeighborhoodMutation.isPending,
    }
}
