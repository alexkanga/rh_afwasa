'use client'

import { useEffect, useState, useRef } from 'react'
import { Settings, Percent, Calculator, Loader2, Save, Plus, Trash2, RotateCcw } from 'lucide-react'
import { api } from '@/lib/api'
import { formatFcfa, formatPercent } from '@/lib/format'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// ── Types ──

interface ParamEntry {
  code: string
  value: number
  unit: string
  description: string
  source: string
  _source?: string
}

interface ItsBracket {
  id?: string
  lowerBound: number
  upperBound: number
  rate: number
  label: string
  order: number
}

interface RicfEntry {
  id?: string
  igrParts: number
  monthlyAmount: number
}

interface ApiResponse {
  params: Record<string, ParamEntry>
  itsBrackets: ItsBracket[]
  ricfScale: RicfEntry[]
}

// ── Source badge config ──

const SOURCE_CONFIG: Record<string, { label: string; className: string }> = {
  CNPS: { label: 'CNPS', className: 'bg-[#029CB1]/10 text-[#029CB1] border-[#029CB1]/20' },
  Entreprise: { label: 'Entreprise', className: 'bg-[#362981]/10 text-[#362981] border-[#362981]/20' },
  FDFP: { label: 'FDFP', className: 'bg-[#009446]/10 text-[#009446] border-[#009446]/20' },
}

// ── Editable Cell Component ──

function EditableCell({
  value,
  onChange,
  onSave,
  unit,
  isSaving,
}: {
  value: string
  onChange: (v: string) => void
  onSave: () => void
  unit?: string
  isSaving?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    setDraft(value)
  }, [value])

  const startEdit = () => {
    setDraft(value)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const commit = () => {
    if (draft !== value) {
      onChange(draft)
      onSave()
    }
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') {
      setDraft(value)
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="h-8 w-28 text-sm font-mono"
          disabled={isSaving}
          autoFocus
        />
        {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#009446]" />}
      </div>
    )
  }

  return (
    <span
      onClick={startEdit}
      className="cursor-pointer rounded-md px-2 py-1 font-mono text-sm hover:bg-[#362981]/5 transition-colors"
      title="Cliquer pour modifier"
    >
      {value}
      {unit && <span className="ml-1 text-muted-foreground font-sans text-xs">{unit}</span>}
    </span>
  )
}

// ── Tab 1: Payroll Parameters ──

