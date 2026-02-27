export interface NeighborhoodInfo {
    placeName: string;
    address: string;
    lat: number;
    lng: number;
}

export interface ProfileStats {
    reportCount: number;
    commentCount: number;
    voteCount: number;
    joinedAt: string;
}

export interface Profile {
    id: string;
    userId: string;
    nickname: string;
    avatarUrl?: string;
    location?: {
        lat: number;
        lng: number;
    };
    neighborhood?: NeighborhoodInfo;
    createdAt: string;
    updatedAt: string;
    stats?: ProfileStats;
}

export interface ProfileUpdate {
    nickname?: string;
    location?: {
        lat: number;
        lng: number;
    };
    neighborhood?: NeighborhoodInfo;
}
