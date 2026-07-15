'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, FileText, Plus, Search, Trash2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { formatDateShort } from '@/lib/format'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import { Textarea } from '@/components/ui/textarea'

interface ContractRow {
  id: string
  employeeId: string
  matricule: string
  employeeName: string
  directionName: string
  type: string
  startDate: string
  endDate: string | null
  status: string
  notes: string | null
}

interface ContractDetail extends ContractRow {
  position: string
  departmentName: string
  createdAt: string
  updatedAt: string
}

interface EmployeeOption {
  id: string
  matricule: string
  firstName: string
  lastName: string
  label: string
}

const TYPE_BADGE: Record<string, string> = {
  CDI: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400',
  CDD: 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-400',
}

const STATUS_BADGE: Record<string, string> = {
  Actif: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400',
  Expiré: 'bg-gray-100 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400',
}

const PAGE_SIZE = 10

export default function ContractsPage() {
  const [contracts, setContracts] = useState<ContractRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  // Create form state
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [formEmployeeId, setFormEmployeeId] = useState('')
  const [formType, setFormType] = useState('CDI')
  const [formStartDate, setFormStartDate] = useState('')
  const [formEndDate, setFormEndDate] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchContracts = () => {
    setLoading(true)
    const params: Record<string, string> = {
      limit: String(PAGE_SIZE),
      page: String(page),
    }
    if (search.trim()) params.search = search.trim()
    if (typeFilter) params.type = typeFilter

    api.get<{ data: ContractRow[]; total: number }>('/api/contracts', params)
      .then((res) => { setContracts(res.data || []); setTotal(res.total || 0) })
      .catch(() => setContracts([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const t = setTimeout(fetchContracts, 300)
    return () => clearTimeout(t)
  }, [search, typeFilter, page])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const openCreate = async () => {
    try {
      const res = await api.get<{ data: Array<{ id: string; matricule: string; firstName: string; lastName: string }> }>(
        '/api/employees',
        { limit: '200', status: 'Actif' }
      )
      const opts = (res.data || []).map((e) => ({
        id: e.id,
        matricule: e.matricule,
        firstName: e.firstName,
        lastName: e.lastName,
        label: `${e.matricule} — ${e.firstName} ${e.lastName}`,
      }))
      setEmployees(opts)
      setFormEmployeeId('')
      setFormType('CDI')
      setFormStartDate('')
      setFormEndDate('')
      setFormNotes('')
      setShowCreate(true)
    } catch {
      toast.error('Erreur lors du chargement des employés')
    }
  }

  const handleCreate = async () => {
    if (!formEmployeeId || !formType || !formStartDate) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/api/contracts', {
        employeeId: formEmployeeId,
        type: formType,
        startDate: formStartDate,
        endDate: formEndDate || null,
        notes: formNotes || null,
      })
      toast.success('Contrat créé avec succès')
      setShowCreate(false)
      fetchContracts()
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message)
      else toast.error('Erreur lors de la création')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      await api.delete(`/api/contracts/${id}`)
      toast.success('Contrat expiré avec succès')
      fetchContracts()
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message)
      else toast.error('Erreur lors de la suppression')
    } finally {
      setDeleting(null)
    }
  }

  // Detail view
  if (detailId) {
    return <ContractDetailDialog contractId={detailId} onClose={() => { setDetailId(null); fetchContracts() }} />
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <section className="animate-fade-in-up flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contrats</h1>
          <p className="text-sm text-muted-foreground">
            {total} contrat{total !== 1 ? 's' : ''} enregistré{total !== 1 ? 's' : ''}
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
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v === '__all__' ? '' : v); setPage(0) }}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous</SelectItem>
              <SelectItem value="CDI">CDI</SelectItem>
              <SelectItem value="CDD">CDD</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={openCreate} size="sm">
            <Plus className="mr-1.5 h-4 w-4" /> Nouveau
          </Button>
        </div>
      </section>

      {/* Table */}
      <div className="animate-fade-in-up rounded-lg border">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : contracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="mb-2 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Aucun contrat trouvé</p>
          </div>
        ) : (
          <div className="max-h-[calc(100vh-20rem)] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Matricule</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nom</TableHead>
                  <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">Type</TableHead>
                  <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">Date début</TableHead>
                  <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">Date fin</TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Statut</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => setDetailId(c.id)}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{c.matricule}</TableCell>
                    <TableCell className="text-sm font-medium">{c.employeeName}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="secondary" className={TYPE_BADGE[c.type] || ''}>{c.type}</Badge>
                    </TableCell>
                    <TableCell className="hidden text-sm tabular-nums sm:table-cell">{formatDateShort(c.startDate)}</TableCell>
                    <TableCell className="hidden text-sm tabular-nums lg:table-cell">{c.endDate ? formatDateShort(c.endDate) : '—'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className={STATUS_BADGE[c.status] || ''}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); setDetailId(c.id) }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {c.status === 'Actif' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                            disabled={deleting === c.id}
                            onClick={(e) => { e.stopPropagation(); handleDelete(c.id) }}
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
            Page {page + 1} sur {totalPages} — {total} résultat{total !== 1 ? 's' : ''}
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

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) setShowCreate(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau contrat</DialogTitle>
            <DialogDescription>Créer un contrat pour un employé existant</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Employé *</label>
              <Select value={formEmployeeId} onValueChange={setFormEmployeeId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner un employé" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Type de contrat *</label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CDI">CDI — Contrat à durée indéterminée</SelectItem>
                  <SelectItem value="CDD">CDD — Contrat à durée déterminée</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Date de début *</label>
                <Input
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Date de fin</label>
                <Input
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  disabled={formType === 'CDI'}
                />
              </div>
            </div>
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
            <Button variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button disabled={submitting || !formEmployeeId || !formType || !formStartDate} onClick={handleCreate}>
              {submitting ? 'Création...' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ---------- Detail Dialog ---------- */

function ContractDetailDialog({ contractId, onClose }: { contractId: string; onClose: () => void }) {
  const [contract, setContract] = useState<ContractDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<ContractDetail>(`/api/contracts/${contractId}`)
      .then(setContract)
      .catch(() => toast.error('Erreur lors du chargement du contrat'))
      .finally(() => setLoading(false))
  }, [contractId])

  return (
    <div className="animate-fade-in-up space-y-4">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={onClose}>
        <ChevronLeft className="mr-1.5 h-4 w-4" /> Retour aux contrats
      </Button>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40" />
        </div>
      ) : contract ? (
        <div className="rounded-lg border p-4 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">{contract.employeeName}</h2>
              <p className="text-sm text-muted-foreground">{contract.matricule} — {contract.directionName}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={TYPE_BADGE[contract.type] || ''}>{contract.type}</Badge>
              <Badge variant="secondary" className={STATUS_BADGE[contract.status] || ''}>{contract.status}</Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Poste</p>
              <p className="text-sm font-medium">{contract.position || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Département</p>
              <p className="text-sm font-medium">{contract.departmentName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date de début</p>
              <p className="text-sm font-medium">{formatDateShort(contract.startDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date de fin</p>
              <p className="text-sm font-medium">{contract.endDate ? formatDateShort(contract.endDate) : 'Sans terme (CDI)'}</p>
            </div>
          </div>
          {contract.notes && (
            <div className="rounded-md bg-muted/50 px-3 py-2">
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="mt-1 text-sm">{contract.notes}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-muted-foreground">Contrat non trouvé</p>
        </div>
      )}
    </div>
  )
}