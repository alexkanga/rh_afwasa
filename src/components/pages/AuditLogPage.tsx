'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Database,
  Calendar,
  CalendarDays,
  CalendarRange,
  RefreshCw,
  Download,
  Shield,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Globe,
  User as UserIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'
import { toast } from 'sonner'

// ── Types ──────────────────────────────────────────────────────────────────

interface AuditLog {
  id: string
  userId: string | null
  userName: string | null
  userEmail: string | null
  action: string
  entity: string
  entityId: string | null
  details: Record<string, unknown> | null
  ipAddress: string | null
  createdAt: string
}

interface AuditStats {
  totalCount: number
  todayCount: number
  weekCount: number
  monthCount: number
  topUsers: { userName: string | null; count: number }[]
  topActions: { action: string; count: number }[]
  actionCountsByDay: { date: string; count: number }[]
}

interface AuditResponse {
  data: AuditLog[]
  total: number
  page: number
  limit: number
  actions: string[]
  entities: string[]
}

// ── Helpers ────────────────────────────────────────────────────────────────

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  CREATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  UPDATE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  PHANTOM_AUTO_CREATE: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  PROCESS: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  VALIDATE: 'bg-[#362981]/15 text-[#362981] dark:bg-[#362981]/30 dark:text-[#C7FFEE]',
}

const ENTITY_COLORS: Record<string, string> = {
  User: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-800',
  Employee: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800',
  Contract: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800',
  SalaryProfile: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800',
  PayrollPeriod: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-800',
  PayrollLine: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-300 dark:border-cyan-800',
}

const FRENCH_MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

const FRENCH_DAYS_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

