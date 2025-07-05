import { create } from 'zustand'
import { User } from '@supabase/supabase-js'
import { Profile } from '../types'

interface UserState {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  clearUser: () => void
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  profile: null,
  isLoading: true,
  
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ isLoading: loading }),
  clearUser: () => set({ user: null, profile: null })
}))
