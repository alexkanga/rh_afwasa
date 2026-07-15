'use client'

import { useEffect, useState } from 'react'
import {
  ArrowLeft, Download, CheckCircle2, Loader2, FileText, Calendar, MapPin,
} from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { formatFcfa, formatDateShort } from '@/lib/format'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

interface PayslipData {
  id: string
  matricule: string | null
  employeeName: string
  directionName: string
  employee: {
    matricule: string | null
    lastName: string
    firstName: string
    currentPosition: string | null
    cnpsNumber: string | null
    hireDate: string | null
  }
  period: {
    id: string
    label: string
    startDate: string
    endDate: string
    paymentDate: string
    status: string
  }
  salaryProfile: {
    igrParts: number
    atRate: number | null
    cmuEmployeeCount: number
  } | null
  seniorityYears: number
  seniorityRate: number
  seniorityBonus: number
  baseSalary: number
  sursalary: number
  transportExempt: number
  transportTaxable: number
  taxablePrimes: number
  taxableBenefits: number
  nonTaxableGains: number
  grossTaxable: number
  cnpsBase: number
  cnpsEmployee: number
  cmuEmployee: number
  ricf: number
  its: number
  otherDeductions: number
  totalDeductions: number
  cnpsEmployer: number
  familyAllowances: number
  workAccident: number
  maternityInsurance: number
  cmuEmployer: number
  isLocalEmployer: number
  apprenticeshipTax: number
  fpcMonthly: number
  fpcEndOfYear: number
  totalEmployerCharges: number
  totalGross: number
  netPayable: number
  totalEmployerCost: number
  status: string
  controlStatus: string | null
  reprocessCount: number
}

interface Props {
  lineId: string
  onBack: () => void
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    'Calculé': 'bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-400',
    'Validé': 'bg-[#029CB1]/10 text-[#029CB1] hover:bg-[#029CB1]/10',
    'Modifié': 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-400',
  }
  return (
    <Badge variant="secondary" className={config[status] || config['Calculé']}>
      {status}
    </Badge>
  )
}

