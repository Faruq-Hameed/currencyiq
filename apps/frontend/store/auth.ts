import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User { id: string; email: string; full_name?: string }

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'currencyiq-auth',
      storage: createJSONStorage(() => {
        // Safe storage that won't throw on SSR
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
      // Don't hydrate on the server — prevents SSR/client mismatch
      skipHydration: true,
    },
  ),
);