function PayrollParamsTab({ data, loading, onReload }: { data: Record<string, ParamEntry>; loading: boolean; onReload: () => void }) {
  const [saving, setSaving] = useState<string | null>(null)
  const [localParams, setLocalParams] = useState(data)

  useEffect(() => {
    setLocalParams(data)
  }, [data])

  // Group by source
  const grouped: Record<string, ParamEntry[]> = {}
  const sourceOrder = ['CNPS', 'Entreprise', 'FDFP']
  const entries = Object.entries(localParams)

  for (const [code, entry] of entries) {
    const source = entry.source || 'Autre'
    if (!grouped[source]) grouped[source] = []
    grouped[source].push({ code, ...entry })
  }

  const sortedGroups = sourceOrder.filter(s => grouped[s]).concat(
    Object.keys(grouped).filter(s => !sourceOrder.includes(s))
  )

  const handleSave = async (code: string) => {
    const entry = localParams[code]
    if (!entry) return

    setSaving(code)
    try {
      await api.put(`/api/parameters/${code}`, {
        value: entry.value,
        description: entry.description,
      })
      toast.success(`Paramètre ${code} mis à jour`)
      onReload()
    } catch {
      toast.error(`Erreur lors de la mise à jour de ${code}`)
      // Revert to original
      setLocalParams(prev => ({
        ...prev,
        [code]: data[code],
      }))
    } finally {
      setSaving(null)
    }
  }

  const handleValueChange = (code: string, raw: string) => {
    const num = parseFloat(raw.replace(',', '.'))
    if (!isNaN(num)) {
      setLocalParams(prev => ({
        ...prev,
        [code]: { ...prev[code], value: num },
      }))
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, gi) => (
          <Card key={gi}>
            <CardHeader className="pb-3">
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, ri) => (
                  <Skeleton key={ri} className="h-10 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {sortedGroups.map(source => {
        const items = grouped[source]
        const cfg = SOURCE_CONFIG[source]
        return (
          <Card key={source} className="animate-fade-in-up">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <CardTitle className="text-base font-semibold">{source}</CardTitle>
                <Badge variant="outline" className={cfg?.className}>
                  {cfg?.label || source}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {items.length} paramètres
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[200px] text-xs font-semibold uppercase">Code</TableHead>
                      <TableHead className="text-xs font-semibold uppercase">Description</TableHead>
                      <TableHead className="w-[200px] text-xs font-semibold uppercase">Valeur</TableHead>
                      <TableHead className="w-[80px] text-xs font-semibold uppercase text-center">Unité</TableHead>
                      <TableHead className="w-[100px] text-xs font-semibold uppercase text-center">Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map(param => (
                      <TableRow key={param.code} className="group">
                        <TableCell className="font-mono text-sm font-medium">{param.code}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{param.description}</TableCell>
                        <TableCell>
                          <EditableCell
                            value={
                              param.unit === '%'
                                ? (param.value * 100).toFixed(4)
                                : param.value.toLocaleString('fr-FR')
                            }
                            onChange={raw => {
                              // Convert back from display to stored value
                              const num = parseFloat(raw.replace(/\s/g, '').replace(',', '.'))
                              if (!isNaN(num)) {
                                setLocalParams(prev => ({
                                  ...prev,
                                  [param.code]: {
                                    ...prev[param.code],
                                    value: param.unit === '%' ? num / 100 : num,
                                  },
                                }))
                              }
                            }}
                            onSave={() => handleSave(param.code)}
                            unit={param.unit}
                            isSaving={saving === param.code}
                          />
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">{param.unit}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-xs">
                            {param.source}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// ── Tab 2: ITS Brackets ──

function ItsBracketsTab({
  data,
  loading,
  onReload,
}: {
  data: ItsBracket[]
  loading: boolean
  onReload: () => void
}) {
  const [brackets, setBrackets] = useState<ItsBracket[]>([])
  const [original, setOriginal] = useState<ItsBracket[]>([])
  const [saving, setSaving] = useState(false)
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null)

  useEffect(() => {
    setBrackets(data)
    setOriginal(data)
  }, [data])

  const hasChanges = JSON.stringify(brackets) !== JSON.stringify(original)

  const handleSave = async () => {
    setSaving(true)
    try {
      // Assign order
      const ordered = brackets.map((b, i) => ({ ...b, order: i + 1 }))
      await api.put('/api/parameters/its-brackets', { brackets: ordered })
      toast.success('Tranches ITS mises à jour')
      onReload()
    } catch {
      toast.error('Erreur lors de la mise à jour des tranches ITS')
    } finally {
      setSaving(false)
    }
  }

  const handleAdd = () => {
    const lastUpper = brackets.length > 0 ? brackets[brackets.length - 1].upperBound : 0
    setBrackets([
      ...brackets,
      {
        lowerBound: lastUpper,
        upperBound: lastUpper + 1000000,
        rate: 0,
        label: `${(lastUpper + 1).toLocaleString('fr-FR')} à ${(lastUpper + 1000000).toLocaleString('fr-FR')}`,
        order: brackets.length + 1,
      },
    ])
  }

  const handleDelete = () => {
    if (deleteIdx === null) return
    setBrackets(prev => prev.filter((_, i) => i !== deleteIdx))
    setDeleteIdx(null)
    toast.info('Tranche supprimée (non encore enregistrée)')
  }

  const updateBracket = (idx: number, field: keyof ItsBracket, val: string) => {
    setBrackets(prev => {
      const copy = [...prev]
      const num = parseFloat(val.replace(/\s/g, '').replace(',', '.'))
      if (field === 'label') {
        copy[idx] = { ...copy[idx], [field]: val }
      } else if (field === 'rate') {
        copy[idx] = { ...copy[idx], [field]: isNaN(num) ? 0 : num / 100 }
      } else {
        copy[idx] = { ...copy[idx], [field]: isNaN(num) ? 0 : Math.round(num) }
      }
      return copy
    })
  }

  const handleReset = () => {
    setBrackets(original)
    toast.info('Modifications annulées')
  }

  // Visual bar data
  const maxRate = Math.max(...brackets.map(b => b.rate), 0.01)
  const maxUpper = Math.max(...brackets.map(b => b.upperBound), 1)

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Visual bar representation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Percent className="h-4 w-4 text-[#029CB1]" />
            Représentation visuelle des tranches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-1 h-8 rounded-lg overflow-hidden">
            {brackets.map((b, i) => {
              const widthPercent = Math.max(
                ((b.upperBound - b.lowerBound) / maxUpper) * 100,
                3
              )
              const intensity = Math.round((b.rate / maxRate) * 100)
              return (
                <div
                  key={i}
                  className="relative flex items-center justify-center text-[10px] font-medium text-white transition-all"
                  style={{
                    width: `${widthPercent}%`,
                    backgroundColor: b.rate === 0 ? '#d1d5db' : `rgba(54, 41, 129, ${0.3 + (intensity / 100) * 0.7})`,
                    minWidth: '40px',
                  }}
                  title={`${b.label} — ${formatPercent(b.rate)}`}
                >
                  {b.rate > 0 && widthPercent > 8 ? `${(b.rate * 100).toFixed(0)}%` : ''}
                </div>
              )
            })}
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
            <span>0</span>
            <span>{formatFcfa(maxUpper)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Brackets table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base font-semibold">Détail des tranches ITS</CardTitle>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Annuler
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleAdd}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Ajouter
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="bg-[#009446] hover:bg-[#009446]/90 text-white"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                Enregistrer
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[60px] text-xs font-semibold uppercase text-center">Tr.</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Borne inf.</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Borne sup.</TableHead>
                  <TableHead className="w-[120px] text-xs font-semibold uppercase text-center">Taux (%)</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Libellé</TableHead>
                  <TableHead className="w-[60px] text-xs font-semibold uppercase text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brackets.map((b, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-center font-mono text-sm font-medium">{i + 1}</TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-sm font-mono w-36"
                        value={b.lowerBound.toLocaleString('fr-FR')}
                        onChange={e => updateBracket(i, 'lowerBound', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-sm font-mono w-36"
                        value={b.upperBound.toLocaleString('fr-FR')}
                        onChange={e => updateBracket(i, 'upperBound', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-sm font-mono w-24 text-center"
                        value={(b.rate * 100).toFixed(2)}
                        onChange={e => updateBracket(i, 'rate', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-sm w-full"
                        value={b.label}
                        onChange={e => updateBracket(i, 'label', e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteIdx(i)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={deleteIdx !== null} onOpenChange={open => !open && setDeleteIdx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette tranche ?</AlertDialogTitle>
            <AlertDialogDescription>
              La tranche {deleteIdx !== null ? `#${deleteIdx + 1}` : ''} sera retirée de la liste.
              Cette action sera effective après l&apos;enregistrement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ── Tab 3: RICF Scale ──

function RicfScaleTab({
  data,
  loading,
  onReload,
}: {
  data: RicfEntry[]
  loading: boolean
  onReload: () => void
}) {
  const [entries, setEntries] = useState<RicfEntry[]>([])
  const [original, setOriginal] = useState<RicfEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null)

  useEffect(() => {
    setEntries(data)
    setOriginal(data)
  }, [data])

  const hasChanges = JSON.stringify(entries) !== JSON.stringify(original)

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/api/parameters/ricf-scale', { entries })
      toast.success('Barème RICF mis à jour')
      onReload()
    } catch {
      toast.error('Erreur lors de la mise à jour du barème RICF')
    } finally {
      setSaving(false)
    }
  }

  const handleAdd = () => {
    const lastParts = entries.length > 0 ? entries[entries.length - 1].igrParts : 0
    setEntries([
      ...entries,
      {
        igrParts: lastParts + 0.5,
        monthlyAmount: 0,
      },
    ])
  }

  const handleDelete = () => {
    if (deleteIdx === null) return
    setEntries(prev => prev.filter((_, i) => i !== deleteIdx))
    setDeleteIdx(null)
    toast.info('Entrée supprimée (non encore enregistrée)')
  }

  const handleReset = () => {
    setEntries(original)
    toast.info('Modifications annulées')
  }

  const updateEntry = (idx: number, field: keyof RicfEntry, val: string) => {
    setEntries(prev => {
      const copy = [...prev]
      const num = parseFloat(val.replace(/\s/g, '').replace(',', '.'))
      if (isNaN(num)) return prev
      copy[idx] = { ...copy[idx], [field]: num }
      return copy
    })
  }

  // Bar chart data
  const maxAmount = Math.max(...entries.map(e => e.monthlyAmount), 1)

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Visual bar chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calculator className="h-4 w-4 text-[#029CB1]" />
            Barème RICF — Progression
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {entries.map((e, i) => {
              const pct = (e.monthlyAmount / maxAmount) * 100
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-14 text-right text-xs font-medium text-muted-foreground shrink-0">
                    {e.igrParts} {e.igrParts === 1 ? 'part' : 'parts'}
                  </div>
                  <div className="flex-1 h-7 bg-muted rounded-md overflow-hidden relative">
                    <div
                      className="h-full rounded-md transition-all duration-500 flex items-center px-2"
                      style={{
                        width: `${Math.max(pct, 2)}%`,
                        backgroundColor: `rgba(2, 156, 177, ${0.3 + (pct / 100) * 0.7})`,
                      }}
                    >
                      {pct > 15 && (
                        <span className="text-[11px] font-medium text-white">
                          {formatFcfa(e.monthlyAmount)}
                        </span>
                      )}
                    </div>
                    {pct <= 15 && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-medium text-muted-foreground">
                        {formatFcfa(e.monthlyAmount)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base font-semibold">Détail du barème</CardTitle>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Annuler
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleAdd}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Ajouter
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="bg-[#009446] hover:bg-[#009446]/90 text-white"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                Enregistrer
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[60px] text-xs font-semibold uppercase text-center">#</TableHead>
                  <TableHead className="w-[160px] text-xs font-semibold uppercase text-center">Parts IGR</TableHead>
                  <TableHead className="text-xs font-semibold uppercase">Montant mensuel (FCFA)</TableHead>
                  <TableHead className="w-[60px] text-xs font-semibold uppercase text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-center text-sm text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="text-center">
                      <Input
                        className="h-8 text-sm font-mono w-24 text-center mx-auto"
                        value={e.igrParts}
                        onChange={ev => updateEntry(i, 'igrParts', ev.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-sm font-mono w-48"
                        value={e.monthlyAmount.toLocaleString('fr-FR')}
                        onChange={ev => updateEntry(i, 'monthlyAmount', ev.target.value)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteIdx(i)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={deleteIdx !== null} onOpenChange={open => !open && setDeleteIdx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette entrée ?</AlertDialogTitle>
            <AlertDialogDescription>
              L&apos;entrée {deleteIdx !== null ? `#${deleteIdx + 1} (${entries[deleteIdx]?.igrParts} parts)` : ''} sera retirée.
              Cette action sera effective après l&apos;enregistrement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ── Main Page ──

export default function ParametersPage() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    api.get<ApiResponse>('/api/parameters')
      .then(res => { if (!cancelled) setData(res) })
      .catch(() => { if (!cancelled) toast.error('Erreur lors du chargement des paramètres') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [refreshKey])

  const reload = () => {
    setLoading(true)
    setRefreshKey(k => k + 1)
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6 text-[#362981]" />
            Paramètres de paie
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez les taux, tranches fiscales et barèmes utilisés dans les calculs de paie.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
          Actualiser
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="params" className="w-full">
        <TabsList variant="line" className="w-full justify-start border-b">
          <TabsTrigger
            value="params"
            className="data-[state=active]:text-[#362981] data-[state=active]:after:bg-[#362981] font-medium"
          >
            <Settings className="h-4 w-4 mr-1.5" />
            Paramètres de paie
          </TabsTrigger>
          <TabsTrigger
            value="its"
            className="data-[state=active]:text-[#362981] data-[state=active]:after:bg-[#362981] font-medium"
          >
            <Percent className="h-4 w-4 mr-1.5" />
            Tranches ITS
          </TabsTrigger>
          <TabsTrigger
            value="ricf"
            className="data-[state=active]:text-[#362981] data-[state=active]:after:bg-[#362981] font-medium"
          >
            <Calculator className="h-4 w-4 mr-1.5" />
            Barème RICF
          </TabsTrigger>
        </TabsList>

        <TabsContent value="params" className="mt-6">
          <PayrollParamsTab
            data={data?.params ?? {}}
            loading={loading}
            onReload={reload}
          />
        </TabsContent>

        <TabsContent value="its" className="mt-6">
          <ItsBracketsTab
            data={data?.itsBrackets ?? []}
            loading={loading}
            onReload={reload}
          />
        </TabsContent>

        <TabsContent value="ricf" className="mt-6">
          <RicfScaleTab
            data={data?.ricfScale ?? []}
            loading={loading}
            onReload={reload}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}