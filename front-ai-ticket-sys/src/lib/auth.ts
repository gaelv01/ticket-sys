export type Role = 'ADMIN' | 'CLIENTE';

export interface UserSession {
  uuid: string;
  username: string;
  role: Role;
}

const TOKEN_KEY = 'access_token';
const USER_KEY = 'user';

export const authStorage = {
  setSession(token: string, user: UserSession) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  getUser(): UserSession | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as UserSession) : null;
  },

  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  isAuthenticated(): boolean {
    return this.getToken() !== null;
  },
};