'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import {
  Calculator,
  RotateCcw,
  Upload,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  TrendingUp,
  Wallet,
  Building2,
  Receipt,
  Clock,
  MapPin,
  Settings2,
  Info,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { calculatePayroll, type PayrollResult, type PayrollParams, type ItsBracket, type RicfEntry, type SalaryProfileInput, type EmployeeInput } from '@/lib/payroll-engine'
import { DEFAULT_PARAMS, DEFAULT_ITS_BRACKETS, DEFAULT_RICF_SCALE, IGR_PARTS, WORK_LOCATIONS } from '@/lib/constants'
import { formatFcfa, formatPercent } from '@/lib/format'

// ============ HELPERS ============

function getDefaultHireDate(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 1)
  return d.toISOString().slice(0, 10)
}

function buildDefaultParams(): PayrollParams {
  const result: Record<string, number> = {}
  for (const [code, def] of Object.entries(DEFAULT_PARAMS)) {
    result[code] = def.value
  }
  return result as unknown as PayrollParams
}

function buildItsBrackets(): ItsBracket[] {
  return DEFAULT_ITS_BRACKETS.map(b => ({
    lowerBound: b.lowerBound,
    upperBound: b.upperBound,
    rate: b.rate,
    label: b.label,
  }))
}

function buildRicfScale(): RicfEntry[] {
  return DEFAULT_RICF_SCALE.map(r => ({
    igrParts: r.igrParts,
    monthlyAmount: r.monthlyAmount,
  }))
}

