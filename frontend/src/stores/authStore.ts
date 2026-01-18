import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api";
import type { User, Token } from "@/types";

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          // OAuth2 password flow requires form data
          const formData = new URLSearchParams();
          formData.append("username", email);
          formData.append("password", password);

          const response = await api.post<Token>("/auth/login", formData, {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          });

          const { access_token } = response.data;
          set({ token: access_token, isAuthenticated: true });

          // Load user data after login
          await get().loadUser();
        } catch (error) {
          set({ token: null, user: null, isAuthenticated: false });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await api.post<Token>("/auth/register", {
            email,
            password,
          });

          const { access_token } = response.data;
          set({ token: access_token, isAuthenticated: true });

          // Load user data after registration
          await get().loadUser();
        } catch (error) {
          set({ token: null, user: null, isAuthenticated: false });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        set({ token: null, user: null, isAuthenticated: false });
      },

      loadUser: async () => {
        const { token } = get();
        if (!token) {
          set({ user: null, isAuthenticated: false });
          return;
        }

        try {
          const response = await api.get<User>("/auth/me");
          set({ user: response.data, isAuthenticated: true });
        } catch (error) {
          // Token is invalid, clear auth state
          set({ token: null, user: null, isAuthenticated: false });
          throw error;
        }
      },

      setToken: (token: string) => {
        set({ token, isAuthenticated: true });
      },
    }),
    {
      name: "auth-storage", // localStorage key
      partialize: (state) => ({
        token: state.token,
        // Only persist token, not user data (will be refetched)
      }),
    }
  )
);

// Subscribe to handle rehydration - set isAuthenticated based on token presence
// This runs after the store is created and hydrated from localStorage
useAuthStore.persist.onFinishHydration((state) => {
  if (state.token) {
    useAuthStore.setState({ isAuthenticated: true });
    // Load user data after hydration
    useAuthStore
      .getState()
      .loadUser()
      .catch(() => {
        // Token invalid, already handled in loadUser
      });
  }
});
