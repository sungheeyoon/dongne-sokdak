import { AuthUser, AuthSession } from './entities';

export interface SignInCredentials {
    email: string;
    password?: string; // Optional for OAuth
}

export interface SignUpCredentials extends SignInCredentials {
    nickname: string;
}

export interface AuthRepository {
    signInWithEmail(credentials: SignInCredentials): Promise<AuthSession>;
    signUpWithEmail(credentials: SignUpCredentials): Promise<AuthSession>;
    signInWithKakao(): Promise<void>;
    signInWithGoogle(): Promise<void>;
    loginWithSocial(provider: 'kakao' | 'google', code: string): Promise<AuthSession>;
    signOut(): Promise<void>;
    getSession(): Promise<AuthSession | null>;
    getToken(): Promise<string | null>;
    onAuthStateChange(callback: (event: string, session: AuthSession | null) => void): () => void;
}
