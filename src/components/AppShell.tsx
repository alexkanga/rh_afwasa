'use client'

import Image from 'next/image'
import { LogOut, Menu, UserCircle } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Badge } from '@/components/ui/badge'
import { useRequireAuth } from '@/hooks/use-auth'
import { useAuthStore, useAppStore } from '@/stores'
import AppSidebar from '@/components/Sidebar'
import DashboardPage from '@/components/pages/DashboardPage'
import EmployeesPage from '@/components/pages/EmployeesPage'
import SalaryProfilesPage from '@/components/pages/SalaryProfilesPage'
import PayrollPage from '@/components/pages/PayrollPage'
import ContractsPage from '@/components/pages/ContractsPage'
import SimulatorPage from '@/components/pages/SimulatorPage'
import ParametersPage from '@/components/pages/ParametersPage'
import DeparturesPage from '@/components/pages/DeparturesPage'
import AuditLogPage from '@/components/pages/AuditLogPage'
import SettingsPage from '@/components/pages/SettingsPage'

const PAGE_TITLES: Record<string, { title: string; description: string }> = {
  dashboard: { title: 'Tableau de bord', description: 'Vue d\'ensemble du système RH' },
  employees: { title: 'Employés', description: 'Gestion des employés' },
  contracts: { title: 'Contrats', description: 'Gestion des contrats de travail' },
  'salary-profiles': { title: 'Profils salariaux', description: 'Configuration des grilles salariales' },
  payroll: { title: 'Paie', description: 'Traitement et suivi de la paie' },
  departures: { title: 'Départs', description: 'Gestion des départs des employés' },
  audit: { title: 'Journal d\'audit', description: 'Historique des actions système' },
  simulator: { title: 'Simulateur', description: 'Simulation de calculs de paie' },
  settings: { title: 'Paramètres', description: 'Configuration du système' },
}

function PagePlaceholder({ page }: { page: string }) {
  const info = PAGE_TITLES[page] || { title: page, description: '' }

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{info.title}</h1>
        {info.description && (
          <p className="mt-1 text-sm text-muted-foreground">{info.description}</p>
        )}
      </div>
      <div className="flex h-[calc(100vh-14rem)] items-center justify-center rounded-xl border border-dashed border-border bg-muted/30">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#362981]/10">
            <UserCircle className="h-8 w-8 text-[#362981]/50" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Module &laquo;&nbsp;{info.title}&nbsp;&raquo;
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Ce module sera bientôt disponible
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AppShell() {
  const { user, isAuthenticated, loading } = useRequireAuth()
  const logout = useAuthStore((s) => s.logout)
  const currentPage = useAppStore((s) => s.currentPage)

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <LogOut className="h-8 w-8 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Session expirée</p>
            <p className="mt-1 text-xs text-muted-foreground">Veuillez vous reconnecter</p>
          </div>
        </div>
      </div>
    )
  }

  // Authenticated — render full shell
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <SidebarProvider>
      {/* Sidebar */}
      <AppSidebar />

      {/* Main area */}
      <SidebarInset>
        {/* Top header bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
          {/* Sidebar toggle (mobile + desktop) */}
          <SidebarTrigger className="-ml-1" />

          {/* Separator */}
          <div className="hidden h-6 w-px bg-border sm:block" />

          {/* Logo + org name (small) */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center md:hidden">
              <Image
                src="/logo_aaea.jpg"
                alt="AFWASA"
                width={32}
                height={32}
                className="h-8 w-auto object-contain"
              />
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              RH-AFWASA
            </span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Current page breadcrumb */}
          <div className="hidden items-center gap-2 sm:flex">
            <Badge variant="secondary" className="text-xs font-normal">
              {PAGE_TITLES[currentPage]?.title || currentPage}
            </Badge>
          </div>

          {/* Spacer */}
          <div className="w-2" />

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" alt={user.name} />
                  <AvatarFallback className="bg-[#362981] text-xs font-medium text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden flex-col items-start md:flex">
                  <span className="text-sm font-medium leading-tight text-foreground">
                    {user.name}
                  </span>
                  <span className="text-[11px] leading-tight text-muted-foreground">
                    {user.roleName}
                  </span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{user.name}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="cursor-pointer text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6">
          {currentPage === 'dashboard' ? <DashboardPage /> : currentPage === 'employees' ? <EmployeesPage /> : currentPage === 'contracts' ? <ContractsPage /> : currentPage === 'salary-profiles' ? <SalaryProfilesPage /> : currentPage === 'payroll' ? <PayrollPage /> : currentPage === 'simulator' ? <SimulatorPage /> : currentPage === 'parameters' ? <ParametersPage /> : currentPage === 'departures' ? <DeparturesPage /> : currentPage === 'audit' ? <AuditLogPage /> : currentPage === 'settings' ? <SettingsPage /> : <PagePlaceholder page={currentPage} />}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}