'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, User } from 'lucide-react'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

interface EmployeeDetail {
  id: string
  matricule: string
  lastName: string
  firstName: string
  sex: string | null
  dateOfBirth: string | null
  nationality: string
  maritalStatus: string | null
  numberOfChildren: number
  personalPhone: string | null
  email: string | null
  currentPosition: string | null
  workLocation: string | null
  status: string
  hireDate: string | null
  cnpsNumber: string | null
  direction: { id: string; name: string } | null
  department: { id: string; name: string; directionId: string } | null
}

interface Props {
  employeeId: string
  onBack: () => void
}

export default function EmployeeDetailPage({ employeeId, onBack }: Props) {
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api
      .get<EmployeeDetail>(`/api/employees/${employeeId}`)
      .then((data) => { if (!cancelled) setEmployee(data) })
      .catch(() => { if (!cancelled) setEmployee(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [employeeId])

  if (loading) {
    return (
      <div className="animate-fade-in-up space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-[300px] w-full rounded-lg" />
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="animate-fade-in-up flex flex-col items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Employé non trouvé</p>
        <Button variant="outline" className="mt-4" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour
        </Button>
      </div>
    )
  }

  const initials = `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase()
  const fullName = `${employee.lastName} ${employee.firstName}`
  const statusColor = employee.status === 'Actif'
    ? 'bg-emerald-100 text-emerald-700 border-0'
    : 'bg-muted text-muted-foreground'

  const fields = [
    { label: 'Matricule', value: employee.matricule },
    { label: 'Poste', value: employee.currentPosition || '—' },
    { label: 'Direction', value: employee.direction?.name || '—' },
    { label: 'Département', value: employee.department?.name || '—' },
    { label: 'Lieu d\'affectation', value: employee.workLocation || '—' },
    { label: 'Date d\'entrée', value: formatDate(employee.hireDate) },
    { label: 'Statut', value: employee.status },
    { label: 'Matricule CNPS', value: employee.cnpsNumber || '—' },
    { label: 'Sexe', value: employee.sex === 'M' ? 'Masculin' : employee.sex === 'F' ? 'Féminin' : '—' },
    { label: 'Date de naissance', value: formatDate(employee.dateOfBirth) },
    { label: 'Nationalité', value: employee.nationality || '—' },
    { label: 'Situation matrimoniale', value: employee.maritalStatus || '—' },
    { label: 'Nombre d\'enfants', value: String(employee.numberOfChildren) },
    { label: 'Téléphone', value: employee.personalPhone || '—' },
    { label: 'Email', value: employee.email || '—' },
  ]

  return (
    <div className="animate-fade-in-up space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour à la liste
      </Button>

      {/* Header card */}
      <Card>
        <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-[#362981]/20 bg-[#362981] text-lg font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <h2 className="text-xl font-bold">{fullName}</h2>
              <Badge className={statusColor}>{employee.status}</Badge>
            </div>
            <p className="font-mono text-xs text-muted-foreground">{employee.matricule}</p>
            {employee.currentPosition && (
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <User className="h-3.5 w-3.5" /> {employee.currentPosition}
                {employee.direction && <> · {employee.direction.name}</>}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info grid */}
      <Card>
        <CardContent className="p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map((f) => (
              <div key={f.label} className="space-y-0.5">
                <p className="text-xs text-muted-foreground">{f.label}</p>
                <p className="text-sm font-medium">{f.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}