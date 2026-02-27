export interface AuthUser {
    id: string;
    email?: string;
    nickname?: string;
    provider?: string;
}

export interface AuthSession {
    user: AuthUser;
    accessToken?: string;
}
