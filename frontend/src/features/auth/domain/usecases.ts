import { AuthRepository, SignInCredentials, SignUpCredentials } from './repositories';

export class AuthUseCases {
    constructor(private repository: AuthRepository) { }

    async signInWithEmail(credentials: SignInCredentials) {
        if (!credentials.email || !credentials.password) {
            throw new Error('Email and password are required.');
        }
        return this.repository.signInWithEmail(credentials);
    }

    async signUpWithEmail(credentials: SignUpCredentials) {
        if (!credentials.email || !credentials.password || !credentials.nickname) {
            throw new Error('Email, password, and nickname are required.');
        }
        if (credentials.nickname.length < 2) {
            throw new Error('Nickname must be at least 2 characters long.');
        }
        return this.repository.signUpWithEmail(credentials);
    }

    async signInWithKakao() {
        return this.repository.signInWithKakao();
    }

    async signInWithGoogle() {
        return this.repository.signInWithGoogle();
    }

    async loginWithSocial(provider: 'kakao' | 'google', code: string) {
        if (!code) throw new Error("Authorization code is required");
        return this.repository.loginWithSocial(provider, code);
    }

    async signOut() {
        return this.repository.signOut();
    }

    async getSession() {
        return this.repository.getSession();
    }

    async getToken() {
        return this.repository.getToken();
    }

    onAuthStateChange(callback: (event: string, session: any) => void) {
        return this.repository.onAuthStateChange(callback);
    }
}
