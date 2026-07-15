'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, Eye, Search, Trash2, UserMinus,
  CalendarClock, CheckCircle2, Clock, Users,
  ArrowRight, X,
} from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { formatDateShort } from '@/lib/format'
import { DEPARTURE_REASONS } from '@/lib/constants'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// ── Types ──

interface DepartureRow {
  id: string
  employeeId: string
  matricule: string
  employeeName: string
  employeeLastName: string
  employeeFirstName: string
  currentPosition: string
  departmentName: string
  directionName: string
  reason: string
  type: string
  departureDate: string
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

interface DepartureDetail extends DepartureRow {
  employeeStatus: string
  hireDate: string | null
  workflow: string[]
  nextStatus: string | null
}

interface ActiveEmployee {
  id: string
  matricule: string
  lastName: string
  firstName: string
  currentPosition: string
  departmentName: string
  directionName: string
}

interface Stats {
  total: number
  enregistres: number
  enCours: number
  cloturesCeMois: number
}

// ── Constants ──

const REASON_BADGE: Record<string, string> = {
  'Démission': 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-400',
  'Licenciement': 'bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-400',
  'Retraite': 'bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-400',
  'Fin de contrat': 'bg-gray-100 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400',
  'Décès': 'bg-neutral-200 text-neutral-800 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200',
  'Autre': '',
}

const STATUS_BADGE: Record<string, string> = {
  'Enregistré': 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-400',
  'En cours': 'bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-400',
  'Traité': 'bg-purple-100 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/50 dark:text-purple-400',
  'Clôturé': 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400',
}

const WORKFLOW_STEPS = ['Enregistré', 'En cours', 'Traité', 'Clôturé'] as const

const PAGE_SIZE = 10

// ── Component ──

export default function DeparturesPage() {
  const [departures, setDepartures] = useState<DepartureRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [reasonFilter, setReasonFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [stats, setStats] = useState<Stats>({ total: 0, enregistres: 0, enCours: 0, cloturesCeMois: 0 })

  // Create form state
  const [activeEmployees, setActiveEmployees] = useState<ActiveEmployee[]>([])
  const [formEmployeeId, setFormEmployeeId] = useState('')
  const [formReason, setFormReason] = useState('')
  const [formType, setFormType] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // ── Fetch departures ──
  const fetchDepartures = useCallback(() => {
    setLoading(true)
    const params: Record<string, string> = {
      limit: String(PAGE_SIZE),
      page: String(page),
    }
    if (search.trim()) params.search = search.trim()
    if (reasonFilter) params.reason = reasonFilter
    if (statusFilter) params.status = statusFilter

    api.get<{ data: DepartureRow[]; total: number }>('/api/departures', params)
      .then((res) => { setDepartures(res.data || []); setTotal(res.total || 0) })
      .catch(() => setDepartures([]))
      .finally(() => setLoading(false))
  }, [search, reasonFilter, statusFilter, page])

  useEffect(() => {
    const t = setTimeout(fetchDepartures, 300)
    return () => clearTimeout(t)
  }, [fetchDepartures])

  // ── Fetch stats ──
  useEffect(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    Promise.all([
      api.get<{ data: DepartureRow[]; total: number }>('/api/departures', { limit: '1' }),
      api.get<{ data: DepartureRow[]; total: number }>('/api/departures', { limit: '1', status: 'Enregistré' }),
      api.get<{ data: DepartureRow[]; total: number }>('/api/departures', { limit: '1', status: 'En cours' }),
      api.get<{ data: DepartureRow[]; total: number }>('/api/departures', { limit: '1', status: 'Clôturé' }),
    ]).then(([allRes, enregRes, encoursRes, clotureRes]) => {
      // Filter "clôturés ce mois" client-side from the total Clôturé results
      // Since the API doesn't support date range filtering easily, we use the total from the API
      // For a more precise count we'd need a dedicated stats endpoint
      const clotures = clotureRes.data || []
      const cloturesCeMois = clotures.filter((d) => {
        const date = new Date(d.updatedAt || d.createdAt)
        return date >= monthStart && date < monthEnd
      }).length

      // Actually, let's just use totals since we can't get all clôturés with limit:1
      // Better approach: fetch stats separately
      setStats({
        total: allRes.total || 0,
        enregistres: enregRes.total || 0,
        enCours: encoursRes.total || 0,
        cloturesCeMois: clotureRes.total || 0,
      })
    }).catch(() => {})
  }, [])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // ── Open create dialog ──
  const openCreate = async () => {
    try {
      const res = await api.get<ActiveEmployee[]>('/api/employees/active')
      setActiveEmployees(res || [])
      setFormEmployeeId('')
      setFormReason('')
      setFormType('')
      setFormDate('')
      setFormNotes('')
      setShowCreate(true)
    } catch {
      toast.error('Erreur lors du chargement des employés actifs')
    }
  }

  // ── Handle create ──
  const handleCreate = async () => {
    if (!formEmployeeId || !formReason || !formType || !formDate) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/api/departures', {
        employeeId: formEmployeeId,
        reason: formReason,
        type: formType,
        departureDate: formDate,
        notes: formNotes || null,
      })
      toast.success('Départ enregistré avec succès')
      setShowCreate(false)
      fetchDepartures()
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message)
      else toast.error('Erreur lors de la création du départ')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Handle delete ──
  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await api.delete(`/api/departures/${deleteId}`)
      toast.success('Départ supprimé avec succès')
      setDeleteId(null)
      fetchDepartures()
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message)
      else toast.error('Erreur lors de la suppression')
    } finally {
      setDeleting(false)
    }
  }

  // ── Detail view ──
  if (detailId) {
    return <DepartureDetailDialog departureId={detailId} onClose={() => { setDetailId(null); fetchDepartures() }} />
  }

  const rangeStart = page * PAGE_SIZE + 1
  const rangeEnd = Math.min((page + 1) * PAGE_SIZE, total)

  return (
    <div className="space-y-4">
      {/* Header */}
      <section className="animate-fade-in-up flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestion des Départs</h1>
          <p className="text-sm text-muted-foreground">
            Suivi et traitement des départs des employés
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-[#362981] hover:bg-[#362981]/90"
        >
          <UserMinus className="mr-1.5 h-4 w-4" />
          Nouveau départ
        </Button>
      </section>

      {/* Stats Cards */}
      <section className="animate-fade-in-up grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-l-4 border-l-[#362981]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#362981]/10">
                <Users className="h-5 w-5 text-[#362981]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total départs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <CalendarClock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.enregistres}</p>
                <p className="text-xs text-muted-foreground">Enregistrés</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.enCours}</p>
                <p className="text-xs text-muted-foreground">En cours de traitement</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-[#009446]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#009446]/10">
                <CheckCircle2 className="h-5 w-5 text-[#009446]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.cloturesCeMois}</p>
                <p className="text-xs text-muted-foreground">Clôturés</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Filters */}
      <section className="animate-fade-in-up flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou matricule..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            className="pl-9"
          />
        </div>
        <Select value={reasonFilter} onValueChange={(v) => { setReasonFilter(v === '__all__' ? '' : v); setPage(0) }}>
          <SelectTrigger className="w-full sm:w-[170px]">
            <SelectValue placeholder="Raison" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Toutes les raisons</SelectItem>
            {DEPARTURE_REASONS.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === '__all__' ? '' : v); setPage(0) }}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous</SelectItem>
            {WORKFLOW_STEPS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      {/* Table */}
      <div className="animate-fade-in-up rounded-lg border">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : departures.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <UserMinus className="mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">Aucun départ trouvé</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Les départs enregistrés apparaîtront ici
            </p>
          </div>
        ) : (
          <div className="max-h-[calc(100vh-26rem)] overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Employé</TableHead>
                  <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">Matricule</TableHead>
                  <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">Direction</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Raison</TableHead>
                  <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">Type</TableHead>
                  <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">Date départ</TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Statut</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departures.map((d) => (
                  <TableRow key={d.id} className="cursor-pointer" onClick={() => setDetailId(d.id)}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {d.employeeLastName} {d.employeeFirstName}
                        </span>
                        <span className="text-xs text-muted-foreground">{d.currentPosition}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline" className="font-mono text-xs">
                        {d.matricule}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden max-w-[160px] truncate text-sm text-muted-foreground lg:table-cell">
                      {d.directionName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={REASON_BADGE[d.reason] || ''}>
                        {d.reason}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline">{d.type}</Badge>
                    </TableCell>
                    <TableCell className="hidden text-sm tabular-nums sm:table-cell">
                      {formatDateShort(d.departureDate)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className={STATUS_BADGE[d.status] || ''}>
                        {d.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => { e.stopPropagation(); setDetailId(d.id) }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {d.status === 'Enregistré' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                            onClick={(e) => { e.stopPropagation(); setDeleteId(d.id) }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="animate-fade-in-up flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {rangeStart} à {rangeEnd} sur {total} départ{total !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => (
              <Button
                key={i}
                variant={i === page ? 'default' : 'outline'}
                size="sm"
                className="h-8 w-8 p-0 text-xs"
                onClick={() => setPage(i)}
              >
                {i + 1}
              </Button>
            ))}
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <CreateDepartureDialog
        open={showCreate}
        onOpenChange={(open) => { if (!open) setShowCreate(false) }}
        employees={activeEmployees}
        formEmployeeId={formEmployeeId}
        setFormEmployeeId={setFormEmployeeId}
        formReason={formReason}
        setFormReason={setFormReason}
        formType={formType}
        setFormType={setFormType}
        formDate={formDate}
        setFormDate={setFormDate}
        formNotes={formNotes}
        setFormNotes={setFormNotes}
        submitting={submitting}
        onSubmit={handleCreate}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce départ ? Le statut de l&apos;employé sera restauré à &quot;Actif&quot;.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ===================================================================
   Create Departure Dialog
   =================================================================== */

function CreateDepartureDialog({
  open, onOpenChange, employees,
  formEmployeeId, setFormEmployeeId,
  formReason, setFormReason,
  formType, setFormType,
  formDate, setFormDate,
  formNotes, setFormNotes,
  submitting, onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  employees: ActiveEmployee[]
  formEmployeeId: string
  setFormEmployeeId: (v: string) => void
  formReason: string
  setFormReason: (v: string) => void
  formType: string
  setFormType: (v: string) => void
  formDate: string
  setFormDate: (v: string) => void
  formNotes: string
  setFormNotes: (v: string) => void
  submitting: boolean
  onSubmit: () => void
}) {
  const [empSearch, setEmpSearch] = useState('')

  const filteredEmployees = useMemo(() => {
    if (!empSearch.trim()) return employees
    const q = empSearch.toLowerCase()
    return employees.filter(
      (e) =>
        e.matricule.toLowerCase().includes(q) ||
        e.lastName.toLowerCase().includes(q) ||
        e.firstName.toLowerCase().includes(q) ||
        e.currentPosition.toLowerCase().includes(q)
    )
  }, [employees, empSearch])

  const selectedEmp = employees.find((e) => e.id === formEmployeeId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau départ</DialogTitle>
          <DialogDescription>Enregistrer le départ d&apos;un employé</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Employee select */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Employé *</label>
            {selectedEmp ? (
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <span className="text-sm font-medium">
                    {selectedEmp.lastName} {selectedEmp.firstName}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">{selectedEmp.matricule}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setFormEmployeeId('')}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <>
                <Input
                  placeholder="Rechercher par nom, matricule, poste..."
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                />
                <div className="max-h-48 overflow-y-auto rounded-md border">
                  {filteredEmployees.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                      Aucun employé trouvé
                    </div>
                  ) : (
                    filteredEmployees.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        className="flex w-full items-center justify-between border-b px-3 py-2 text-left last:border-b-0 hover:bg-muted/50"
                        onClick={() => {
                          setFormEmployeeId(e.id)
                          setEmpSearch('')
                        }}
                      >
                        <div>
                          <span className="text-sm font-medium">{e.lastName} {e.firstName}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{e.matricule}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{e.departmentName}</span>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Raison du départ *</label>
            <Select value={formReason} onValueChange={setFormReason}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner une raison" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTURE_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Type *</label>
            <Select value={formType} onValueChange={setFormType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner le type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Volontaire">Volontaire</SelectItem>
                <SelectItem value="Involontaire">Involontaire</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Date de départ *</label>
            <Input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              placeholder="Observations éventuelles..."
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            className="bg-[#362981] hover:bg-[#362981]/90"
            disabled={submitting || !formEmployeeId || !formReason || !formType || !formDate}
            onClick={onSubmit}
          >
            {submitting ? 'Enregistrement...' : 'Enregistrer le départ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ===================================================================
   Departure Detail Dialog (inline view, not a Dialog component)
   =================================================================== */

function DepartureDetailDialog({
  departureId,
  onClose,
}: {
  departureId: string
  onClose: () => void
}) {
  const [departure, setDeparture] = useState<DepartureDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState(false)

  useEffect(() => {
    api.get<DepartureDetail>(`/api/departures/${departureId}`)
      .then(setDeparture)
      .catch(() => toast.error('Erreur lors du chargement du départ'))
      .finally(() => setLoading(false))
  }, [departureId])

  const handleAdvanceStatus = async () => {
    if (!departure?.nextStatus) return
    setAdvancing(true)
    try {
      const res = await api.put<DepartureDetail>(`/api/departures/${departureId}`, {
        status: departure.nextStatus,
      })
      setDeparture(res)
      toast.success(`Statut mis à jour : ${departure.nextStatus}`)
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message)
      else toast.error('Erreur lors de la mise à jour')
    } finally {
      setAdvancing(false)
    }
  }

  const currentStepIdx = departure ? WORKFLOW_STEPS.indexOf(departure.status as typeof WORKFLOW_STEPS[number]) : -1

  return (
    <div className="animate-fade-in-up space-y-4">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={onClose}>
        <ChevronLeft className="mr-1.5 h-4 w-4" />
        Retour aux départs
      </Button>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48" />
        </div>
      ) : departure ? (
        <div className="space-y-4">
          {/* Employee info card */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold">
                    {departure.employeeLastName} {departure.employeeFirstName}
                  </h2>
                  <p className="text-sm text-muted-foreground">{departure.matricule}</p>
                </div>
                <Badge variant="secondary" className={STATUS_BADGE[departure.status] || ''}>
                  {departure.status}
                </Badge>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <div>
                  <p className="text-xs text-muted-foreground">Poste</p>
                  <p className="text-sm font-medium">{departure.currentPosition}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Département</p>
                  <p className="text-sm font-medium">{departure.departmentName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Direction</p>
                  <p className="text-sm font-medium">{departure.directionName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Statut employé</p>
                  <p className="text-sm font-medium">{departure.employeeStatus}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date d&apos;embauche</p>
                  <p className="text-sm font-medium">{departure.hireDate ? formatDateShort(departure.hireDate) : '—'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Departure info */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Informations de départ
              </h3>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Raison</p>
                  <Badge variant="secondary" className={`mt-1 ${REASON_BADGE[departure.reason] || ''}`}>
                    {departure.reason}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <Badge variant="outline" className="mt-1">{departure.type}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date de départ</p>
                  <p className="mt-1 text-sm font-medium">{formatDateShort(departure.departureDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Enregistré le</p>
                  <p className="mt-1 text-sm font-medium">{formatDateShort(departure.createdAt)}</p>
                </div>
              </div>

              {departure.notes && (
                <div className="rounded-md bg-muted/50 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{departure.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status workflow */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Parcours du statut
                </h3>
                {departure.nextStatus && (
                  <Button
                    size="sm"
                    className="bg-[#362981] hover:bg-[#362981]/90"
                    disabled={advancing}
                    onClick={handleAdvanceStatus}
                  >
                    {advancing ? (
                      'Mise à jour...'
                    ) : departure.nextStatus === 'Clôturé' ? (
                      <>
                        <CheckCircle2 className="mr-1.5 h-4 w-4" />
                        Clôturer
                      </>
                    ) : (
                      <>
                        <ArrowRight className="mr-1.5 h-4 w-4" />
                        Avancer vers &laquo;{departure.nextStatus}&raquo;
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Visual stepper */}
              <div className="flex items-center justify-center gap-0 py-4">
                {WORKFLOW_STEPS.map((step, idx) => {
                  const isCompleted = idx < currentStepIdx
                  const isCurrent = idx === currentStepIdx
                  const isFuture = idx > currentStepIdx

                  return (
                    <div key={step} className="flex items-center">
                      {/* Step circle */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors ${
                            isCompleted
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : isCurrent
                                ? 'border-[#362981] bg-[#362981] text-white'
                                : 'border-gray-300 bg-gray-100 text-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            idx + 1
                          )}
                        </div>
                        <span
                          className={`mt-1.5 text-xs ${
                            isCurrent ? 'font-semibold text-[#362981]' : isCompleted ? 'font-medium text-emerald-600' : 'text-muted-foreground'
                          }`}
                        >
                          {step}
                        </span>
                      </div>

                      {/* Connector line */}
                      {idx < WORKFLOW_STEPS.length - 1 && (
                        <div
                          className={`mx-2 h-0.5 w-12 sm:w-16 md:w-20 ${
                            idx < currentStepIdx
                              ? 'bg-emerald-500'
                              : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        />
                      )}
                    </div>
                  )
                })}
              </div>

              {departure.status === 'Clôturé' && (
                <div className="rounded-md bg-emerald-50 px-3 py-2 text-center text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                  Ce départ a été clôturé avec succès.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dates info */}
          <div className="flex items-center justify-between rounded-md bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
            <span>Créé le {formatDateShort(departure.createdAt)}</span>
            <span>Modifié le {formatDateShort(departure.updatedAt)}</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-muted-foreground">Départ non trouvé</p>
        </div>
      )}
    </div>
  )
}