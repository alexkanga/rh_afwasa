'use client'

import { useEffect, useState } from 'react'
import {
  ArrowLeft, Loader2, Play, CheckCircle2, Lock, FileText, Users, Wallet, TrendingUp,
} from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { formatFcfa, formatDateShort } from '@/lib/format'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import PayslipDetail from '@/components/pages/PayslipDetail'

interface PayrollLineRow {
  id: string
  employeeId: string
  matricule: string | null
  employeeName: string
  totalGross: number
  netPayable: number
  totalEmployerCharges: number
  controlStatus: string | null
  status: string
}

interface PeriodDetail {
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
  payrollLines: PayrollLineRow[]
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  Brouillon: { label: 'Brouillon', className: 'bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300' },
  'En cours': { label: 'En cours', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-400' },
  Validé: { label: 'Validé', className: 'bg-[#029CB1]/10 text-[#029CB1] hover:bg-[#029CB1]/10 dark:bg-[#029CB1]/20' },
  Clôturé: { label: 'Clôturé', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400' },
}

const TRANSITIONS: Record<string, { next: string; label: string; icon: typeof Play }> = {
  Brouillon: { next: 'En cours', label: 'Traiter la paie', icon: Play },
  'En cours': { next: 'Validé', label: 'Valider', icon: CheckCircle2 },
  Validé: { next: 'Clôturé', label: 'Clôturer', icon: Lock },
}

interface Props {
  periodId: string
  onBack: () => void
}

export default function PayrollPeriodDetail({ periodId, onBack }: Props) {
  const [period, setPeriod] = useState<PeriodDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [transitioning, setTransitioning] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null)

  const fetchPeriod = () => {
    setLoading(true)
    api.get<PeriodDetail>(`/api/payroll/periods/${periodId}`)
      .then((data) => setPeriod(data))
      .catch(() => toast.error('Erreur lors du chargement de la période'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchPeriod() }, [periodId])

  const handleTransition = async () => {
    if (!period) return
    const transition = TRANSITIONS[period.status]
    if (!transition) return
    setTransitioning(true)
    try {
      await api.put(`/api/payroll/periods/${periodId}`, { status: transition.next })
      toast.success(`Période passée en statut "${transition.next}"`)
      fetchPeriod()
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message)
      else toast.error('Erreur lors de la transition')
    } finally {
      setTransitioning(false)
    }
  }

  const handleProcess = async () => {
    if (!period) return
    setProcessing(true)
    try {
      await api.post('/api/payroll/process', { periodId })
      toast.success('Traitement de la paie lancé')
      fetchPeriod()
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message)
      else toast.error('Erreur lors du traitement')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!period) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground">Période non trouvée</p>
        <Button variant="outline" className="mt-4" onClick={onBack}>Retour</Button>
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[period.status] || STATUS_CONFIG.Brouillon
  const transition = TRANSITIONS[period.status]

  // Show PayslipDetail when a line is selected
  if (selectedLineId) {
    return <PayslipDetail lineId={selectedLineId} onBack={() => setSelectedLineId(null)} />
  }

  return (
    <div className="space-y-4">
      {/* Back + Header */}
      <section className="animate-fade-in-up">
        <Button variant="ghost" size="sm" className="mb-3 -ml-2" onClick={onBack}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Retour aux périodes
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{period.label}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {formatDateShort(period.startDate)} — {formatDateShort(period.endDate)}
                {' · '}Paiement: {formatDateShort(period.paymentDate)}
              </p>
            </div>
            <Badge variant="secondary" className={statusCfg.className}>
              {statusCfg.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {transition && (
              <Button
                size="sm"
                disabled={transitioning}
                onClick={handleTransition}
              >
                {transitioning ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <transition.icon className="mr-1.5 h-4 w-4" />
                )}
                {transition.label}
              </Button>
            )}
            {(period.status === 'Brouillon' || period.status === 'En cours') && period.lineCount === 0 && (
              <Button
                variant="outline"
                size="sm"
                disabled={processing}
                onClick={handleProcess}
              >
                {processing ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-1.5 h-4 w-4" />
                )}
                Traiter la paie
              </Button>
            )}
          </div>
        </div>
        {period.notes && (
          <p className="mt-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            {period.notes}
          </p>
        )}
      </section>

      {/* Summary Cards */}
      <section className="animate-fade-in-up grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Brut</CardTitle>
            <TrendingUp className="h-4 w-4 text-[#362981]" />
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold tabular-nums">{formatFcfa(period.totalGross)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Net à payer</CardTitle>
            <Wallet className="h-4 w-4 text-[#009446]" />
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold tabular-nums">{formatFcfa(period.totalNet)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Charges patronales</CardTitle>
            <FileText className="h-4 w-4 text-[#029CB1]" />
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold tabular-nums">{formatFcfa(period.totalCharges)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Nombre de lignes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold tabular-nums">{period.lineCount}</p>
          </CardContent>
        </Card>
      </section>

      {/* Payroll Lines Table */}
      <section className="animate-fade-in-up rounded-lg border">
        {period.payrollLines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#362981]/10">
              <FileText className="h-8 w-8 text-[#362981]/50" />
            </div>
            <p className="mt-3 text-sm font-medium text-muted-foreground">Aucune ligne de paie</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Lancez le traitement de la paie pour générer les bulletins
            </p>
            {(period.status === 'Brouillon' || period.status === 'En cours') && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                disabled={processing}
                onClick={handleProcess}
              >
                {processing ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-1.5 h-4 w-4" />
                )}
                Traiter la paie
              </Button>
            )}
          </div>
        ) : (
          <div className="max-h-[calc(100vh-28rem)] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Matricule</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nom</TableHead>
                  <TableHead className="hidden text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">Brut imposable</TableHead>
                  <TableHead className="hidden text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">Net à payer</TableHead>
                  <TableHead className="hidden text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">Charges patr.</TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contrôle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {period.payrollLines.map((line) => (
                  <TableRow key={line.id} className="cursor-pointer" onClick={() => setSelectedLineId(line.id)}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {line.matricule || '—'}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{line.employeeName}</TableCell>
                    <TableCell className="hidden text-right text-sm tabular-nums sm:table-cell">
                      {formatFcfa(line.totalGross)}
                    </TableCell>
                    <TableCell className="hidden text-right text-sm tabular-nums md:table-cell">
                      {formatFcfa(line.netPayable)}
                    </TableCell>
                    <TableCell className="hidden text-right text-sm tabular-nums lg:table-cell">
                      {formatFcfa(line.totalEmployerCharges)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="secondary"
                        className={
                          !line.controlStatus || line.controlStatus === 'En attente'
                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400'
                            : line.controlStatus === 'Contrôlé'
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400'
                              : 'bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-400'
                        }
                      >
                        {line.controlStatus || 'En attente'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  )
}