'use client'

import { useEffect, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { api } from '@/lib/api'
import { IGR_PARTS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'

interface EmployeeOption {
  id: string
  matricule: string
  lastName: string
  firstName: string
  label: string
}

interface FormProps {
  onClose: () => void
  editData?: {
    id: string
    employeeId: string
    employee: { matricule: string; lastName: string; firstName: string }
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
    comment: string | null
  }
}

const emptyForm = {
  employeeId: '',
  baseSalary: 0,
  sursalary: 0,
  igrParts: '1',
  cmuEmployeeCount: 1,
  cmuEmployerCount: 1,
  transportAllowance: 0,
  taxablePrimes: 0,
  taxableBenefits: 0,
  nonTaxableAllowances: 0,
  atRate: '',
  specificCnpsBase: '',
  effectiveFrom: '',
  comment: '',
}

export default function SalaryProfileFormDialog({ onClose, editData }: FormProps) {
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [empSearch, setEmpSearch] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [empOpen, setEmpOpen] = useState(false)

  const isEdit = !!editData

  // Load employees for dropdown
  useEffect(() => {
    api.get<{ data: { id: string; matricule: string; lastName: string; firstName: string }[] }>(
      '/api/employees', { limit: '200', offset: '0' }
    ).then((res) => {
      setEmployees((res.data || []).map((e) => ({
        ...e,
        label: `${e.matricule} — ${e.lastName} ${e.firstName}`,
      })))
    })
  }, [])

  // Populate form for edit
  useEffect(() => {
    if (editData) {
      setForm({
        employeeId: editData.employeeId,
        baseSalary: editData.baseSalary,
        sursalary: editData.sursalary,
        igrParts: String(editData.igrParts),
        cmuEmployeeCount: editData.cmuEmployeeCount,
        cmuEmployerCount: editData.cmuEmployerCount,
        transportAllowance: editData.transportAllowance,
        taxablePrimes: editData.taxablePrimes,
        taxableBenefits: editData.taxableBenefits,
        nonTaxableAllowances: editData.nonTaxableAllowances,
        atRate: editData.atRate != null ? String(editData.atRate) : '',
        specificCnpsBase: editData.specificCnpsBase != null ? String(editData.specificCnpsBase) : '',
        effectiveFrom: '',
        comment: editData.comment || '',
      })
      setEmpSearch(editData.employee ? `${editData.employee.matricule} — ${editData.employee.lastName} ${editData.employee.firstName}` : '')
    }
  }, [editData])

  const set = (key: string, val: string | number) => setForm((f) => ({ ...f, [key]: val }))

  const filteredEmployees = empSearch.trim()
    ? employees.filter((e) => e.label.toLowerCase().includes(empSearch.toLowerCase()))
    : employees

  const canSubmit = isEdit
    ? true
    : form.employeeId && form.effectiveFrom

  const handleSubmit = async () => {
    if (!canSubmit || saving) return
    setSaving(true)

    try {
      const payload: Record<string, unknown> = {
        baseSalary: Number(form.baseSalary) || 0,
        sursalary: Number(form.sursalary) || 0,
        igrParts: Number(form.igrParts) || 1,
        cmuEmployeeCount: Number(form.cmuEmployeeCount) || 1,
        cmuEmployerCount: Number(form.cmuEmployerCount) || 1,
        transportAllowance: Number(form.transportAllowance) || 0,
        taxablePrimes: Number(form.taxablePrimes) || 0,
        taxableBenefits: Number(form.taxableBenefits) || 0,
        nonTaxableAllowances: Number(form.nonTaxableAllowances) || 0,
        atRate: form.atRate ? Number(form.atRate) / 100 : null,
        specificCnpsBase: form.specificCnpsBase ? Number(form.specificCnpsBase) : null,
        comment: form.comment || null,
      }

      if (isEdit && editData) {
        await api.put(`/api/salary-profiles/${editData.id}`, payload)
        toast.success('Profil mis à jour avec succès')
      } else {
        payload.employeeId = form.employeeId
        payload.effectiveFrom = form.effectiveFrom
        await api.post('/api/salary-profiles', payload)
        toast.success('Profil créé avec succès')
      }
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier le profil salarial' : 'Nouveau profil salarial'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Modification du profil — ${editData?.employee.matricule} ${editData?.employee.lastName}`
              : 'Créer un nouveau profil salarial pour un employé. Le profil actif sera clôturé automatiquement.'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2 -mr-2">
          <div className="grid gap-4 py-2">
            {/* Employee select (only for create) */}
            {!isEdit && (
              <div className="space-y-2">
                <Label>Employé *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un employé..."
                    value={empSearch}
                    onChange={(e) => { setEmpSearch(e.target.value); setEmpOpen(true) }}
                    onFocus={() => setEmpOpen(true)}
                    className="pl-9"
                  />
                  {empOpen && filteredEmployees.length > 0 && (
                    <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
                      {filteredEmployees.slice(0, 20).map((emp) => (
                        <button
                          key={emp.id}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
                          onClick={() => {
                            set('employeeId', emp.id)
                            setEmpSearch(emp.label)
                            setEmpOpen(false)
                          }}
                        >
                          <span className="font-mono text-xs text-muted-foreground">{emp.matricule}</span>
                          <span>{emp.lastName} {emp.firstName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Effective date (only for create) */}
            {!isEdit && (
              <div className="space-y-2">
                <Label>Date d&apos;effet *</Label>
                <Input
                  type="date"
                  value={form.effectiveFrom}
                  onChange={(e) => set('effectiveFrom', e.target.value)}
                />
              </div>
            )}

            {/* Salary fields — 2 columns */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Salaire de base (FCFA)</Label>
                <Input type="number" value={form.baseSalary} onChange={(e) => set('baseSalary', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Sursalaire (FCFA)</Label>
                <Input type="number" value={form.sursalary} onChange={(e) => set('sursalary', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Parts IGR</Label>
                <Select value={form.igrParts} onValueChange={(v) => set('igrParts', v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {IGR_PARTS.map((p) => (
                      <SelectItem key={p} value={String(p)}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Personnes CMU salarié</Label>
                <Input type="number" min={0} value={form.cmuEmployeeCount} onChange={(e) => set('cmuEmployeeCount', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Personnes CMU employeur</Label>
                <Input type="number" min={0} value={form.cmuEmployerCount} onChange={(e) => set('cmuEmployerCount', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Indemnité transport (FCFA)</Label>
                <Input type="number" value={form.transportAllowance} onChange={(e) => set('transportAllowance', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Primes imposables (FCFA)</Label>
                <Input type="number" value={form.taxablePrimes} onChange={(e) => set('taxablePrimes', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Avantages imposables (FCFA)</Label>
                <Input type="number" value={form.taxableBenefits} onChange={(e) => set('taxableBenefits', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Indemnités non imposables (FCFA)</Label>
                <Input type="number" value={form.nonTaxableAllowances} onChange={(e) => set('nonTaxableAllowances', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Taux AT (%) — optionnel</Label>
                <Input type="number" step="0.01" placeholder="ex: 2 pour 2%" value={form.atRate} onChange={(e) => set('atRate', e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Base CNPS spécifique (FCFA) — optionnel</Label>
              <Input type="number" placeholder="Laisser vide pour calcul automatique" value={form.specificCnpsBase} onChange={(e) => set('specificCnpsBase', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Commentaire</Label>
              <Textarea
                placeholder="Motif de la modification ou notes..."
                value={form.comment}
                onChange={(e) => set('comment', e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || saving}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {isEdit ? 'Enregistrer' : 'Créer le profil'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}