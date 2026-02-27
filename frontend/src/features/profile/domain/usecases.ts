import { ProfileRepository } from './repositories';
import { NeighborhoodInfo, ProfileUpdate } from './entities';

export class ProfileUseCases {
    constructor(private repository: ProfileRepository) { }

    async getMyProfile() {
        return this.repository.getMyProfile();
    }

    async updateMyProfile(data: ProfileUpdate) {
        if (data.nickname && data.nickname.length < 2) {
            throw new Error("Nickname must be at least 2 characters long.");
        }
        return this.repository.updateMyProfile(data);
    }

    async getUserProfile(userId: string) {
        if (!userId) throw new Error("User ID is required.");
        return this.repository.getUserProfile(userId);
    }

    async updateAvatar(avatarFile: File) {
        const MAX_SIZE = 5 * 1024 * 1024; // 5MB
        if (avatarFile.size > MAX_SIZE) {
            throw new Error("Avatar file size must be less than 5MB.");
        }
        return this.repository.updateAvatar(avatarFile);
    }

    async updateMyNeighborhood(neighborhood: NeighborhoodInfo) {
        if (!neighborhood.placeName || !neighborhood.lat || !neighborhood.lng) {
            throw new Error("Invalid neighborhood info.");
        }
        return this.repository.updateMyNeighborhood(neighborhood);
    }

    async deleteMyNeighborhood() {
        return this.repository.deleteMyNeighborhood();
    }
}