function computeSeniority(hireDateStr: string): number {
  const hireDate = new Date(hireDateStr)
  if (isNaN(hireDate.getTime())) return 0
  const now = new Date()
  return Math.floor((now.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
}

function computeItsBracketDetails(grossTaxable: number, brackets: ItsBracket[]): { label: string; amount: number; rate: number; taxableBase: number }[] {
  if (grossTaxable <= 0) return []
  return brackets
    .map(b => {
      const taxableBase = Math.max(0, Math.min(grossTaxable, b.upperBound) - b.lowerBound)
      const amount = Math.round(taxableBase * b.rate)
      return { label: b.label, amount, rate: b.rate, taxableBase }
    })
    .filter(b => b.amount > 0)
}

// ============ FCFA INPUT COMPONENT ============

function FcfaInput({
  label,
  value,
  onChange,
  placeholder,
  readOnly,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  readOnly?: boolean
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          className="pr-12 tabular-nums"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
          FCFA
        </span>
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

// ============ PERCENT INPUT COMPONENT ============

function PercentInput({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          step="0.01"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-8 tabular-nums"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
          %
        </span>
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

// ============ PARAM GROUP ============

function ParamGroup({
  source,
  params,
  onChange,
}: {
  source: string
  params: { code: string; value: number; unit: string; description: string }[]
  onChange: (code: string, value: number) => void
}) {
  const sourceColors: Record<string, string> = {
    CNPS: 'bg-[#029CB1]/10 text-[#029CB1] border-[#029CB1]/20',
    Entreprise: 'bg-[#362981]/10 text-[#362981] border-[#029CB1]/20',
    FDFP: 'bg-[#009446]/10 text-[#009446] border-[#009446]/20',
  }

  return (
    <div className="space-y-3">
      <Badge variant="outline" className={sourceColors[source] || ''}>
        {source}
      </Badge>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {params.map(p => (
          <div key={p.code} className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground leading-tight">
                {p.description}
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="size-3 text-muted-foreground/60 shrink-0 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>{p.code} ({p.unit})</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="relative">
              <Input
                type="number"
                step="any"
                value={p.unit === '%' ? p.value * 100 : p.value}
                onChange={e => {
                  const num = parseFloat(e.target.value)
                  if (!isNaN(num)) {
                    onChange(p.code, p.unit === '%' ? num / 100 : num)
                  }
                }}
                className={`pr-14 tabular-nums text-xs h-8`}
              />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground">
                {p.unit}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============ SUMMARY CARD ============

function SummaryCard({
  title,
  value,
  icon: Icon,
  color,
  delayClass,
}: {
  title: string
  value: string
  icon: React.ElementType
  color: string
  delayClass: string
}) {
  return (
    <Card className={`animate-fade-in-up ${delayClass} overflow-hidden border-0`}>
      <div className="absolute inset-0 top-0 h-1" style={{ background: color }} />
      <CardContent className="p-4 pt-5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-lg font-bold tabular-nums leading-tight" style={{ color }}>
              {value}
            </p>
          </div>
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}14` }}
          >
            <Icon className="size-4.5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============ MAIN COMPONENT ============

export default function SimulatorPage() {
  // ---- Form state ----
  const [hireDate, setHireDate] = useState(getDefaultHireDate)
  const [workLocation, setWorkLocation] = useState<string>('Siège')
  const [baseSalary, setBaseSalary] = useState('300000')
  const [sursalary, setSursalary] = useState('0')
  const [transportAllowance, setTransportAllowance] = useState('30000')
  const [taxablePrimes, setTaxablePrimes] = useState('0')
  const [taxableBenefits, setTaxableBenefits] = useState('0')
  const [nonTaxableAllowances, setNonTaxableAllowances] = useState('0')
  const [igrParts, setIgrParts] = useState<string>('2')
  const [cmuEmployeeCount, setCmuEmployeeCount] = useState('1')
  const [cmuEmployerCount, setCmuEmployerCount] = useState('1')
  const [customAtRate, setCustomAtRate] = useState('')
  const [paramsExpanded, setParamsExpanded] = useState(false)
  const [itsExpanded, setItsExpanded] = useState(false)

  // ---- Params state ----
  const [params, setParams] = useState<PayrollParams>(buildDefaultParams)

  // ---- Result state ----
  const [result, setResult] = useState<PayrollResult | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [calcTime, setCalcTime] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  const itsBrackets = useMemo(() => buildItsBrackets(), [])
  const ricfScale = useMemo(() => buildRicfScale(), [])

  const seniority = useMemo(() => computeSeniority(hireDate), [hireDate])

  // ---- Handle calculate ----
  const handleCalculate = useCallback(() => {
    setCalculating(true)
    // Use setTimeout to allow UI to show loading state
    setTimeout(() => {
      const profile: SalaryProfileInput = {
        baseSalary: parseFloat(baseSalary) || 0,
        sursalary: parseFloat(sursalary) || 0,
        transportAllowance: parseFloat(transportAllowance) || 0,
        taxablePrimes: parseFloat(taxablePrimes) || 0,
        taxableBenefits: parseFloat(taxableBenefits) || 0,
        nonTaxableAllowances: parseFloat(nonTaxableAllowances) || 0,
        igrParts: parseFloat(igrParts) || 1,
        cmuEmployeeCount: parseInt(cmuEmployeeCount) || 0,
        cmuEmployerCount: parseInt(cmuEmployerCount) || 0,
        atRate: customAtRate ? parseFloat(customAtRate) / 100 : null,
        specificCnpsBase: null,
      }
      const employee: EmployeeInput = {
        hireDate: hireDate ? new Date(hireDate) : null,
      }

      const start = performance.now()
      const res = calculatePayroll(profile, employee, params, itsBrackets, ricfScale)
      const elapsed = Math.round((performance.now() - start) * 100) / 100

      setResult(res)
      setCalcTime(elapsed)
      setCalculating(false)
      setItsExpanded(false)
    }, 80)
  }, [baseSalary, sursalary, transportAllowance, taxablePrimes, taxableBenefits, nonTaxableAllowances, igrParts, cmuEmployeeCount, cmuEmployerCount, customAtRate, hireDate, params, itsBrackets, ricfScale])

  // ---- Handle reset ----
  const handleReset = useCallback(() => {
    setHireDate(getDefaultHireDate())
    setWorkLocation('Siège')
    setBaseSalary('300000')
    setSursalary('0')
    setTransportAllowance('30000')
    setTaxablePrimes('0')
    setTaxableBenefits('0')
    setNonTaxableAllowances('0')
    setIgrParts('2')
    setCmuEmployeeCount('1')
    setCmuEmployerCount('1')
    setCustomAtRate('')
    setParams(buildDefaultParams())
    setResult(null)
    setCalcTime(null)
    setParamsExpanded(false)
    setItsExpanded(false)
  }, [])

  // ---- Handle copy ----
  const handleCopy = useCallback(async () => {
    if (!result) return
    const text = [
      `SIMULATEUR DE PAIE — RH-AFWASA`,
      `${'─'.repeat(40)}`,
      `Salaire Brut Total: ${formatFcfa(result.totalGross)}`,
      `Net à Payer: ${formatFcfa(result.netPayable)}`,
      `Charges Patronales: ${formatFcfa(result.totalEmployerCharges)}`,
      `Coût Total Employeur: ${formatFcfa(result.totalEmployerCost)}`,
      `${'─'.repeat(40)}`,
      `Brut imposable: ${formatFcfa(result.grossTaxable)}`,
      `CNPS salarié: ${formatFcfa(result.cnpsEmployee)}`,
      `CMU salarié: ${formatFcfa(result.cmuEmployee)}`,
      `RICF: ${formatFcfa(result.ricf)}`,
      `ITS: ${formatFcfa(result.its)}`,
      `Total déductions: ${formatFcfa(result.totalDeductions)}`,
    ].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API might not be available
    }
  }, [result])

  // ---- Param change handler ----
  const handleParamChange = useCallback((code: string, value: number) => {
    setParams(prev => ({ ...prev, [code]: value }))
  }, [])

  // ---- Group params by source ----
  const paramsBySource = useMemo(() => {
    const groups: Record<string, { code: string; value: number; unit: string; description: string }[]> = {}
    for (const [code, def] of Object.entries(DEFAULT_PARAMS)) {
      const source = def.source
      if (!groups[source]) groups[source] = []
      groups[source].push({
        code,
        value: (params as Record<string, number>)[code] ?? def.value,
        unit: def.unit,
        description: def.description,
      })
    }
    return groups
  }, [params])

  // ---- ITS detail ----
  const itsDetails = useMemo(() => {
    if (!result) return []
    return computeItsBracketDetails(result.grossTaxable, itsBrackets)
  }, [result, itsBrackets])

  // ---- Render ----
  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#362981' }}>
              Simulateur de Paie
            </h1>
            <p className="text-sm text-muted-foreground">
              Calculez la fiche de paie en temps réel avec les barèmes CI 2025
            </p>
          </div>
          {result && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[11px]">
                <Clock className="mr-1 size-3" />
                Calculé en {calcTime} ms
              </Badge>
              {result.controlStatus !== 'OK' && (
                <Badge variant="destructive" className="text-[11px]">
                  <AlertCircle className="mr-1 size-3" />
                  {result.controlStatus}
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr]">
          {/* ============ LEFT — INPUT FORM ============ */}
          <div className="space-y-4">
            {/* Employee Info */}
            <Card className="py-0 gap-0">
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: '#362981' }}>
                  <Receipt className="size-4" />
                  Informations employé
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Date d&apos;embauche</Label>
                  <Input
                    type="date"
                    value={hireDate}
                    onChange={e => setHireDate(e.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Lieu de travail</Label>
                  <Select value={workLocation} onValueChange={setWorkLocation}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WORK_LOCATIONS.map(loc => (
                        <SelectItem key={loc} value={loc}>
                          <div className="flex items-center gap-2">
                            <MapPin className="size-3.5 text-muted-foreground" />
                            {loc}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Ancienneté calculée</Label>
                  <div className="flex h-9 items-center gap-2 rounded-md border bg-muted/40 px-3">
                    <Clock className="size-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium tabular-nums">
                      {seniority} an{seniority > 1 ? 's' : ''}
                      {seniority >= 2 && (
                        <span className="ml-2 text-[#009446]">(+{formatPercent(seniority >= 25 ? 0.25 : seniority / 100)} prime)</span>
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Salary Profile */}
            <Card className="py-0 gap-0">
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: '#362981' }}>
                  <Wallet className="size-4" />
                  Profil salarial
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-4">
                <FcfaInput
                  label="Salaire de base"
                  value={baseSalary}
                  onChange={setBaseSalary}
                  placeholder="0"
                />
                <FcfaInput
                  label="Sursalaire"
                  value={sursalary}
                  onChange={setSursalary}
                  placeholder="0"
                />
                <FcfaInput
                  label="Indemnité de transport"
                  value={transportAllowance}
                  onChange={setTransportAllowance}
                  placeholder="0"
                  hint={`Exonéré jusqu'à ${formatFcfa(30000)}`}
                />
                <FcfaInput
                  label="Primes imposables"
                  value={taxablePrimes}
                  onChange={setTaxablePrimes}
                  placeholder="0"
                />
                <FcfaInput
                  label="Avantages en nature imposables"
                  value={taxableBenefits}
                  onChange={setTaxableBenefits}
                  placeholder="0"
                />
                <FcfaInput
                  label="Indemnités non imposables"
                  value={nonTaxableAllowances}
                  onChange={setNonTaxableAllowances}
                  placeholder="0"
                />

                <Separator />

                {/* IGR Parts */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Parts IGR</Label>
                  <Select value={igrParts} onValueChange={setIgrParts}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {IGR_PARTS.map(p => (
                        <SelectItem key={p} value={String(p)}>
                          {p} part{p > 1 ? 's' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* CMU counts */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">CMU salarié (bénéf.)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={cmuEmployeeCount}
                      onChange={e => setCmuEmployeeCount(e.target.value)}
                      className="h-9 tabular-nums"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">CMU employeur (bénéf.)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={cmuEmployerCount}
                      onChange={e => setCmuEmployerCount(e.target.value)}
                      className="h-9 tabular-nums"
                    />
                  </div>
                </div>

                <PercentInput
                  label="Taux AT personnalisé (optionnel)"
                  value={customAtRate}
                  onChange={setCustomAtRate}
                  placeholder="Défaut: 2%"
                  hint="Laisser vide pour le taux par défaut (2%)"
                />
              </CardContent>
            </Card>

            {/* Parameters (expandable) */}
            <Card className="py-0 gap-0">
              <button
                type="button"
                onClick={() => setParamsExpanded(!paramsExpanded)}
                className="flex w-full items-center justify-between px-4 pt-4 pb-3 text-left hover:bg-muted/30 transition-colors rounded-t-xl"
              >
                <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: '#362981' }}>
                  <Settings2 className="size-4" />
                  Paramètres de paie
                  <Badge variant="secondary" className="text-[10px] px-1.5">
                    {Object.keys(params).length}
                  </Badge>
                </CardTitle>
                {paramsExpanded ? (
                  <ChevronDown className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground" />
                )}
              </button>
              {paramsExpanded && (
                <CardContent className="px-4 pb-4 pt-0 space-y-5 border-t">
                  <div className="pt-4 flex justify-end">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setParams(buildDefaultParams())}
                      className="text-muted-foreground"
                    >
                      <RotateCcw className="size-3" />
                      Réinitialiser les paramètres
                    </Button>
                  </div>
                  {Object.entries(paramsBySource).map(([source, items]) => (
                    <ParamGroup
                      key={source}
                      source={source}
                      params={items}
                      onChange={handleParamChange}
                    />
                  ))}
                </CardContent>
              )}
            </Card>

            {/* Action Buttons — Desktop */}
            <div className="hidden lg:flex gap-3">
              <Button
                onClick={handleCalculate}
                disabled={calculating}
                className="flex-1 h-11 font-semibold"
                style={{ backgroundColor: '#009446' }}
              >
                {calculating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Calculator className="size-4" />
                )}
                {calculating ? 'Calcul en cours...' : 'Calculer'}
              </Button>
              <Button variant="outline" onClick={handleReset} className="h-11">
                <RotateCcw className="size-4" />
                Réinitialiser
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button variant="outline" disabled className="h-11">
                        <Upload className="size-4" />
                        Importer un profil
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Prochainement</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* ============ RIGHT — RESULTS ============ */}
          <div className="space-y-4 min-w-0">
            {result ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                  <SummaryCard
                    title="Salaire Brut Total"
                    value={formatFcfa(result.totalGross)}
                    icon={TrendingUp}
                    color="#362981"
                    delayClass="stagger-1"
                  />
                  <SummaryCard
                    title="Net à Payer"
                    value={formatFcfa(result.netPayable)}
                    icon={Wallet}
                    color="#009446"
                    delayClass="stagger-2"
                  />
                  <SummaryCard
                    title="Charges Patronales"
                    value={formatFcfa(result.totalEmployerCharges)}
                    icon={Building2}
                    color="#029CB1"
                    delayClass="stagger-3"
                  />
                  <SummaryCard
                    title="Coût Total Employeur"
                    value={formatFcfa(result.totalEmployerCost)}
                    icon={Receipt}
                    color="#362981"
                    delayClass="stagger-4"
                  />
                </div>

                {/* Détail des Gains */}
                <Card className="animate-fade-in-up stagger-2 py-0 gap-0 overflow-hidden">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold" style={{ color: '#362981' }}>
                        Détail des Gains
                      </CardTitle>
                      <Badge variant="outline" className="text-[10px] text-[#362981]">BRUT</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className="text-sm">Salaire de base</TableCell>
                          <TableCell className="text-right text-sm font-medium tabular-nums">{formatFcfa(result.baseSalary)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="text-sm">Sursalaire</TableCell>
                          <TableCell className="text-right text-sm font-medium tabular-nums">{formatFcfa(result.sursalary)}</TableCell>
                        </TableRow>
                        {result.seniorityBonus > 0 && (
                          <TableRow>
                            <TableCell className="text-sm">
                              Prime d&apos;ancienneté
                              <span className="ml-1.5 text-[10px] text-muted-foreground">({seniority} an{seniority > 1 ? 's' : ''})</span>
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium tabular-nums text-[#009446]">+{formatFcfa(result.seniorityBonus)}</TableCell>
                          </TableRow>
                        )}
                        {result.transportExempt > 0 && (
                          <TableRow>
                            <TableCell className="text-sm">Ind. transport (exonéré)</TableCell>
                            <TableCell className="text-right text-sm font-medium tabular-nums">{formatFcfa(result.transportExempt)}</TableCell>
                          </TableRow>
                        )}
                        {result.transportTaxable > 0 && (
                          <TableRow>
                            <TableCell className="text-sm">Ind. transport (imposable)</TableCell>
                            <TableCell className="text-right text-sm font-medium tabular-nums">{formatFcfa(result.transportTaxable)}</TableCell>
                          </TableRow>
                        )}
                        {result.taxablePrimes > 0 && (
                          <TableRow>
                            <TableCell className="text-sm">Primes imposables</TableCell>
                            <TableCell className="text-right text-sm font-medium tabular-nums">{formatFcfa(result.taxablePrimes)}</TableCell>
                          </TableRow>
                        )}
                        {result.taxableBenefits > 0 && (
                          <TableRow>
                            <TableCell className="text-sm">Avantages en nature</TableCell>
                            <TableCell className="text-right text-sm font-medium tabular-nums">{formatFcfa(result.taxableBenefits)}</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                      <TableFooter>
                        <TableRow className="bg-muted/40">
                          <TableCell className="text-sm font-bold">Total Brut</TableCell>
                          <TableCell className="text-right text-sm font-bold tabular-nums" style={{ color: '#362981' }}>
                            {formatFcfa(result.totalGross)}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </CardContent>
                </Card>

                {/* Déductions Salarié */}
                <Card className="animate-fade-in-up stagger-3 py-0 gap-0 overflow-hidden">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold" style={{ color: '#362981' }}>
                        Déductions Salarié
                      </CardTitle>
                      <Badge variant="destructive" className="text-[10px]">DÉDUCTIONS</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-xs">Déduction</TableHead>
                          <TableHead className="text-xs text-right">Base</TableHead>
                          <TableHead className="text-xs text-right">Taux</TableHead>
                          <TableHead className="text-xs text-right">Montant</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="text-sm">CNPS Retraite</TableCell>
                          <TableCell className="text-right text-sm tabular-nums text-muted-foreground">{formatFcfa(result.cnpsBase)}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{formatPercent(params.CNPS_SALARIE, 1)}</TableCell>
                          <TableCell className="text-right text-sm font-medium tabular-nums text-red-600">-{formatFcfa(result.cnpsEmployee)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="text-sm">CMU Salarié</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">—</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{parseInt(cmuEmployeeCount) || 0} pers.</TableCell>
                          <TableCell className="text-right text-sm font-medium tabular-nums text-red-600">-{formatFcfa(result.cmuEmployee)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="text-sm">RICF</TableCell>
                          <TableCell className="text-right text-sm tabular-nums text-muted-foreground">{igrParts} part{parseFloat(igrParts) > 1 ? 's' : ''}</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">—</TableCell>
                          <TableCell className="text-right text-sm font-medium tabular-nums text-red-600">-{formatFcfa(result.ricf)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="text-sm">ITS</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">—</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">progressif</TableCell>
                          <TableCell className="text-right text-sm font-medium tabular-nums text-red-600">-{formatFcfa(result.its)}</TableCell>
                        </TableRow>
                      </TableBody>
                      <TableFooter>
                        <TableRow className="bg-red-50/50 dark:bg-red-950/10">
                          <TableCell className="text-sm font-bold" colSpan={3}>Total Déductions</TableCell>
                          <TableCell className="text-right text-sm font-bold tabular-nums text-red-700 dark:text-red-400">
                            -{formatFcfa(result.totalDeductions)}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </CardContent>
                </Card>

                {/* Charges Patronales */}
                <Card className="animate-fade-in-up stagger-4 py-0 gap-0 overflow-hidden">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold" style={{ color: '#362981' }}>
                        Charges Patronales
                      </CardTitle>
                      <Badge variant="outline" className="text-[10px] text-[#029CB1] border-[#029CB1]/30">PATRONAL</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-xs">Charge</TableHead>
                          <TableHead className="text-xs text-right">Base / Taux</TableHead>
                          <TableHead className="text-xs text-right">Montant</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="text-sm">CNPS Employeur</TableCell>
                          <TableCell className="text-right text-sm tabular-nums text-muted-foreground">{formatFcfa(result.cnpsBase)} @{formatPercent(params.CNPS_EMPLOYEUR, 1)}</TableCell>
                          <TableCell className="text-right text-sm font-medium tabular-nums">{formatFcfa(result.cnpsEmployer)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="text-sm">Prestations familiales</TableCell>
                          <TableCell className="text-right text-sm tabular-nums text-muted-foreground">{formatFcfa(params.BASE_PF_AT_MATERNITE)} @{formatPercent(params.PF_RATE, 1)}</TableCell>
                          <TableCell className="text-right text-sm font-medium tabular-nums">{formatFcfa(result.familyAllowances)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="text-sm">Accident du travail</TableCell>
                          <TableCell className="text-right text-sm tabular-nums text-muted-foreground">{formatFcfa(params.BASE_PF_AT_MATERNITE)} @{formatPercent(customAtRate ? parseFloat(customAtRate) / 100 : params.AT_RATE_DEFAULT, 1)}</TableCell>
                          <TableCell className="text-right text-sm font-medium tabular-nums">{formatFcfa(result.workAccident)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="text-sm">Assurance maternité</TableCell>
                          <TableCell className="text-right text-sm tabular-nums text-muted-foreground">{formatFcfa(params.BASE_PF_AT_MATERNITE)} @{formatPercent(params.MATERNITY_RATE, 2)}</TableCell>
                          <TableCell className="text-right text-sm font-medium tabular-nums">{formatFcfa(result.maternityInsurance)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="text-sm">CMU Employeur</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">—</TableCell>
                          <TableCell className="text-right text-sm font-medium tabular-nums">{formatFcfa(result.cmuEmployer)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="text-sm">IS Employeur local</TableCell>
                          <TableCell className="text-right text-sm tabular-nums text-muted-foreground">{formatFcfa(result.grossTaxable)} @{formatPercent(params.IS_EMPLOYEUR_LOCAL_RATE, 1)}</TableCell>
                          <TableCell className="text-right text-sm font-medium tabular-nums">{formatFcfa(result.isLocalEmployer)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="text-sm">Taxe apprentissage</TableCell>
                          <TableCell className="text-right text-sm tabular-nums text-muted-foreground">{formatFcfa(result.grossTaxable)} @{formatPercent(params.APPRENTISSAGE_RATE, 1)}</TableCell>
                          <TableCell className="text-right text-sm font-medium tabular-nums">{formatFcfa(result.apprenticeshipTax)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="text-sm">FPC mensuelle</TableCell>
                          <TableCell className="text-right text-sm tabular-nums text-muted-foreground">{formatFcfa(result.grossTaxable)} @{formatPercent(params.FPC_MENSUELLE_RATE, 1)}</TableCell>
                          <TableCell className="text-right text-sm font-medium tabular-nums">{formatFcfa(result.fpcMonthly)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="text-sm">FPC fin d&apos;année</TableCell>
                          <TableCell className="text-right text-sm tabular-nums text-muted-foreground">{formatFcfa(result.grossTaxable)} @{formatPercent(params.FPC_FIN_ANNEE_RATE, 1)}</TableCell>
                          <TableCell className="text-right text-sm font-medium tabular-nums">{formatFcfa(result.fpcEndOfYear)}</TableCell>
                        </TableRow>
                      </TableBody>
                      <TableFooter>
                        <TableRow className="bg-[#029CB1]/5">
                          <TableCell className="text-sm font-bold" colSpan={2}>Total Charges Patronales</TableCell>
                          <TableCell className="text-right text-sm font-bold tabular-nums" style={{ color: '#029CB1' }}>
                            {formatFcfa(result.totalEmployerCharges)}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </CardContent>
                </Card>

                {/* ITS Detail (expandable) */}
                <Card className="animate-fade-in-up stagger-4 py-0 gap-0 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setItsExpanded(!itsExpanded)}
                    className="flex w-full items-center justify-between px-4 pt-4 pb-3 text-left hover:bg-muted/30 transition-colors"
                  >
                    <CardTitle className="text-sm font-semibold flex items-center gap-2" style={{ color: '#362981' }}>
                      <TrendingUp className="size-4" />
                      Détail ITS (Impôt sur Traitements et Salaires)
                      <Badge variant="outline" className="text-[10px]">
                        {formatFcfa(result.its)}
                      </Badge>
                    </CardTitle>
                    {itsExpanded ? (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-4 text-muted-foreground" />
                    )}
                  </button>
                  {itsExpanded && (
                    <CardContent className="px-4 pb-4 pt-0">
                      <div className="space-y-2 border-t pt-3">
                        {/* Visual bar */}
                        <div className="h-4 w-full rounded-full overflow-hidden flex bg-muted/60">
                          {itsDetails.map((d, i) => {
                            const maxVal = itsBrackets[itsBrackets.length - 1].upperBound
                            const width = Math.min(100, (d.taxableBase / Math.max(result.grossTaxable, 1)) * 100)
                            const colors = ['#362981', '#029CB1', '#009446', '#f59e0b', '#ef4444', '#7c3aed']
                            return (
                              <div
                                key={i}
                                className="h-full transition-all duration-500"
                                style={{
                                  width: `${width}%`,
                                  backgroundColor: colors[i % colors.length],
                                  opacity: 0.8,
                                }}
                                title={`${d.label}: ${formatFcfa(d.amount)} (${formatPercent(d.rate, 0)})`}
                              />
                            )
                          })}
                        </div>
                        {/* Legend */}
                        <div className="space-y-1.5">
                          {itsDetails.map((d, i) => {
                            const colors = ['#362981', '#029CB1', '#009446', '#f59e0b', '#ef4444', '#7c3aed']
                            return (
                              <div key={i} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="size-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: colors[i % colors.length] }}
                                  />
                                  <span className="text-muted-foreground">{d.label}</span>
                                </div>
                                <div className="flex items-center gap-3 tabular-nums">
                                  <span className="text-xs text-muted-foreground">{formatPercent(d.rate, 0)}</span>
                                  <span className="font-medium w-28 text-right">{formatFcfa(d.amount)}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        {/* Empty brackets */}
                        {itsBrackets
                          .filter(b => {
                            const taxableBase = Math.max(0, Math.min(result.grossTaxable, b.upperBound) - b.lowerBound)
                            return taxableBase === 0
                          })
                          .map((b, i) => (
                            <div key={`empty-${i}`} className="flex items-center justify-between text-sm text-muted-foreground/50">
                              <div className="flex items-center gap-2">
                                <div className="size-2.5 rounded-full bg-muted shrink-0" />
                                <span>{b.label}</span>
                              </div>
                              <span className="tabular-nums text-xs">0 FCFA (0%)</span>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* Copy button */}
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
                    {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    {copied ? 'Copié !' : 'Copier les résultats'}
                  </Button>
                </div>
              </>
            ) : (
              /* Empty state */
              <Card className="py-0 gap-0">
                <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div
                    className="mb-4 flex size-16 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: '#36298110' }}
                  >
                    <Calculator className="size-8" style={{ color: '#362981' }} />
                  </div>
                  <h3 className="text-base font-semibold mb-1">Aucun calcul effectué</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Remplissez les informations employé et le profil salarial, puis cliquez sur
                    <span className="font-semibold" style={{ color: '#009446' }}> Calculer</span> pour voir les résultats.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Mobile Sticky Buttons */}
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm p-3 lg:hidden">
          <div className="flex gap-2 max-w-lg mx-auto">
            <Button
              onClick={handleCalculate}
              disabled={calculating}
              className="flex-1 h-11 font-semibold"
              style={{ backgroundColor: '#009446' }}
            >
              {calculating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Calculator className="size-4" />
              )}
              {calculating ? 'Calcul...' : 'Calculer'}
            </Button>
            <Button variant="outline" onClick={handleReset} className="h-11 px-4">
              <RotateCcw className="size-4" />
            </Button>
          </div>
        </div>

        {/* Bottom spacing for mobile sticky buttons */}
        <div className="h-20 lg:hidden" />
      </div>
    </TooltipProvider>
  )
}