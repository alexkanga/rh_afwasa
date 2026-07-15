'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Users, UserCheck, AlertTriangle, Clock, PieChartIcon, BarChart3Icon, Banknote } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { formatFcfa } from '@/lib/format'

const DirectionPieChart = dynamic(
  () => import('@/components/charts/DirectionPieChart'),
  { loading: () => <ChartSkeleton />, ssr: false },
)
const ContractBarChart = dynamic(
  () => import('@/components/charts/ContractBarChart'),
  { loading: () => <ChartSkeleton />, ssr: false },
)

interface DashboardStats {
  totalEmployees: number
  activeEmployees: number
  incompleteProfiles: number
  expiringContracts: number
  monthlyPayrollTotal: number
  byDirection: { name: string; count: number; color: string }[]
  byContractType: { name: string; count: number }[]
}

function ChartSkeleton() {
  return (
    <div className="flex h-[240px] items-center justify-center">
      <Skeleton className="h-48 w-48 rounded-full" />
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<DashboardStats>('/api/dashboard/stats')
      .then(setStats)
      .catch(() => setError('Erreur lors du chargement des données'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent>
                <ChartSkeleton />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 py-16">
        <AlertTriangle className="mb-3 h-10 w-10 text-amber-500" />
        <p className="text-sm font-medium text-muted-foreground">
          {error || 'Aucune donnée disponible'}
        </p>
      </div>
    )
  }

  const cards = [
    {
      title: 'Effectif total',
      value: stats.totalEmployees.toLocaleString('fr-FR'),
      icon: Users,
      iconBg: 'bg-[#362981]/10',
      iconColor: 'text-[#362981]',
    },
    {
      title: 'Employés actifs',
      value: stats.activeEmployees.toLocaleString('fr-FR'),
      icon: UserCheck,
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/40',
      iconColor: 'text-emerald-600',
      valueColor: 'text-emerald-600',
    },
    {
      title: 'Profils à compléter',
      value: stats.incompleteProfiles.toLocaleString('fr-FR'),
      icon: AlertTriangle,
      iconBg: 'bg-amber-50 dark:bg-amber-950/40',
      iconColor: 'text-amber-600',
      valueColor: stats.incompleteProfiles > 0 ? 'text-amber-600' : undefined,
    },
    {
      title: 'Contrats expirants',
      value: stats.expiringContracts.toLocaleString('fr-FR'),
      icon: Clock,
      iconBg: 'bg-amber-50 dark:bg-amber-950/40',
      iconColor: 'text-amber-600',
      valueColor: stats.expiringContracts > 0 ? 'text-amber-600' : 'text-emerald-600',
    },
  ]

  return (
    <div className="space-y-6">
      <section className="animate-fade-in-up">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Tableau de bord</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Voici un aperçu de votre système RH.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card, i) => (
          <Card key={card.title} className={`animate-fade-in-up stagger-${i + 1}`}>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {card.title}
                  </p>
                  <p className={`mt-2 text-2xl font-bold tracking-tight md:text-3xl ${card.valueColor || 'text-foreground'}`}>
                    {card.value}
                  </p>
                </div>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.iconBg}`}>
                  <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly payroll total banner */}
      <Card className="animate-fade-in-up">
        <CardContent className="flex items-center gap-4 p-4 md:p-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#009446]/10">
            <Banknote className="h-5 w-5 text-[#009446]" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Masse salariale mensuelle estimée
            </p>
            <p className="mt-1 text-xl font-bold text-[#009446] md:text-2xl">
              {formatFcfa(stats.monthlyPayrollTotal)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="animate-fade-in-up">
          <CardHeader className="pb-0 pt-4 px-4 md:px-6">
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChartIcon className="h-4 w-4 text-[#362981]" />
              Répartition par direction
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4 md:px-4 md:pb-6">
            <DirectionPieChart data={stats.byDirection} />
          </CardContent>
        </Card>

        <Card className="animate-fade-in-up">
          <CardHeader className="pb-0 pt-4 px-4 md:px-6">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3Icon className="h-4 w-4 text-[#009446]" />
              Types de contrat
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4 md:px-4 md:pb-6">
            <ContractBarChart data={stats.byContractType} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}