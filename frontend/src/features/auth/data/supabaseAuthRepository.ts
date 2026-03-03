import { supabase } from '@/lib/supabase';
import { AuthRepository, SignInCredentials, SignUpCredentials } from '../domain/repositories';
import { AuthSession, AuthUser } from '../domain/entities';

// Helper to map Supabase User to Domain AuthUser
const mapUser = (supabaseUser: any): AuthUser => {
    return {
        id: supabaseUser.id,
        email: supabaseUser.email,
        nickname: supabaseUser.user_metadata?.nickname || supabaseUser.user_metadata?.full_name,
        provider: supabaseUser.app_metadata?.provider
    };
};

export const supabaseAuthRepository: AuthRepository = {
    async signInWithEmail({ email, password }: SignInCredentials): Promise<AuthSession> {
        if (!password) throw new Error("Password is required for email sign in");

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
        if (!data.session || !data.user) throw new Error("Failed to create session");

        return {
            user: mapUser(data.user),
            accessToken: data.session.access_token
        };
    },

    async signUpWithEmail({ email, password, nickname }: SignUpCredentials): Promise<AuthSession> {
        if (!password) throw new Error("Password is required for email sign up");

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: nickname,
                    nickname: nickname
                }
            }
        });

        if (error) throw new Error(error.message);
        if (!data.session || !data.user) throw new Error("Failed to create session after signup");

        return {
            user: mapUser(data.user),
            accessToken: data.session.access_token
        };
    },

    async signInWithKakao(): Promise<void> {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'kakao',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                queryParams: {
                    scope: 'profile_nickname profile_image',
                },
            },
        });
        if (error) throw new Error(error.message);
    },

    async signInWithGoogle(): Promise<void> {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        });
        if (error) throw new Error(error.message);
    },

    async loginWithSocial(provider: 'kakao' | 'google', code: string): Promise<AuthSession> {
        console.log(`OAuth login with ${provider}`);
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw new Error(error.message);
        if (!data.session) throw new Error("Failed to exchange code for session");

        return {
            user: mapUser(data.session.user),
            accessToken: data.session.access_token
        };
    },

    async signOut(): Promise<void> {
        const { error } = await supabase.auth.signOut();
        if (error) throw new Error(error.message);
    },

    async getSession(): Promise<AuthSession | null> {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
            console.error(error);
            return null;
        }
        if (!session || !session.user) return null;

        return {
            user: mapUser(session.user),
            accessToken: session.access_token
        };
    },

    async getToken(): Promise<string | null> {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) return null;
        return session.access_token;
    },

    onAuthStateChange(callback: (event: string, session: AuthSession | null) => void) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            callback(event, session ? {
                user: mapUser(session.user),
                accessToken: session.access_token
            } : null);
        });

        return () => {
            subscription.unsubscribe();
        };
    }
};
