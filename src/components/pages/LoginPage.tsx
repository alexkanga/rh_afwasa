'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores'
import { api } from '@/lib/api'
import type { ApiError } from '@/lib/api'

export default function LoginPage() {
  const [email, setEmail] = useState('admin@afwasa.org')
  const [password, setPassword] = useState('admin123')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const login = useAuthStore((s) => s.login)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await api.post<{
        token: string
        user: {
          userId: string
          email: string
          name: string
          roleName: string
          employeeId?: string
        }
      }>('/api/auth/login', { email, password })

      localStorage.setItem('rh_token', res.token)

      login({
        userId: res.user.userId,
        email: res.user.email,
        name: res.user.name,
        roleName: res.user.roleName,
        token: res.token,
      })
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.message || 'Erreur de connexion au serveur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-gradient-to-br from-[#362981] via-[#029CB1] to-[#009446] px-4 py-8">
      {/* Decorative background elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.02]" />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <Card className="relative z-10 w-full max-w-md border-0 bg-white/95 shadow-2xl backdrop-blur-sm">
        <CardHeader className="flex flex-col items-center gap-2 pb-2 pt-8">
          {/* Logo */}
          <div className="mb-2 h-24 w-full flex items-center justify-center">
            <Image
              src="/logo_aaea.jpg"
              alt="Logo AFWASA"
              width={96}
              height={96}
              className="h-24 max-h-24 w-auto object-contain"
              style={{ width: 'auto', height: 'auto' }}
              priority
            />
          </div>

          {/* Organization name */}
          <h2 className="text-center text-sm font-medium leading-snug text-muted-foreground">
            Association Africaine de l&apos;Eau et de l&apos;Assainissement
          </h2>

          {/* App title */}
          <h1 className="mt-1 text-center text-2xl font-bold tracking-tight brand-text">
            Système de Gestion RH
          </h1>
        </CardHeader>

        <CardContent className="px-8 pb-8 pt-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Error message */}
            {error && (
              <div className="animate-fade-in-up rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Email field */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Adresse e-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="votre@email.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-11 bg-background"
                autoComplete="email"
              />
            </div>

            {/* Password field */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Mot de passe
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11 bg-background pr-11"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Login button */}
            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full bg-[#362981] text-white hover:bg-[#362981]/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connexion en cours…
                </>
              ) : (
                'Se connecter'
              )}
            </Button>

            {/* Default credentials hint */}
            <div className="mt-1 rounded-lg bg-[#C7FFEE]/40 px-4 py-3">
              <p className="text-center text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Identifiants de démonstration :</span>
                <br />
                <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs font-mono text-[#362981]">
                  admin@afwasa.org
                </code>
                {' / '}
                <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs font-mono text-[#362981]">
                  admin123
                </code>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Bottom branding */}
      <div className="absolute bottom-6 left-0 right-0 z-10 text-center">
        <p className="text-xs font-medium text-white/60">
          © 2025 AFWASA — Tous droits réservés
        </p>
      </div>
    </div>
  )
}