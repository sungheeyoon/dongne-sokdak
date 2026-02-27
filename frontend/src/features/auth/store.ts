import { create } from 'zustand';
import { AuthUser } from './domain/entities';
import { Profile } from '@/types';

interface AuthState {
    user: AuthUser | null;
    profile: Profile | null;
    isLoading: boolean;

    setUser: (user: AuthUser | null) => void;
    setProfile: (profile: Profile | null) => void;
    setLoading: (loading: boolean) => void;
    clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    profile: null,
    isLoading: true,

    setUser: (user) => set({ user }),
    setProfile: (profile) => set({ profile }),
    setLoading: (loading) => set({ isLoading: loading }),
    clearUser: () => set({ user: null, profile: null })
}));
