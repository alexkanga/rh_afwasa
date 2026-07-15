'use client'

import { useAuthStore } from '@/stores'
import LoginPage from '@/components/pages/LoginPage'
import AppShell from '@/components/AppShell'

export default function HomePage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return <AppShell />
}