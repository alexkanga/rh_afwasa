// ============ APP IDENTITY ============
export const APP_NAME = 'RH-AFWASA'
export const ORG_FULL_NAME = 'Association Africaine de l\'Eau et de l\'Assainissement'

// ============ BRAND COLORS ============
export const COLORS = {
  primary: '#362981',    // Violet AFWASA
  secondary: '#009446',  // Vert
  tertiary: '#029CB1',   // Teal
  accent: '#C7FFEE',     // Aqua
} as const

// ============ EMPLOYEE STATUSES ============
export const EMPLOYEE_STATUSES = [
  'Actif', 'Licencié', 'Suspendu', 'Démissionnaire', 'Retraité', 'Fin de contrat'
] as const

// ============ CONTRACT TYPES ============
export const CONTRACT_TYPES = [
  'CDI', 'CDD', 'Stage', 'Consultant', 'Prestataire'
] as const

// ============ MARITAL STATUSES ============
export const MARITAL_STATUSES = [
  'Célibataire', 'Marié(e)', 'Divorcé(e)', 'Veuf(ve)'
] as const

// ============ DEPARTURE REASONS ============
export const DEPARTURE_REASONS = [
  'Démission', 'Licenciement', 'Retraite', 'Fin de contrat', 'Décès', 'Autre'
] as const

// ============ PAYROLL PERIOD STATUSES ============
export const PERIOD_STATUSES = [
  'Brouillon', 'En cours', 'Validé', 'Clôturé'
] as const

// ============ PAYROLL LINE STATUSES ============
export const LINE_STATUSES = [
  'Calculé', 'Validé', 'Modifié'
] as const

// ============ CONTROL STATUSES ============
export const CONTROL_STATUSES = [
  'OK', 'Erreur', 'Profil paie à compléter'
] as const

// ============ WORK LOCATIONS ============
export const WORK_LOCATIONS = ['Siège', 'Annexe'] as const

// ============ IGR PARTS ============
export const IGR_PARTS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as const

// ============ DEFAULT PAYROLL PARAMETERS (CI) ============
export const DEFAULT_PARAMS: Record<string, { value: number; unit: string; description: string; source: string }> = {
  CNPS_SALARIE:            { value: 0.063,  unit: '%',    description: 'Retraite salarié',                   source: 'CNPS' },
  CNPS_EMPLOYEUR:          { value: 0.077,  unit: '%',    description: 'Retraite employeur',                 source: 'CNPS' },
  PLAFOND_CNPS_RETRAITE:   { value: 3375000, unit: 'FCFA', description: 'Plafond mensuel retraite',           source: 'CNPS' },
  BASE_PF_AT_MATERNITE:    { value: 75000,  unit: 'FCFA', description: 'Base PF/AT/Maternité',               source: 'CNPS' },
  PF_RATE:                 { value: 0.05,   unit: '%',    description: 'Prestations familiales',              source: 'CNPS' },
  MATERNITY_RATE:          { value: 0.0075, unit: '%',    description: 'Assurance maternité',                 source: 'CNPS' },
  AT_RATE_DEFAULT:         { value: 0.02,   unit: '%',    description: 'Accident du travail par défaut',      source: 'CNPS' },
  TRANSPORT_EXEMPT_LIMIT:  { value: 30000,  unit: 'FCFA', description: 'Indemnité transport non imposable',  source: 'Entreprise' },
  CMU_PER_PERSON:          { value: 1000,   unit: 'FCFA', description: 'Cotisation CMU totale par personne',  source: 'CNPS' },
  CMU_EMPLOYEE_SHARE:      { value: 0.5,    unit: '%',    description: 'Part salarié de la CMU',             source: 'CNPS' },
  CMU_EMPLOYER_SHARE:      { value: 0.5,    unit: '%',    description: 'Part employeur de la CMU',           source: 'CNPS' },
  IS_EMPLOYEUR_LOCAL_RATE: { value: 0.012,  unit: '%',    description: 'Contribution employeur local',        source: 'Entreprise' },
  APPRENTISSAGE_RATE:      { value: 0.004,  unit: '%',    description: "Taxe d'apprentissage",                source: 'FDFP' },
  FPC_MENSUELLE_RATE:      { value: 0.006,  unit: '%',    description: 'FPC mensuelle',                      source: 'FDFP' },
  FPC_FIN_ANNEE_RATE:      { value: 0.006,  unit: '%',    description: 'FPC fin d\'année',                    source: 'FDFP' },
}

// ============ DEFAULT ITS BRACKETS (CI 2025) ============
export const DEFAULT_ITS_BRACKETS = [
  { lowerBound: 0,        upperBound: 75000,    rate: 0,    label: '0 à 75 000' },
  { lowerBound: 75000,    upperBound: 240000,   rate: 0.16, label: '75 001 à 240 000' },
  { lowerBound: 240000,   upperBound: 800000,   rate: 0.21, label: '240 001 à 800 000' },
  { lowerBound: 800000,   upperBound: 2400000,  rate: 0.24, label: '800 001 à 2 400 000' },
  { lowerBound: 2400000,  upperBound: 8000000,  rate: 0.28, label: '2 400 001 à 8 000 000' },
  { lowerBound: 8000000,  upperBound: 999999999, rate: 0.32, label: 'Au-delà de 8 000 000' },
] as const

// ============ DEFAULT RICF SCALE ============
export const DEFAULT_RICF_SCALE = [
  { igrParts: 1,   monthlyAmount: 0 },
  { igrParts: 1.5, monthlyAmount: 5500 },
  { igrParts: 2,   monthlyAmount: 11000 },
  { igrParts: 2.5, monthlyAmount: 16500 },
  { igrParts: 3,   monthlyAmount: 22000 },
  { igrParts: 3.5, monthlyAmount: 27500 },
  { igrParts: 4,   monthlyAmount: 33000 },
  { igrParts: 4.5, monthlyAmount: 38500 },
  { igrParts: 5,   monthlyAmount: 44000 },
] as const