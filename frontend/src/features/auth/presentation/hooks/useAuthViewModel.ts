import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../../store';
import { AuthUseCases } from '../../domain/usecases';
import { supabaseAuthRepository } from '../../data/supabaseAuthRepository';
import { SignInCredentials, SignUpCredentials } from '../../domain/repositories';

// Dependency injection configuration for the feature
const authUseCases = new AuthUseCases(supabaseAuthRepository);

export function useAuthViewModel() {
    const { user, setUser, setLoading } = useAuthStore();
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        // Check initial session
        const getInitialSession = async () => {
            try {
                const session = await authUseCases.getSession();
                setUser(session?.user ?? null);
            } catch (error) {
                console.error('Error getting initial session:', error);
            } finally {
                setLoading(false);
                setInitialized(true);
            }
        };

        getInitialSession();

        // Listen to Auth State Changes
        const unsubscribe = authUseCases.onAuthStateChange((event, session) => {
            if (process.env.NODE_ENV === 'development' && event === 'SIGNED_IN' && session?.user) {
                const provider = session.user.provider;
                if (provider === 'google' || provider === 'kakao') {
                    const providerName = provider === 'google' ? '구글' : '카카오';
                    console.log(`✅ ${providerName} 로그인 완료`);
                }
            }

            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => {
            unsubscribe();
        };
    }, [setUser, setLoading]);

    const signIn = useCallback(async (credentials: SignInCredentials) => {
        setLoading(true);
        try {
            const session = await authUseCases.signInWithEmail(credentials);
            return session;
        } finally {
            setLoading(false);
        }
    }, [setLoading]);

    const signUp = useCallback(async (credentials: SignUpCredentials) => {
        setLoading(true);
        try {
            const session = await authUseCases.signUpWithEmail(credentials);
            return session;
        } finally {
            setLoading(false);
        }
    }, [setLoading]);

    const signOut = useCallback(async () => {
        setLoading(true);
        try {
            await authUseCases.signOut();
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, [setLoading, setUser]);

    const signInWithKakao = useCallback(async () => {
        await authUseCases.signInWithKakao();
    }, []);

    const signInWithGoogle = useCallback(async () => {
        await authUseCases.signInWithGoogle();
    }, []);

    const loginWithSocial = useCallback(async (provider: 'kakao' | 'google', code: string) => {
        setLoading(true);
        try {
            const session = await authUseCases.loginWithSocial(provider, code);
            if (session) {
                setUser(session.user);
            }
        } finally {
            setLoading(false);
        }
    }, [setLoading, setUser]);

    const getToken = useCallback(async () => {
        return await authUseCases.getToken();
    }, []);

    return {
        user,
        initialized,
        signIn,
        signUp,
        signOut,
        signInWithKakao,
        signInWithGoogle,
        loginWithSocial,
        getToken
    };
}
