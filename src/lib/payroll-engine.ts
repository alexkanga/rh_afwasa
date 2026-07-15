// ============ PURE PAYROLL CALCULATION ENGINE ============
// No DB access — same code for batch processing and simulator

import { DEFAULT_PARAMS, DEFAULT_ITS_BRACKETS, DEFAULT_RICF_SCALE } from './constants'

// ============ TYPES ============

export interface PayrollParams {
  CNPS_SALARIE: number
  CNPS_EMPLOYEUR: number
  PLAFOND_CNPS_RETRAITE: number
  BASE_PF_AT_MATERNITE: number
  PF_RATE: number
  MATERNITY_RATE: number
  AT_RATE_DEFAULT: number
  TRANSPORT_EXEMPT_LIMIT: number
  CMU_PER_PERSON: number
  CMU_EMPLOYEE_SHARE: number
  CMU_EMPLOYER_SHARE: number
  IS_EMPLOYEUR_LOCAL_RATE: number
  APPRENTISSAGE_RATE: number
  FPC_MENSUELLE_RATE: number
  FPC_FIN_ANNEE_RATE: number
}

export interface ItsBracket {
  lowerBound: number
  upperBound: number
  rate: number
  label: string
}

export interface RicfEntry {
  igrParts: number
  monthlyAmount: number
}

export interface SalaryProfileInput {
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
}

export interface EmployeeInput {
  hireDate: Date | null
  matricule?: string
}

export interface PayrollResult {
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
  controlStatus: string
  calculationSnapshot: string
}

// ============ HELPERS ============

function safeRound(value: number): number {
  return Math.round(value) || 0
}

function getDefaultParams(): PayrollParams {
  const result: Record<string, number> = {}
  for (const [code, def] of Object.entries(DEFAULT_PARAMS)) {
    result[code] = def.value
  }
  return result as unknown as PayrollParams
}

function getRicfAmount(igrParts: number, ricfScale: RicfEntry[]): number {
  const exact = ricfScale.find(r => r.igrParts === igrParts)
  if (exact) return exact.monthlyAmount
  // Interpolate for fractional parts
  const sorted = [...ricfScale].sort((a, b) => a.igrParts - b.igrParts)
  for (let i = 0; i < sorted.length - 1; i++) {
    if (igrParts > sorted[i].igrParts && igrParts < sorted[i + 1].igrParts) {
      return sorted[i].monthlyAmount
    }
  }
  return 0
}

function calculateITS(grossTaxable: number, brackets: ItsBracket[]): number {
  if (grossTaxable <= 0) return 0
  let tax = 0
  for (const b of brackets) {
    const taxableInBracket = Math.max(0, Math.min(grossTaxable, b.upperBound) - b.lowerBound)
    tax += taxableInBracket * b.rate
  }
  return safeRound(tax)
}

// ============ MAIN CALCULATION ============

