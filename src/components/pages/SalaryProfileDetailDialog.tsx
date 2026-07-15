'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { formatFcfa, formatDate } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import SalaryProfileFormDialog from './SalaryProfileFormDialog'
import { toast } from 'sonner'

interface VersionRow {
  id: string
  version: number
  effectiveFrom: string
  effectiveTo: string | null
  baseSalary: number
  sursalary: number
  status: string
}

interface ProfileDetail {
  id: string
  employeeId: string
  baseSalary: number
  sursalary: number
  igrParts: number
  cmuEmployeeCount: number
  cmuEmployerCount: number
  transportAllowance: number
  taxablePrimes: number
  taxableBenefits: number
  nonTaxableAllowances: number
  atRate: number | null
  specificCnpsBase: number | null
  effectiveFrom: string
  effectiveTo: string | null
  status: string
  version: number
  comment: string | null
  createdAt: string
  employee: {
    id: string
    matricule: string
    lastName: string
    firstName: string
    currentPosition: string | null
    direction: { id: string; name: string } | null
    department: { id: string; name: string } | null
  }
  payrollLines: { id: string }[]
  versionHistory: VersionRow[]
}

interface Props {
  profileId: string
  onClose: () => void
  onEdit: () => void
}

export default function SalaryProfileDetailDialog({ profileId, onClose, onEdit }: Props) {
  const [profile, setProfile] = useState<ProfileDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editData, setEditData] = useState<ProfileDetail | null>(null)

  useEffect(() => {
    api.get<ProfileDetail>(`/api/salary-profiles/${profileId}`)
      .then(setProfile)
      .catch(() => toast.error('Erreur de chargement du profil'))
      .finally(() => setLoading(false))
  }, [profileId])

  const handleDelete = async () => {
    if (!profile) return
    try {
      await api.delete(`/api/salary-profiles/${profile.id}`)
      toast.success('Profil supprimé')
      onClose()
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  if (editData) {
    return (
      <SalaryProfileFormDialog
        editData={{
          id: editData.id,
          employeeId: editData.employeeId,
          employee: {
            matricule: editData.employee.matricule,
            lastName: editData.employee.lastName,
            firstName: editData.employee.firstName,
          },
          baseSalary: editData.baseSalary,
          sursalary: editData.sursalary,
          igrParts: editData.igrParts,
          cmuEmployeeCount: editData.cmuEmployeeCount,
          cmuEmployerCount: editData.cmuEmployerCount,
          transportAllowance: editData.transportAllowance,
          taxablePrimes: editData.taxablePrimes,
          taxableBenefits: editData.taxableBenefits,
          nonTaxableAllowances: editData.nonTaxableAllowances,
          atRate: editData.atRate,
          specificCnpsBase: editData.specificCnpsBase,
          comment: editData.comment,
        }}
        onClose={() => { setEditData(null); onEdit() }}
      />
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">Profil non trouvé</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={onClose}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Retour
        </Button>
      </div>
    )
  }

  const emp = profile.employee
  const hasLinkedPayroll = profile.payrollLines.length > 0

  return (
    <div className="space-y-6">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Retour
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditData(profile)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Modifier
          </Button>
          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-600" onClick={handleDelete}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Supprimer
          </Button>
        </div>
      </div>

      {/* Employee info */}
      <div className="animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold">
              {emp.lastName} {emp.firstName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {emp.matricule} · {emp.currentPosition || 'Sans poste'} · {emp.direction?.name || '—'}
            </p>
          </div>
          <Badge
            variant={profile.status === 'Actif' ? 'default' : 'secondary'}
            className={
              profile.status === 'Actif'
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400'
                : profile.status === 'Inactif'
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-400'
                  : ''
            }
          >
            V{profile.version} · {profile.status}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Effet du {formatDate(profile.effectiveFrom)}
          {profile.effectiveTo ? ` au ${formatDate(profile.effectiveTo)}` : ''}
        </p>
        {hasLinkedPayroll && (
          <p className="mt-1 text-xs text-amber-600">
            ⚠ {profile.payrollLines.length} ligne(s) de paie liée(s) — la modification du salaire archivera les bulletins.
          </p>
        )}
      </div>

      <Separator />

      {/* Detail grid */}
      <div className="animate-fade-in-up grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'Salaire de base', value: formatFcfa(profile.baseSalary) },
          { label: 'Sursalaire', value: formatFcfa(profile.sursalary) },
          { label: 'Parts IGR', value: String(profile.igrParts) },
          { label: 'CMU salarié', value: String(profile.cmuEmployeeCount) },
          { label: 'CMU employeur', value: String(profile.cmuEmployerCount) },
          { label: 'Indemnité transport', value: formatFcfa(profile.transportAllowance) },
          { label: 'Primes imposables', value: formatFcfa(profile.taxablePrimes) },
          { label: 'Avantages imposables', value: formatFcfa(profile.taxableBenefits) },
          { label: 'Indem. non imposables', value: formatFcfa(profile.nonTaxableAllowances) },
          { label: 'Taux AT', value: profile.atRate != null ? `${(profile.atRate * 100).toFixed(2)}%` : '—' },
          { label: 'Base CNPS spécifique', value: profile.specificCnpsBase ? formatFcfa(profile.specificCnpsBase) : '—' },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums">{item.value}</p>
          </div>
        ))}
      </div>

      {profile.comment && (
        <div className="animate-fade-in-up rounded-lg border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Commentaire</p>
          <p className="mt-0.5 text-sm">{profile.comment}</p>
        </div>
      )}

      {/* Version history */}
      {profile.versionHistory.length > 1 && (
        <>
          <Separator />
          <div className="animate-fade-in-up">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Historique des versions ({profile.versionHistory.length})
            </h2>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs">Version</TableHead>
                    <TableHead className="text-xs">Date d&apos;effet</TableHead>
                    <TableHead className="hidden text-right text-xs sm:table-cell">Salaire base</TableHead>
                    <TableHead className="hidden text-right text-xs sm:table-cell">Sursalaire</TableHead>
                    <TableHead className="text-center text-xs">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profile.versionHistory.map((v) => (
                    <TableRow key={v.id} className={v.id === profile.id ? 'bg-muted/50' : ''}>
                      <TableCell className="text-xs font-medium">V{v.version}</TableCell>
                      <TableCell className="text-xs">{formatDate(v.effectiveFrom)}</TableCell>
                      <TableCell className="hidden text-right text-xs tabular-nums sm:table-cell">{formatFcfa(v.baseSalary)}</TableCell>
                      <TableCell className="hidden text-right text-xs tabular-nums sm:table-cell">{formatFcfa(v.sursalary)}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={v.status === 'Actif' ? 'default' : 'secondary'}
                          className={
                            v.status === 'Actif'
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400'
                              : ''
                          }
                        >
                          {v.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}