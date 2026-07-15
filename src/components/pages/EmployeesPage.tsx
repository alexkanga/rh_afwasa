'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Search, Users } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import EmployeeDetailPage from './EmployeeDetailPage'

interface EmployeeRow {
  id: string
  matricule: string
  lastName: string
  firstName: string
  currentPosition: string | null
  directionName: string
  status: string
}

const PAGE_SIZE = 10

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (selectedId) return
    let cancelled = false
    api
      .get<{ data: EmployeeRow[]; total: number }>('/api/employees', {
        limit: String(PAGE_SIZE * 3),
        offset: '0',
      })
      .then((res) => {
        setEmployees(res.data || [])
        setTotal(res.total || 0)
      })
      .catch(() => { if (!cancelled) setEmployees([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [selectedId])

  const filtered = useMemo(() => {
    if (!search.trim()) return employees
    const q = search.toLowerCase()
    return employees.filter(
      (e) =>
        e.matricule.toLowerCase().includes(q) ||
        e.lastName.toLowerCase().includes(q) ||
        e.firstName.toLowerCase().includes(q) ||
        (e.currentPosition || '').toLowerCase().includes(q) ||
        (e.directionName || '').toLowerCase().includes(q)
    )
  }, [employees, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = page >= totalPages && page > 0 ? totalPages - 1 : page
  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  // ── Detail view ──
  if (selectedId) {
    return (
      <EmployeeDetailPage
        employeeId={selectedId}
        onBack={() => { setSelectedId(null); setLoading(true) }}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <section className="animate-fade-in-up flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employés</h1>
          <p className="text-sm text-muted-foreground">
            {total} employé{total !== 1 ? 's' : ''} enregistré{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
            className="pl-9"
          />
        </div>
      </section>

      {/* Coming soon notice */}
      <div className="animate-fade-in-up rounded-lg border border-dashed border-border bg-muted/30 px-4 py-2.5 text-center text-xs text-muted-foreground">
        La création d&apos;employés sera bientôt disponible.
      </div>

      {/* Table */}
      <div className="animate-fade-in-up rounded-lg border">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : paged.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="mb-2 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Aucun employé trouvé</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Matricule</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nom</TableHead>
                <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">Poste</TableHead>
                <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">Direction</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((emp) => (
                <TableRow
                  key={emp.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedId(emp.id)}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">{emp.matricule}</TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{emp.lastName}</span>{' '}
                    <span className="text-sm text-muted-foreground">{emp.firstName}</span>
                  </TableCell>
                  <TableCell className="hidden max-w-[180px] truncate text-sm text-muted-foreground sm:table-cell">
                    {emp.currentPosition || '—'}
                  </TableCell>
                  <TableCell className="hidden max-w-[160px] truncate text-sm text-muted-foreground md:table-cell">
                    {emp.directionName || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={emp.status === 'Actif' ? 'default' : 'secondary'}
                      className={
                        emp.status === 'Actif'
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400'
                          : ''
                      }
                    >
                      {emp.status}
                    </Badge>
                  </TableCell>
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
    </div>
  )
}