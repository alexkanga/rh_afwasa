'use client'

import { useEffect, useState } from 'react'
import {
  ChevronLeft, ChevronRight, Eye, Loader2, Plus, Trash2, Play, CheckCircle2, Lock,
} from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { formatFcfa, formatDateShort } from '@/lib/format'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import PayrollPeriodDetail from './PayrollPeriodDetail'

interface PeriodRow {
  id: string
  label: string
  startDate: string
  endDate: string
  paymentDate: string
  status: string
  totalGross: number
  totalNet: number
  totalCharges: number
  lineCount: number
  notes: string | null
}

const PAGE_SIZE = 10

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: typeof Eye }> = {
  Brouillon: { label: 'Brouillon', className: 'bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300', icon: Eye },
  'En cours': { label: 'En cours', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-400', icon: Play },
  Validé: { label: 'Validé', className: 'bg-[#029CB1]/10 text-[#029CB1] hover:bg-[#029CB1]/10 dark:bg-[#029CB1]/20', icon: CheckCircle2 },
  Clôturé: { label: 'Clôturé', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400', icon: Lock },
}

const STATUS_TRANSITIONS: Record<string, { next: string; label: string; icon: typeof Play }> = {
  Brouillon: { next: 'En cours', label: 'Traiter la paie', icon: Play },
  'En cours': { next: 'Validé', label: 'Valider', icon: CheckCircle2 },
  Validé: { next: 'Clôturé', label: 'Clôturer', icon: Lock },
}

export default function PayrollPage() {
  const [periods, setPeriods] = useState<PeriodRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null)
  const [transitioning, setTransitioning] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Create form state
  const [form, setForm] = useState({ label: '', startDate: '', endDate: '', paymentDate: '', notes: '' })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const fetchPeriods = () => {
    setLoading(true)
    api.get<{ data: PeriodRow[]; total: number }>('/api/payroll/periods')
      .then((res) => { setPeriods(res.data || []); setTotal(res.total || 0) })
      .catch(() => setPeriods([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchPeriods() }, [])

  const totalPages = Math.max(1, Math.ceil(periods.length / PAGE_SIZE))
  const safePage = page >= totalPages && page > 0 ? totalPages - 1 : page
  const paged = periods.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  // ── Create dialog handlers ──
  const openCreate = () => {
    setForm({ label: '', startDate: '', endDate: '', paymentDate: '', notes: '' })
    setFormErrors({})
    setShowCreate(true)
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!form.label.trim()) errors.label = 'Libellé requis'
    if (!form.startDate) errors.startDate = 'Date de début requise'
    if (!form.endDate) errors.endDate = 'Date de fin requise'
    if (!form.paymentDate) errors.paymentDate = 'Date de paiement requise'
    if (form.startDate && form.endDate && form.startDate >= form.endDate) {
      errors.endDate = 'Doit être après la date de début'
    }
    if (form.endDate && form.paymentDate && form.paymentDate < form.endDate) {
      errors.paymentDate = 'Doit être après ou égale à la date de fin'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCreate = async () => {
    if (!validateForm()) return
    setSubmitting(true)
    try {
      await api.post('/api/payroll/periods', form)
      toast.success('Période créée avec succès')
      setShowCreate(false)
      fetchPeriods()
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message)
      else toast.error('Erreur lors de la création')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Status transition ──
  const handleTransition = async (period: PeriodRow) => {
    const transition = STATUS_TRANSITIONS[period.status]
    if (!transition) return
    setTransitioning(period.id)
    try {
      await api.put(`/api/payroll/periods/${period.id}`, { status: transition.next })
      toast.success(`Période passée en statut "${transition.next}"`)
      fetchPeriods()
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message)
      else toast.error('Erreur lors de la transition')
    } finally {
      setTransitioning(null)
    }
  }

  // ── Delete ──
  const handleDelete = async (period: PeriodRow) => {
    if (!confirm(`Supprimer la période "${period.label}" ?`)) return
    setDeleting(period.id)
    try {
      await api.delete(`/api/payroll/periods/${period.id}`)
      toast.success('Période supprimée')
      fetchPeriods()
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message)
      else toast.error('Erreur lors de la suppression')
    } finally {
      setDeleting(null)
    }
  }

  // ── Detail view ──
  if (selectedPeriodId) {
    return (
      <PayrollPeriodDetail
        periodId={selectedPeriodId}
        onBack={() => { setSelectedPeriodId(null); fetchPeriods() }}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <section className="animate-fade-in-up flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestion de la paie</h1>
          <p className="text-sm text-muted-foreground">Périodes et traitement de la paie</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Nouvelle période
        </Button>
      </section>

      {/* Table */}
      <div className="animate-fade-in-up rounded-lg border">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : paged.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#362981]/10">
              <Eye className="h-8 w-8 text-[#362981]/50" />
            </div>
            <p className="mt-3 text-sm font-medium text-muted-foreground">Aucune période de paie</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Créez votre première période pour commencer le traitement de la paie
            </p>
          </div>
        ) : (
          <div className="max-h-[calc(100vh-18rem)] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Libellé</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Période</TableHead>
                  <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">Paiement</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Statut</TableHead>
                  <TableHead className="hidden text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">Lignes</TableHead>
                  <TableHead className="hidden text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">Masse brute</TableHead>
                  <TableHead className="hidden text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">Net à payer</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((p) => {
                  const statusCfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.Brouillon
                  const transition = STATUS_TRANSITIONS[p.status]
                  const TransitionIcon = transition?.icon || Play

                  return (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm font-medium">{p.label}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateShort(p.startDate)} — {formatDateShort(p.endDate)}
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                        {formatDateShort(p.paymentDate)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusCfg.className}>
                          {statusCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden text-center text-sm tabular-nums sm:table-cell">
                        {p.lineCount}
                      </TableCell>
                      <TableCell className="hidden text-right text-sm tabular-nums lg:table-cell">
                        {formatFcfa(p.totalGross)}
                      </TableCell>
                      <TableCell className="hidden text-right text-sm tabular-nums lg:table-cell">
                        {formatFcfa(p.totalNet)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setSelectedPeriodId(p.id)}
                            title="Voir le détail"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {transition && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              disabled={transitioning === p.id}
                              onClick={() => handleTransition(p)}
                            >
                              {transitioning === p.id ? (
                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <TransitionIcon className="mr-1 h-3.5 w-3.5" />
                              )}
                              <span className="hidden sm:inline">{transition.label}</span>
                            </Button>
                          )}
                          {p.status === 'Brouillon' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                              disabled={deleting === p.id}
                              onClick={() => handleDelete(p)}
                              title="Supprimer"
                            >
                              {deleting === p.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="animate-fade-in-up flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {safePage + 1} sur {totalPages} — {total} période{total !== 1 ? 's' : ''}
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

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle période de paie</DialogTitle>
            <DialogDescription>Créer une nouvelle période de traitement de la paie.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="pp-label">Libellé</Label>
              <Input
                id="pp-label"
                placeholder="Ex: Janvier 2025"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
              {formErrors.label && <p className="text-xs text-red-500">{formErrors.label}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pp-start">Date de début</Label>
                <Input
                  id="pp-start"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
                {formErrors.startDate && <p className="text-xs text-red-500">{formErrors.startDate}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pp-end">Date de fin</Label>
                <Input
                  id="pp-end"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
                {formErrors.endDate && <p className="text-xs text-red-500">{formErrors.endDate}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pp-payment">Date de paiement</Label>
              <Input
                id="pp-payment"
                type="date"
                value={form.paymentDate}
                onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
              />
              {formErrors.paymentDate && <p className="text-xs text-red-500">{formErrors.paymentDate}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pp-notes">Notes (optionnel)</Label>
              <Textarea
                id="pp-notes"
                placeholder="Notes ou commentaires..."
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Créer la période
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}