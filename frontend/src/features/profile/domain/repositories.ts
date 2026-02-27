import { Profile, ProfileUpdate, NeighborhoodInfo } from './entities';

export interface ProfileRepository {
    getMyProfile(): Promise<Profile>;
    updateMyProfile(data: ProfileUpdate): Promise<Profile>;
    getUserProfile(userId: string): Promise<Profile>;
    updateAvatar(avatarFile: File): Promise<{ avatarUrl: string }>;
    updateMyNeighborhood(neighborhood: NeighborhoodInfo): Promise<NeighborhoodInfo>;
    deleteMyNeighborhood(): Promise<void>;
}