function formatFrenchDate(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDate()
  const month = FRENCH_MONTHS[d.getMonth()]
  const year = d.getFullYear()
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  return `${day} ${month} ${year}, ${hours}:${minutes}`
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getDate()}/${(d.getMonth() + 1).toString().padStart(2, '0')}`
}

function truncate(str: string, max: number): string {
  if (!str) return '—'
  if (str.length <= max) return str
  return str.substring(0, max) + '…'
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    toast.success('Copié dans le presse-papiers')
  })
}

// ── Component ──────────────────────────────────────────────────────────────

export default function AuditLogPage() {
  // Data state
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [actions, setActions] = useState<string[]>([])
  const [entities, setEntities] = useState<string[]>([])
  const [total, setTotal] = useState(0)

  // Loading / error
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Pagination
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [fetchVersion, setFetchVersion] = useState(0)

  // Filters
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [actionFilter, setActionFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [searchFilter, setSearchFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Expandable row
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Detail sheet
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null)

  // Stable ref for stats version to avoid re-fetching on every render
  const statsVersionRef = useRef(0)
  const [statsVersion, setStatsVersion] = useState(0)

  // ── Helper: update a filter and reset page ──────────────────────────────
  const updateFilter = (setter: (v: string) => void, value: string) => {
    setter(value)
    setPage(1)
  }

  // ── Fetch stats ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    api.get<AuditStats>('/api/audit/stats')
      .then((res) => { if (!cancelled) setStats(res) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setStatsLoading(false) })
    return () => { cancelled = true }
  }, [statsVersion])

  // ── Fetch logs ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    const params: Record<string, string> = {
      page: page.toString(),
      limit: limit.toString(),
    }
    if (actionFilter) params.action = actionFilter
    if (entityFilter) params.entity = entityFilter
    if (searchFilter) params.search = searchFilter
    if (dateFrom) params.dateFrom = dateFrom
    if (dateTo) params.dateTo = dateTo

    api.get<AuditResponse>('/api/audit', params)
      .then((res) => {
        if (!cancelled) {
          setLogs(res.data)
          setTotal(res.total)
          setActions(res.actions)
          setEntities(res.entities)
        }
      })
      .catch((err) => { if (!cancelled) setError(err.message || 'Erreur lors du chargement') })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [page, limit, actionFilter, entityFilter, searchFilter, dateFrom, dateTo, fetchVersion])

  // ── Refresh handler ─────────────────────────────────────────────────────
  const handleRefresh = () => {
    setFetchVersion((v) => v + 1)
    statsVersionRef.current += 1
    setStatsVersion(statsVersionRef.current)
  }

  // ── Computed values ─────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const rangeStart = (page - 1) * limit + 1
  const rangeEnd = Math.min(page * limit, total)

  // Chart data — last 14 days
  const chartData = useMemo(() => {
    if (!stats?.actionCountsByDay) return []
    const all = stats.actionCountsByDay
    return all.slice(-14)
  }, [stats])

  const chartMax = useMemo(() => {
    if (chartData.length === 0) return 1
    return Math.max(...chartData.map((d) => d.count), 1)
  }, [chartData])

  const resetFilters = () => {
    setActionFilter('')
    setEntityFilter('')
    setSearchFilter('')
    setDateFrom('')
    setDateTo('')
  }

  const hasActiveFilters = actionFilter || entityFilter || searchFilter || dateFrom || dateTo

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Journal d&apos;Audit
          </h1>
          <p className="text-sm text-muted-foreground">
            Historique complet des actions système
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled className="gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exporter</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Actualiser</span>
          </Button>
        </div>
      </div>

      {/* ── Stats Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Total */}
        <Card className="border-l-4 border-l-[#362981]">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Total entrées
                </p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold text-[#362981]">
                    {stats?.totalCount.toLocaleString('fr-FR') ?? '0'}
                  </p>
                )}
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#362981]/10">
                <Database className="h-5 w-5 text-[#362981]" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Aujourd'hui */}
        <Card className="border-l-4 border-l-[#029CB1]">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Aujourd&apos;hui
                </p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold text-[#029CB1]">
                    {stats?.todayCount.toLocaleString('fr-FR') ?? '0'}
                  </p>
                )}
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#029CB1]/10">
                <Calendar className="h-5 w-5 text-[#029CB1]" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cette semaine */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Cette semaine
                </p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold text-blue-600">
                    {stats?.weekCount.toLocaleString('fr-FR') ?? '0'}
                  </p>
                )}
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                <CalendarDays className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ce mois */}
        <Card className="border-l-4 border-l-[#009446]">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Ce mois
                </p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold text-[#009446]">
                    {stats?.monthCount.toLocaleString('fr-FR') ?? '0'}
                  </p>
                )}
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#009446]/10">
                <CalendarRange className="h-5 w-5 text-[#009446]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Mini Activity Chart ─────────────────────────────────────────── */}
      {!statsLoading && chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Activité — 14 derniers jours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1.5" style={{ height: 80 }}>
              {chartData.map((d) => {
                const heightPercent = d.count > 0 ? Math.max((d.count / chartMax) * 100, 4) : 4
                return (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {d.count || ''}
                    </span>
                    <div
                      className="w-full rounded-t-sm transition-all duration-300"
                      style={{
                        height: `${heightPercent}%`,
                        backgroundColor: d.count > 0 ? '#362981' : '#e5e7eb',
                        opacity: d.count > 0 ? 0.85 : 0.3,
                      }}
                    />
                  </div>
                )
              })}
            </div>
            <div className="mt-1.5 flex gap-1.5">
              {chartData.map((d) => {
                const dt = new Date(d.date)
                return (
                  <span key={d.date} className="flex-1 text-center text-[9px] text-muted-foreground">
                    {FRENCH_DAYS_SHORT[dt.getDay()]} {dt.getDate()}
                  </span>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <Card>
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="flex w-full items-center justify-between p-4 md:p-6"
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtres</span>
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 text-xs">Actifs</Badge>
            )}
          </div>
          {filtersOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {filtersOpen && (
          <>
            <Separator />
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {/* Action */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Action</label>
                  <Select value={actionFilter} onValueChange={(v) => updateFilter(setActionFilter, v === '__all__' ? '' : v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Toutes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Toutes</SelectItem>
                      {actions.map((a) => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Entity */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Entité</label>
                  <Select value={entityFilter} onValueChange={(v) => updateFilter(setEntityFilter, v === '__all__' ? '' : v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Toutes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Toutes</SelectItem>
                      {entities.map((e) => (
                        <SelectItem key={e} value={e}>{e}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Search */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Recherche</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Utilisateur, entité…"
                      className="h-9 pl-8"
                      value={searchFilter}
                      onChange={(e) => updateFilter(setSearchFilter, e.target.value)}
                    />
                  </div>
                </div>

                {/* Date From */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Du</label>
                  <Input
                    type="date"
                    className="h-9"
                    value={dateFrom}
                    onChange={(e) => updateFilter(setDateFrom, e.target.value)}
                  />
                </div>

                {/* Date To */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Au</label>
                  <Input
                    type="date"
                    className="h-9"
                    value={dateTo}
                    onChange={(e) => updateFilter(setDateTo, e.target.value)}
                  />
                </div>

                {/* Buttons */}
                <div className="flex items-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetFilters}
                    className="h-9 gap-1.5"
                    disabled={!hasActiveFilters}
                  >
                    <X className="h-3.5 w-3.5" />
                    Réinitialiser
                  </Button>
                </div>
              </div>
            </CardContent>
          </>
        )}
      </Card>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4 md:p-6">
              <Skeleton className="h-5 w-48" />
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12">
              <Shield className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                Réessayer
              </Button>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Shield className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-base font-medium text-muted-foreground">
                Aucune entrée d&apos;audit trouvée
              </p>
              <p className="text-sm text-muted-foreground/70">
                {hasActiveFilters
                  ? 'Essayez de modifier vos filtres'
                  : 'Aucune activité n\'a été enregistrée'}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={resetFilters} className="mt-1">
                  Réinitialiser les filtres
                </Button>
              )}
            </div>
          ) : (
            <>
              <ScrollArea className="max-h-[640px]">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[180px] text-xs font-semibold uppercase text-muted-foreground">
                        Date &amp; Heure
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                        Utilisateur
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                        Action
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                        Entité
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                        ID Entité
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                        Détails
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const isExpanded = expandedId === log.id
                      const actionColorClass = ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      const entityColorClass = ENTITY_COLORS[log.entity] || 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-700'

                      return (
                        <tbody key={log.id}>
                          <TableRow
                            className="cursor-pointer transition-colors hover:bg-muted/50"
                            onClick={() => setExpandedId(isExpanded ? null : log.id)}
                          >
                            {/* Date */}
                            <TableCell className="whitespace-nowrap text-sm">
                              <span className="text-foreground">
                                {formatFrenchDate(log.createdAt)}
                              </span>
                            </TableCell>

                            {/* Utilisateur */}
                            <TableCell>
                              {log.userName ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#362981]/10">
                                    <UserIcon className="h-3.5 w-3.5 text-[#362981]" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-foreground">
                                      {log.userName}
                                    </p>
                                    {log.userEmail && (
                                      <p className="text-xs text-muted-foreground">
                                        {log.userEmail}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                                    <Globe className="h-3.5 w-3.5 text-gray-400" />
                                  </div>
                                  <span className="text-sm text-gray-400">Système</span>
                                </div>
                              )}
                            </TableCell>

                            {/* Action */}
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`border-0 text-xs font-semibold ${actionColorClass}`}
                              >
                                {log.action}
                              </Badge>
                            </TableCell>

                            {/* Entity */}
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-xs ${entityColorClass}`}
                              >
                                {log.entity}
                              </Badge>
                            </TableCell>

                            {/* Entity ID */}
                            <TableCell>
                              {log.entityId ? (
                                <div className="flex items-center gap-1">
                                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
                                    {truncate(log.entityId, 12)}
                                  </code>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      copyToClipboard(log.entityId!)
                                    }}
                                    className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 [&:hover]:opacity-100"
                                    title="Copier l'ID"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>

                            {/* Details */}
                            <TableCell>
                              {log.details ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setDetailLog(log)
                                  }}
                                  className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                >
                                  <Eye className="h-3 w-3" />
                                  Voir
                                </button>
                              ) : (
                                <span className="text-muted-foreground/50">—</span>
                              )}
                            </TableCell>
                          </TableRow>

                          {/* Expanded Row */}
                          {isExpanded && (
                            <TableRow className="bg-muted/20 hover:bg-muted/20">
                              <TableCell colSpan={6} className="py-4">
                                <div className="grid grid-cols-1 gap-4 pl-2 sm:grid-cols-2 lg:grid-cols-4">
                                  {/* User Info */}
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                      Utilisateur
                                    </p>
                                    <p className="text-sm font-medium text-foreground">
                                      {log.userName || 'Système'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {log.userEmail || '—'}
                                    </p>
                                    {log.userId && (
                                      <p className="text-xs font-mono text-muted-foreground/70">
                                        ID: {log.userId}
                                      </p>
                                    )}
                                  </div>

                                  {/* Entity Info */}
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                      Entité
                                    </p>
                                    <p className="text-sm font-medium text-foreground">
                                      {log.entity}
                                    </p>
                                    {log.entityId && (
                                      <p className="text-xs font-mono text-muted-foreground/70">
                                        ID: {log.entityId}
                                      </p>
                                    )}
                                  </div>

                                  {/* IP Address */}
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                      Adresse IP
                                    </p>
                                    <p className="text-sm text-foreground">
                                      {log.ipAddress || 'Non disponible'}
                                    </p>
                                  </div>

                                  {/* Action */}
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                      Action
                                    </p>
                                    <Badge
                                      variant="outline"
                                      className={`border-0 text-xs font-semibold ${actionColorClass}`}
                                    >
                                      {log.action}
                                    </Badge>
                                  </div>
                                </div>

                                {/* Full JSON Details */}
                                {log.details && (
                                  <div className="mt-4">
                                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                      Détails complets
                                    </p>
                                    <div className="max-h-60 overflow-auto rounded-lg bg-gray-950 p-3">
                                      <pre className="text-xs leading-relaxed text-gray-300">
                                        {JSON.stringify(log.details, null, 2)}
                                      </pre>
                                    </div>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          )}
                        </tbody>
                      )
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* ── Pagination ────────────────────────────────────────────── */}
              <Separator />
              <div className="flex flex-col items-center gap-3 p-4 sm:flex-row sm:justify-between md:p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    {rangeStart} à {rangeEnd} sur {total.toLocaleString('fr-FR')} entrées
                  </span>
                  <span className="hidden text-muted-foreground/50 sm:inline">|</span>
                  <div className="hidden items-center gap-1.5 sm:flex">
                    <label className="text-xs">Lignes :</label>
                    <Select value={limit.toString()} onValueChange={(v) => { setLimit(parseInt(v, 10)); setPage(1) }}>
                      <SelectTrigger className="h-7 w-[70px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  {generatePageNumbers(page, totalPages).map((p, i) =>
                    p === '...' ? (
                      <span key={`dots-${i}`} className="px-1 text-sm text-muted-foreground">
                        …
                      </span>
                    ) : (
                      <Button
                        key={p}
                        variant={p === page ? 'default' : 'outline'}
                        size="icon"
                        className="h-8 w-8 text-xs"
                        style={p === page ? { backgroundColor: '#362981' } : undefined}
                        onClick={() => setPage(p as number)}
                      >
                        {p}
                      </Button>
                    ),
                  )}

                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Detail Sheet ────────────────────────────────────────────────── */}
      <Sheet open={!!detailLog} onOpenChange={(open) => !open && setDetailLog(null)}>
        <SheetContent side="right" className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Détails de l&apos;entrée</SheetTitle>
            <SheetDescription>
              {detailLog
                ? `${detailLog.action} — ${detailLog.entity}${detailLog.entityId ? ` (${detailLog.entityId.substring(0, 8)}…)` : ''}`
                : ''}
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 px-4">
            {detailLog && (
              <div className="space-y-6 pb-6">
                {/* User Section */}
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Utilisateur
                  </h3>
                  <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      {detailLog.userName ? (
                        <UserIcon className="h-4 w-4 text-[#362981]" />
                      ) : (
                        <Globe className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-sm font-semibold">
                        {detailLog.userName || 'Système'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {detailLog.userEmail || 'Aucun email'}
                    </p>
                    {detailLog.userId && (
                      <p className="text-xs font-mono text-muted-foreground/60">
                        ID: {detailLog.userId}
                      </p>
                    )}
                  </div>
                </section>

                {/* Action Section */}
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Action
                  </h3>
                  <Badge
                    variant="outline"
                    className={`border-0 text-xs font-semibold ${ACTION_COLORS[detailLog.action] || 'bg-gray-100 text-gray-700'}`}
                  >
                    {detailLog.action}
                  </Badge>
                </section>

                {/* Entity Section */}
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Entité
                  </h3>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-xs ${ENTITY_COLORS[detailLog.entity] || 'bg-gray-50 text-gray-600 border-gray-200'}`}
                    >
                      {detailLog.entity}
                    </Badge>
                    {detailLog.entityId && (
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
                        {detailLog.entityId}
                      </code>
                    )}
                  </div>
                </section>

                {/* Timestamp */}
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Date &amp; Heure
                  </h3>
                  <p className="text-sm font-medium">
                    {formatFrenchDate(detailLog.createdAt)}
                  </p>
                </section>

                {/* IP Address */}
                {detailLog.ipAddress && (
                  <section className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Adresse IP
                    </h3>
                    <code className="rounded bg-muted px-2 py-1 text-sm font-mono text-foreground">
                      {detailLog.ipAddress}
                    </code>
                  </section>
                )}

                {/* JSON Details */}
                {detailLog.details && (
                  <section className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Détails JSON
                    </h3>
                    <div className="max-h-96 overflow-auto rounded-lg bg-gray-950 p-4">
                      <pre className="text-xs leading-relaxed text-gray-300">
                        {JSON.stringify(detailLog.details, null, 2)}
                      </pre>
                    </div>
                  </section>
                )}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ── Pagination Helper ────────────────────────────────────────────────────────

function generatePageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages: (number | string)[] = [1]

  if (current > 3) pages.push('...')

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  for (let i = start; i <= end; i++) pages.push(i)

  if (current < total - 2) pages.push('...')

  pages.push(total)

  return pages
}