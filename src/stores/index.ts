import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ============ AUTH STORE ============

interface AuthUser {
  userId: string
  email: string
  name: string
  roleName: string
  token: string
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (user: AuthUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => {
        set({ user: null, isAuthenticated: false })
        if (typeof window !== 'undefined') {
          localStorage.removeItem('rh_token')
        }
      },
    }),
    {
      name: 'rh-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)

// ============ APP STORE ============

interface AppState {
  currentPage: string
  sidebarOpen: boolean
  setCurrentPage: (page: string) => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
}

export const useAppStore = create<AppState>()((set) => ({
  currentPage: 'dashboard',
  sidebarOpen: true,
  setCurrentPage: (page) => set({ currentPage: page }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}))