'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Search, Wallet } from 'lucide-react'
import { api } from '@/lib/api'
import { formatFcfa } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import SalaryProfileFormDialog from './SalaryProfileFormDialog'
import SalaryProfileDetailDialog from './SalaryProfileDetailDialog'

interface ProfileRow {
  id: string
  employeeId: string
  employeeName: string
  directionName: string
  baseSalary: number
  sursalary: number
  igrParts: number
  status: string
  version: number
  effectiveFrom: string
  effectiveTo: string | null
  employee?: { matricule: string }
}

const PAGE_SIZE = 10

export default function SalaryProfilesPage() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Tous')
  const [page, setPage] = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const fetchProfiles = () => {
    setLoading(true)
    const params: Record<string, string> = {
      limit: String(PAGE_SIZE * 5),
      offset: '0',
    }
    if (search.trim()) params.search = search.trim()
    if (statusFilter !== 'Tous') params.status = statusFilter

    api.get<{ data: ProfileRow[]; total: number }>('/api/salary-profiles', params)
      .then((res) => { setProfiles(res.data || []); setTotal(res.total || 0) })
      .catch(() => setProfiles([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const t = setTimeout(fetchProfiles, 0)
    return () => clearTimeout(t)
  }, [statusFilter])

  useEffect(() => {
    const t = setTimeout(fetchProfiles, 300)
    return () => clearTimeout(t)
  }, [search])

  const totalPages = Math.max(1, Math.ceil(profiles.length / PAGE_SIZE))
  const safePage = page >= totalPages && page > 0 ? totalPages - 1 : page
  const paged = profiles.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  if (selectedId) {
    return (
      <SalaryProfileDetailDialog
        profileId={selectedId}
        onClose={() => { setSelectedId(null); fetchProfiles() }}
        onEdit={() => { setSelectedId(null); fetchProfiles() }}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <section className="animate-fade-in-up flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profils salariaux</h1>
          <p className="text-sm text-muted-foreground">
            {total} profil{total !== 1 ? 's' : ''} enregistré{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou matricule..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
              className="pl-9"
            />
          </div>
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus className="mr-1.5 h-4 w-4" /> Nouveau
          </Button>
        </div>
      </section>

      {/* Status filter tabs */}
      <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0) }}>
        <TabsList>
          <TabsTrigger value="Tous">Tous</TabsTrigger>
          <TabsTrigger value="Actif">Actif</TabsTrigger>
          <TabsTrigger value="Inactif">Inactif</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Table */}
      <div className="animate-fade-in-up rounded-lg border">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : paged.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Wallet className="mb-2 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Aucun profil trouvé</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Matricule</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nom employé</TableHead>
                <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">Direction</TableHead>
                <TableHead className="hidden text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">Salaire de base</TableHead>
                <TableHead className="hidden text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">Sursalaire</TableHead>
                <TableHead className="hidden text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">Parts IGR</TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Statut</TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">V.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((p) => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedId(p.id)}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {p.employee?.matricule || '—'}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{p.employeeName}</TableCell>
                  <TableCell className="hidden max-w-[160px] truncate text-sm text-muted-foreground md:table-cell">
                    {p.directionName}
                  </TableCell>
                  <TableCell className="hidden text-right text-sm tabular-nums sm:table-cell">
                    {formatFcfa(p.baseSalary)}
                  </TableCell>
                  <TableCell className="hidden text-right text-sm tabular-nums sm:table-cell">
                    {formatFcfa(p.sursalary)}
                  </TableCell>
                  <TableCell className="hidden text-center text-sm tabular-nums lg:table-cell">
                    {p.igrParts}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={p.status === 'Actif' ? 'default' : 'secondary'}
                      className={
                        p.status === 'Actif'
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400'
                          : p.status === 'Inactif'
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-400'
                            : ''
                      }
                    >
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">{p.version}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="animate-fade-in-up flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {safePage + 1} sur {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => (
              <Button
                key={i}
                variant={i === safePage ? 'default' : 'outline'}
                size="sm"
                className="h-8 w-8 p-0 text-xs"
                onClick={() => setPage(i)}
              >
                {i + 1}
              </Button>
            ))}
            <Button variant="outline" size="sm" disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create dialog */}
      {showCreate && (
        <SalaryProfileFormDialog
          onClose={() => { setShowCreate(false); fetchProfiles() }}
        />
      )}
    </div>
  )
}