function ControlBadge({ status }: { status: string | null }) {
  if (!status || status === 'En attente') {
    return (
      <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400">
        En attente
      </Badge>
    )
  }
  if (status === 'OK') {
    return (
      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400">
        OK
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-400">
      {status}
    </Badge>
  )
}

export default function PayslipDetail({ lineId, onBack }: Props) {
  const [data, setData] = useState<PayslipData | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [validating, setValidating] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get<PayslipData>(`/api/payroll/lines/${lineId}`)
      .then(setData)
      .catch(() => toast.error('Erreur lors du chargement du bulletin'))
      .finally(() => setLoading(false))
  }, [lineId])

  const handleDownloadPdf = async () => {
    setDownloading(true)
    try {
      const res = await fetch(`/api/payroll/payslip-pdf?lineId=${lineId}`)
      if (!res.ok) throw new Error('Erreur serveur')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const matricule = data?.matricule || 'XXX'
      const period = data?.period.label || 'bulletin'
      a.href = url
      a.download = `bulletin_${matricule}_${period}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Bulletin téléchargé')
    } catch {
      toast.error('Erreur lors du téléchargement')
    } finally {
      setDownloading(false)
    }
  }

  const handleValidate = async () => {
    setValidating(true)
    try {
      await api.put(`/api/payroll/lines/${lineId}`, { status: 'Validé' })
      toast.success('Bulletin validé')
      // Refresh data
      api.get<PayslipData>(`/api/payroll/lines/${lineId}`)
        .then(setData)
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message)
      else toast.error('Erreur lors de la validation')
    } finally {
      setValidating(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground">Bulletin non trouvé</p>
        <Button variant="outline" className="mt-4" onClick={onBack}>Retour</Button>
      </div>
    )
  }

  const igrParts = data.salaryProfile?.igrParts ?? 1
  const atRate = data.salaryProfile?.atRate ?? 0.02

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Button variant="ghost" size="sm" className="-ml-2" onClick={onBack}>
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Retour
      </Button>

      {/* Employee & Period Header */}
      <Card className="border-[#362981]/20">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#362981]/10 text-lg font-bold text-[#362981]">
                  {data.employee.firstName.charAt(0)}{data.employee.lastName.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-bold">{data.employeeName}</h2>
                  <p className="text-sm text-muted-foreground">
                    {data.employee.currentPosition || '—'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Matricule: <strong className="text-foreground">{data.employee.matricule || '—'}</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {data.directionName}
                </span>
                {data.employee.cnpsNumber && (
                  <span className="flex items-center gap-1.5">
                    CNPS: <strong className="text-foreground">{data.employee.cnpsNumber}</strong>
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 sm:items-end">
              <div className="flex items-center gap-2">
                <ControlBadge status={data.controlStatus} />
                <StatusBadge status={data.status} />
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {data.period.label} — {formatDateShort(data.period.startDate)} au {formatDateShort(data.period.endDate)}
              </div>
              {data.reprocessCount > 0 && (
                <p className="text-xs text-muted-foreground/70">
                  Recalculé {data.reprocessCount} fois
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two-column: Salary Elements + Deductions */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left: Éléments du salaire */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-[#362981]">
              Éléments du salaire
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold">Élément</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Montant (FCFA)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <Row label="Salaire de base" value={data.baseSalary} />
                <Row label="Sursalaire" value={data.sursalary} />
                <Row
                  label={`Ancienneté (${data.seniorityYears} ans — ${(data.seniorityRate * 100).toFixed(0)}%)`}
                  value={data.seniorityBonus}
                />
                <Row label="Ind. transport (exonéré)" value={data.transportExempt} />
                <Row label="Ind. transport (imposable)" value={data.transportTaxable} />
                <Row label="Primes imposables" value={data.taxablePrimes} />
                <Row label="Avantages imposables" value={data.taxableBenefits} />
                <Row label="Indemnités non imposables" value={data.nonTaxableGains - data.transportExempt} />
                <Separator />
                <TotalRow label="Brut imposable" value={data.grossTaxable} />
                <TotalRow label="Brut total" value={data.totalGross} />
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Right: Cotisations & Déductions salarié */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-[#009446]">
              Cotisations &amp; Déductions salarié
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold">Cotisation</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Montant (FCFA)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <Row label="CNPS (6,3%)" value={data.cnpsEmployee} />
                <Row label={`CMU (${data.salaryProfile?.cmuEmployeeCount ?? 1} pers.)`} value={data.cmuEmployee} />
                <Row label={`RICF (${igrParts} part${igrParts > 1 ? 's' : ''})`} value={data.ricf} />
                <Row label="ITS" value={data.its} />
                <Row label="Autres déductions" value={data.otherDeductions} />
                <Separator />
                <TotalRow label="Total déductions" value={data.totalDeductions} />
                <Separator />
                <NetRow label="NET À PAYER" value={data.netPayable} />
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Employer Charges */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-[#029CB1]">
            Charges patronales
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid gap-4 lg:grid-cols-2">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold">Charge</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Montant (FCFA)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <Row label="CNPS employeur (7,7%)" value={data.cnpsEmployer} />
                <Row label="Prestations familiales" value={data.familyAllowances} />
                <Row label={`Accident du travail (${(atRate * 100).toFixed(1)}%)`} value={data.workAccident} />
                <Row label="Assurance maternité" value={data.maternityInsurance} />
                <Row label="CMU employeur" value={data.cmuEmployer} />
              </TableBody>
            </Table>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold">Charge</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Montant (FCFA)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <Row label="IS employeur local" value={data.isLocalEmployer} />
                <Row label="Taxe apprentissage" value={data.apprenticeshipTax} />
                <Row label="FPC mensuelle" value={data.fpcMonthly} />
                <Row label="FPC fin d'année" value={data.fpcEndOfYear} />
                <Separator />
                <TotalRow label="Total charges patronales" value={data.totalEmployerCharges} />
                <Separator />
                <NetRow label="Coût total employeur" value={data.totalEmployerCost} />
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          disabled={downloading}
          onClick={handleDownloadPdf}
          className="bg-[#362981] hover:bg-[#362981]/90"
        >
          {downloading ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-1.5 h-4 w-4" />
          )}
          Télécharger PDF
        </Button>
        {data.status === 'Calculé' && (
          <Button
            size="sm"
            variant="outline"
            disabled={validating}
            onClick={handleValidate}
            className="border-[#009446] text-[#009446] hover:bg-[#009446]/10"
          >
            {validating ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
            )}
            Valider
          </Button>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <TableRow>
      <TableCell className="text-sm py-2">{label}</TableCell>
      <TableCell className="text-right text-sm tabular-nums py-2">
        {formatFcfa(value)}
      </TableCell>
    </TableRow>
  )
}

function TotalRow({ label, value }: { label: string; value: number }) {
  return (
    <TableRow>
      <TableCell className="text-sm font-semibold py-2">{label}</TableCell>
      <TableCell className="text-right text-sm font-semibold tabular-nums py-2">
        {formatFcfa(value)}
      </TableCell>
    </TableRow>
  )
}

function NetRow({ label, value }: { label: string; value: number }) {
  return (
    <TableRow className="bg-muted/50">
      <TableCell className="text-sm font-bold py-2.5 text-[#362981]">{label}</TableCell>
      <TableCell className="text-right text-sm font-bold tabular-nums py-2.5 text-[#362981]">
        {formatFcfa(value)}
      </TableCell>
    </TableRow>
  )
}