export function calculatePayroll(
  profile: SalaryProfileInput,
  employee: EmployeeInput,
  params: PayrollParams = getDefaultParams(),
  itsBrackets: ItsBracket[] = DEFAULT_ITS_BRACKETS as unknown as ItsBracket[],
  ricfScale: RicfEntry[] = DEFAULT_RICF_SCALE as unknown as RicfEntry[],
  referenceDate: Date = new Date()
): PayrollResult {
  const snap: Record<string, number | string> = {}

  // 1. Seniority
  const seniorityYears = employee.hireDate
    ? Math.floor((referenceDate.getTime() - new Date(employee.hireDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : 0
  const seniorityRate = seniorityYears < 2 ? 0 : Math.min(seniorityYears, 25) / 100
  const seniorityBonus = safeRound(profile.baseSalary * seniorityRate)

  snap.seniorityYears = seniorityYears
  snap.seniorityRate = seniorityRate

  // 2. Transport split
  const transportExempt = Math.min(profile.transportAllowance, params.TRANSPORT_EXEMPT_LIMIT)
  const transportTaxable = Math.max(0, profile.transportAllowance - params.TRANSPORT_EXEMPT_LIMIT)

  // 3. Gross taxable (Brut imposable)
  const grossTaxable = safeRound(
    profile.baseSalary +
    profile.sursalary +
    seniorityBonus +
    transportTaxable +
    profile.taxablePrimes +
    profile.taxableBenefits
  )

  // 4. CNPS base (plafond)
  const cnpsBase = profile.specificCnpsBase != null
    ? Math.min(profile.specificCnpsBase, params.PLAFOND_CNPS_RETRAITE)
    : Math.min(grossTaxable, params.PLAFOND_CNPS_RETRAITE)

  // 5. Employee deductions
  const cnpsEmployee = safeRound(cnpsBase * params.CNPS_SALARIE)
  const cmuEmployee = grossTaxable > 0
    ? safeRound(params.CMU_PER_PERSON * profile.cmuEmployeeCount * params.CMU_EMPLOYEE_SHARE)
    : 0
  const ricf = getRicfAmount(profile.igrParts, ricfScale)
  const its = calculateITS(grossTaxable, itsBrackets)
  const otherDeductions = 0
  const totalDeductions = cnpsEmployee + cmuEmployee + ricf + its + otherDeductions

  // 6. Employer charges
  const cnpsEmployer = safeRound(cnpsBase * params.CNPS_EMPLOYEUR)
  const pfBase = Math.min(grossTaxable, params.BASE_PF_AT_MATERNITE)
  const familyAllowances = grossTaxable > 0 ? safeRound(params.BASE_PF_AT_MATERNITE * params.PF_RATE) : 0
  const atRate = profile.atRate ?? params.AT_RATE_DEFAULT
  const workAccident = grossTaxable > 0 ? safeRound(params.BASE_PF_AT_MATERNITE * atRate) : 0
  const maternityInsurance = grossTaxable > 0 ? safeRound(params.BASE_PF_AT_MATERNITE * params.MATERNITY_RATE) : 0
  const cmuEmployer = grossTaxable > 0
    ? safeRound(params.CMU_PER_PERSON * profile.cmuEmployerCount * params.CMU_EMPLOYER_SHARE)
    : 0
  const isLocalEmployer = safeRound(grossTaxable * params.IS_EMPLOYEUR_LOCAL_RATE)
  const apprenticeshipTax = safeRound(grossTaxable * params.APPRENTISSAGE_RATE)
  const fpcMonthly = safeRound(grossTaxable * params.FPC_MENSUELLE_RATE)
  const fpcEndOfYear = safeRound(grossTaxable * params.FPC_FIN_ANNEE_RATE)
  const totalEmployerCharges = cnpsEmployer + familyAllowances + workAccident + maternityInsurance + cmuEmployer + isLocalEmployer + apprenticeshipTax + fpcMonthly + fpcEndOfYear

  // 7. Totals
  const nonTaxableGains = transportExempt + profile.nonTaxableAllowances
  const totalGross = grossTaxable + nonTaxableGains
  const netPayable = totalGross - totalDeductions
  const totalEmployerCost = totalGross + totalEmployerCharges

  // 8. Control status
  let controlStatus = 'OK'
  if (profile.baseSalary === 0 && profile.sursalary === 0) {
    controlStatus = 'Profil paie à compléter'
  }

  const calculationSnapshot = JSON.stringify({
    params: Object.entries(params).map(([k, v]) => ({ code: k, value: v })),
    seniorityYears,
    seniorityRate,
    grossTaxable,
    cnpsBase,
    itsBrackets,
    ricfAmount: ricf,
  })

  return {
    seniorityYears,
    seniorityRate,
    seniorityBonus,
    baseSalary: profile.baseSalary,
    sursalary: profile.sursalary,
    transportExempt,
    transportTaxable,
    taxablePrimes: profile.taxablePrimes,
    taxableBenefits: profile.taxableBenefits,
    nonTaxableGains,
    grossTaxable,
    cnpsBase,
    cnpsEmployee,
    cmuEmployee,
    ricf,
    its,
    otherDeductions,
    totalDeductions,
    cnpsEmployer,
    familyAllowances,
    workAccident,
    maternityInsurance,
    cmuEmployer,
    isLocalEmployer,
    apprenticeshipTax,
    fpcMonthly,
    fpcEndOfYear,
    totalEmployerCharges,
    totalGross,
    netPayable,
    totalEmployerCost,
    controlStatus,
    calculationSnapshot,
  }
}