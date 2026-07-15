'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores'

export function useMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])

  return isMobile
}

export function useAuth() {
  const { user, isAuthenticated, login, logout } = useAuthStore()
  return { user, isAuthenticated, login, logout }
}

export function useRequireAuth() {
  const { user, isAuthenticated } = useAuthStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isAuthenticated && user?.token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${user.token}` }
      })
        .then(res => {
          if (!res.ok) {
            useAuthStore.getState().logout()
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      // Use microtask to avoid synchronous setState in effect
      queueMicrotask(() => setLoading(false))
    }
  }, [isAuthenticated, user?.token])

  return { user, isAuthenticated, loading }
}