# CAHIER DES CHARGES COMPLET
## Système de Gestion des Ressources Humaines et de la Paie — AFWASA

**Référence** : RH-AFWASA v3.0 — Reconstruction totale
**Date** : Juillet 2025
**Statut** : Approuvé pour reconstruction
**Auteur** : Direction des Ressources Humaines — AFWASA

---

## TABLE DES MATIÈRES

1. [Présentation générale du projet](#1-présentation-générale-du-projet)
2. [Architecture d'ensemble](#2-architecture-densemble)
3. [Modèle de données — Schéma relationnel complet](#3-modèle-de-données--schéma-relationnel-complet)
4. [Module 1 — Structure organisationnelle](#4-module-1--structure-organisationnelle)
5. [Module 2 — Gestion des employés](#5-module-2--gestion-des-employés)
6. [Module 3 — Gestion des contrats](#6-module-3--gestion-des-contrats)
7. [Module 4 — Profils salariaux (VERSIONNÉS)](#7-module-4--profils-salariaux-versionnés)
8. [Module 5 — Paramètres fiscaux et sociaux (VERSIONNÉS)](#8-module-5--paramètres-fiscaux-et-sociaux-versionnés)
9. [Module 6 — Moteur de calcul de la paie](#9-module-6--moteur-de-calcul-de-la-paie)
10. [Module 7 — Périodes et traitement de la paie](#10-module-7--périodes-et-traitement-de-la-paie)
11. [Module 8 — Bulletins de paie (PayrollLines)](#11-module-8--bulletins-de-paie-payrolllines)
12. [Module 9 — ARCHIVAGE — Le chaînage Profils→Bulletins→Archives](#12-module-9--archivage--le-chaînage-profilsbulletinsarchives)
13. [Module 10 — Gestion des départs](#13-module-10--gestion-des-départs)
14. [Module 11 — Tableau de bord et analytique](#14-module-11--tableau-de-bord-et-analytique)
15. [Module 12 — Import/Export](#15-module-12--importexport)
16. [Module 13 — Traçabilité et audit](#16-module-13--traçabilité-et-audit)
17. [Module 14 — Authentification et permissions](#17-module-14--authentification-et-permissions)
18. [Module 15 — Notifications](#18-module-15--notifications)
19. [Module 16 — Simulateur de paie](#19-module-16--simulateur-de-paie)
20. [Spécifications UI/UX](#20-spécifications-uiux)
21. [Règles métier critiques](#21-règles-métier-critiques)
22. [Scénarios de test fonctionnels](#22-scénarios-de-test-fonctionnels)

---

## 1. PRÉSENTATION GÉNÉRALE DU PROJET

### 1.1 Contexte

AFWASA (Agence Autonome des Eaux et de l'Assainissement) gère un effectif de plusieurs centaines d'agents répartis entre directions et départements. La gestion de la paie nécessite un système fiable, traçable et conforme à la législation ivoirienne (CNPS, ITS, RICF, CMU, etc.).

L'application RH-AFWASA est un système interne de gestion des ressources humaines et de la paie, accessible via navigateur web. Elle couvre l'intégralité du cycle de vie d'un employé, de son recrutement à son départ, en passant par la gestion de ses contrats, profils salariaux, traitement de paie mensuel, et archivage des bulletins.

### 1.2 Objectifs de la reconstruction v3.0

La reconstruction totale vise à corriger les problèmes fondamentaux de l'architecture actuelle, en particulier :

- **Chaînage Profils Salariaux → Paie → Bulletins** : Le lien entre ces trois entités doit être strictement versionné et traçable. Un changement de profil salarial doit déclencher automatiquement l'archivage des bulletins existants basés sur l'ancien profil et la régénération des bulletins pour les périodes futures avec le nouveau profil.
- **Archivage automatique** : Toute modification d'un profil salarial actif doit archiver les anciens bulletins de paie impactés et les anciens profils, avec traçabilité complète du delta (avant/après).
- **Stabilité et qualité** : Éliminer les erreurs runtime (TDZ, null reference, NaN), renforcer la null-safety, améliorer la séparation frontend/backend.
- **Expérience utilisateur** : Navigation fluide, feedback en temps réel, responsive design, mode sombre.

### 1.3 Périmètre fonctionnel

| Domaine | Modules inclus |
|---------|---------------|
| **Organisation** | Directions, Départements |
| **Employés** | CRUD complet, fiche détaillée, photo, complétude |
| **Contrats** | CDI, CDD, Stage, Consultation — suivi expiration |
| **Profils salariaux** | Versionnés avec historique, archivage automatique |
| **Paie** | Périodes, traitement batch, recalcul, validation, clôture |
| **Bulletins** | Génération, visualisation, PDF, archivage versionné |
| **Paramètres fiscaux** | CNPS, ITS, RICF, CMU, AT — tous versionnés |
| **Analytique** | Dashboard, graphiques, comparaisons inter-périodes |
| **Import/Export** | CSV employés/profils, PDF bulletins, export analytique |
| **Audit** | Journal complet de toutes les opérations sensibles |
| **Auth** | Login, rôles, permissions granulaires |
| **Notifications** | Alertes contrats, données incomplètes, etc. |
| **Simulateur** | Simulation de paie hors ligne (sans persistance) |

### 1.4 Contraintes techniques

- **Framework** : Next.js 16 (App Router) + TypeScript 5
- **Base de données** : PostgreSQL (Neon Cloud) via Prisma ORM
- **UI** : Tailwind CSS 4 + shadcn/ui (New York style) + Lucide Icons
- **State** : Zustand (client) + TanStack Query (serveur)
- **Animations** : Framer Motion
- **Charting** : Recharts
- **Auth** : JWT custom (header Authorization: Bearer)
- **Runtime** : Bun
- **Déploiement** : Vercel

### 1.5 Identité visuelle

| Élément | Valeur |
|---------|--------|
| Primaire | `#362981` (Violet AFWASA) |
| Secondaire | `#009446` (Vert) |
| Tertiaire | `#029CB1` (Teal) |
| Accent | `#C7FFEE` (Aqua) |
| Police système | Inter / system-ui |
| Montants | Format FCFA avec séparateurs de milliers |

---

## 2. ARCHITECTURE D'ENSEMBLE

### 2.1 Architecture applicative

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                         │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  ┌───────────┐  │
│  │ Zustand  │  │ TanStack │  │ shadcn/ui │  │ Framer    │  │
│  │ Store    │  │ Query    │  │ Components│  │ Motion    │  │
│  └────┬─────┘  └────┬─────┘  └───────────┘  └───────────┘  │
│       │              │                                       │
│       └──────┬───────┘                                       │
│              │ fetch (apiFetch with JWT)                     │
└──────────────┼──────────────────────────────────────────────┘
               │
┌──────────────┼──────────────────────────────────────────────┐
│              ▼     NEXT.JS 16 APP ROUTER                    │
│  ┌───────────────────────────────────────────────────┐      │
│  │           API Routes (src/app/api/**)             │      │
│  │  ┌──────────┐  ┌───────────┐  ┌───────────────┐  │      │
│  │  │  Auth    │  │  CRUD     │  │  Payroll      │  │      │
│  │  │  Guard   │  │  Routes   │  │  Engine       │  │      │
│  │  └──────────┘  └───────────┘  └───────────────┘  │      │
│  └───────────────────────┬───────────────────────────┘      │
│                          │                                   │
│  ┌───────────────────────▼───────────────────────────┐      │
│  │           SERVICE LAYER (lib/)                    │      │
│  │  ┌────────────┐  ┌──────────────┐  ┌──────────┐  │      │
│  │  │ payroll-   │  │ payroll-     │  │ api-     │  │      │
│  │  │ engine.ts  │  │ line-utils   │  │ middle-  │  │      │
│  │  │ (pure fns) │  │ .ts (archive)│  │ ware.ts  │  │      │
│  │  └────────────┘  └──────────────┘  └──────────┘  │      │
│  └───────────────────────┬───────────────────────────┘      │
│                          │ Prisma Client                     │
│  ┌───────────────────────▼───────────────────────────┐      │
│  │              PRISMA ORM                           │      │
│  └───────────────────────┬───────────────────────────┘      │
│                          │                                   │
│  ┌───────────────────────▼───────────────────────────┐      │
│  │           PostgreSQL (Neon)                        │      │
│  └───────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Principes architecturaux

1. **API-first** : Toute donnée passe par les routes API (`/api/**`). Aucun accès direct à la DB côté client.
2. **Moteur de paie pur** : `payroll-engine.ts` est un ensemble de fonctions pures sans dépendance DB. Les mêmes fonctions servent au traitement batch ET au simulateur.
3. **Versionning systématique** : Tout ce qui impacte le calcul de paie (profils salariaux, paramètres fiscaux, tranches ITS, barème RICF) est versionné avec `effectiveFrom`/`effectiveTo`.
4. **Archivage non destructif** : Les bulletins de paie ne sont jamais supprimés. Les modifications créent de nouveaux archivages (PayslipArchive).
5. **Traçabilité audit** : Toute action sensible (CRUD employé, création/modification profil, traitement paie, validation, export) est journalisée dans AuditLog.
6. **Lazy loading des pages** : Chaque page principale est chargée dynamiquement via `React.lazy()` + `Suspense` pour optimiser le chargement initial.

### 2.3 Arborescence des fichiers (cible)

```
src/
├── app/
│   ├── layout.tsx                    # Layout racine (providers, sidebar)
│   ├── page.tsx                      # Route unique — SPA client-side routing
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts
│       │   └── me/route.ts
│       ├── employees/
│       │   ├── route.ts              # GET (liste) + POST (créer)
│       │   └── [id]/
│       │       ├── route.ts          # GET + PUT + DELETE
│       │       └── photo/route.ts    # POST (upload) + DELETE
│       ├── contracts/
│       │   ├── route.ts
│       │   ├── [id]/route.ts
│       │   └── expiring/route.ts
│       ├── salary-profiles/          # ★ MODULE CRITIQUE
│       │   ├── route.ts              # GET (liste) + POST (nouvelle version)
│       │   ├── [id]/
│       │   │   ├── route.ts          # GET + PUT (mettre à jour)
│       │   │   └── history/route.ts  # GET (historique des modifications)
│       │   ├── employee/[employeeId]/route.ts
│       │   └── usage/route.ts
│       ├── parameters/               # ★ VERSIONNÉS
│       │   ├── route.ts
│       │   ├── [id]/route.ts
│       │   ├── its-brackets/route.ts + [id]/route.ts
│       │   ├── ricf-scale/route.ts + [id]/route.ts
│       │   └── seed-defaults/route.ts
│       ├── payroll/                  # ★ MODULE CRITIQUE
│       │   ├── periods/route.ts      # GET + POST (créer + auto-générer)
│       │   ├── periods/[id]/route.ts
│       │   ├── periods/[id]/lines/route.ts
│       │   ├── lines/route.ts
│       │   ├── lines/[id]/route.ts
│       │   ├── lines/[id]/recalculate/route.ts
│       │   ├── lines/[id]/notes/route.ts
│       │   ├── lines/[id]/restore-version/route.ts
│       │   ├── process/route.ts      # POST (traitement batch)
│       │   ├── process-single/route.ts
│       │   ├── validate-period/route.ts
│       │   ├── bulk-validate/route.ts
│       │   ├── simulate/route.ts
│       │   ├── compare/route.ts
│       │   └── impact-analysis/route.ts
│       ├── payslip-archives/         # ★ ARCHIVAGE
│       │   ├── route.ts              # GET (liste archives)
│       │   └── [id]/route.ts
│       ├── export/
│       │   ├── employees/route.ts
│       │   ├── employee-pdf/[employeeId]/route.ts
│       │   ├── payslip-pdf/[lineId]/route.ts
│       │   ├── payslips/route.ts
│       │   └── payslips/bulk/route.ts
│       ├── import/
│       │   ├── employees/route.ts
│       │   ├── salary-profiles/route.ts
│       │   └── history/route.ts
│       ├── departures/route.ts + [id]/route.ts
│       ├── directions/route.ts
│       ├── departments/route.ts
│       ├── notifications/route.ts
│       ├── analytics/route.ts
│       ├── dashboard/stats/route.ts
│       ├── dashboard/charts/route.ts
│       └── audit-logs/route.ts
├── components/
│   ├── ui/                           # shadcn/ui (42+ composants)
│   ├── shared/                       # Composants partagés
│   │   ├── EmptyState.tsx
│   │   ├── PageHeader.tsx
│   │   └── StatusBadge.tsx
│   ├── layout/                       # Sidebar, Header, Footer
│   └── pages/                        # ★ PAGES (lazy-loaded)
│       ├── LoginPage.tsx
│       ├── DashboardPage.tsx
│       ├── EmployeesPage.tsx
│       ├── EmployeeDetailPage.tsx
│       ├── ContractsPage.tsx
│       ├── SalaryProfilesPage.tsx
│       ├── PayrollPage.tsx
│       ├── PayslipDetailPage.tsx
│       ├── PayrollComparisonPage.tsx
│       ├── ParametersPage.tsx
│       ├── DeparturesPage.tsx
│       ├── AnalyticsPage.tsx
│       ├── ImportExportPage.tsx
│       ├── AuditLogsPage.tsx
│       ├── OrganizationPage.tsx
│       ├── SimulatorPage.tsx
│       └── SettingsPage.tsx
├── lib/
│   ├── db.ts                         # Instance Prisma Client
│   ├── api.ts                        # Client API (apiFetch + toutes les API)
│   ├── api-middleware.ts              # Auth, permissions, pagination, helpers
│   ├── payroll-engine.ts              # ★ Moteur de calcul pur
│   ├── payroll-line-utils.ts          # ★ Snapshots, archivage, helpers
│   ├── payslip-template.ts           # Template HTML pour PDF bulletin
│   ├── html-utils.ts                 # Utilitaires HTML (escape XSS)
│   ├── format.ts                     # formatFcfa(), formatDate()
│   ├── completeness.ts               # Calcul complétude fiche employé
│   └── utils.ts                      # cn(), etc.
├── stores/
│   └── app-store.ts                  # Zustand store (navigation, user, selections)
├── hooks/
│   ├── usePermissions.ts
│   └── ...
└── types/
    └── (shared types)
```

---

## 3. MODÈLE DE DONNÉES — SCHÉMA RELATIONNEL COMPLET

### 3.1 Diagramme Entité-Relation (textuel)

```
Direction 1──N Department
Direction 1──N Employee
Department 1──N Employee

Role 1──N User
User 0..1──1 Employee

Employee 1──N Contract
Employee 1──N SalaryProfile (VERSIONNÉ)
Employee 1──N PayrollLine
Employee 1──N Departure
Employee 1──N PayslipArchive

SalaryProfile 1──N PayrollLine

PayrollPeriod 1──N PayrollLine
PayrollLine 1──N PayslipArchive

PayrollParameter (VERSIONNÉ, global)
TaxBracketITS (VERSIONNÉ, global)
RicfScale (VERSIONNÉ, global)

ImportBatch (log)
AuditLog (log)
PerformanceItem (futur)
```

### 3.2 Schéma Prisma complet

#### 3.2.1 Structure organisationnelle

```prisma
model Direction {
  id          String       @id @default(cuid())
  name        String       @unique
  code        String?      @unique
  description String?
  employees   Employee[]
  departments Department[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

model Department {
  id          String    @id @default(cuid())
  name        String
  code        String?
  description String?
  directionId String
  direction   Direction @relation(fields: [directionId], references: [id], onDelete: Restrict)
  employees   Employee[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@unique([name, directionId])
}
```

#### 3.2.2 Authentification et rôles

```prisma
model Role {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  permissions String   @default("[]") // JSON array
  users       User[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String?
  name          String
  roleId        String
  role          Role      @relation(fields: [roleId], references: [id])
  employeeId    String?   @unique
  employee      Employee? @relation(fields: [employeeId], references: [id])
  isActive      Boolean   @default(true)
  lastLogin     DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime @updatedAt
}
```

#### 3.2.3 Employés

```prisma
model Employee {
  id                    String    @id @default(cuid())
  matricule             String    @unique
  lastName              String
  firstName             String
  sex                   String?   // "Homme" | "Femme"
  dateOfBirth           DateTime?
  placeOfBirth          String?
  nationality           String?   @default("IVOIRIENNE")
  idNumber              String?
  maritalStatus         String?   // "Célibataire" | "Marié(e)"
  numberOfChildren      Int       @default(0)
  address               String?
  personalPhone         String?
  email                 String?
  emergencyContact      String?
  emergencyPhone        String?
  currentPosition       String?
  departmentId          String?
  department            Department? @relation(fields: [departmentId], references: [id])
  directionId           String?
  direction             Direction? @relation(fields: [directionId], references: [id])
  workLocation          String?   // "Siège" | "Annexe"
  status                String    @default("Actif") // "Actif" | "Licencié" | "Démissionné" | "Retraité"
  hireDate              DateTime?
  cnpsNumber            String?
  photoUrl              String?
  user                  User?
  contracts             Contract[]
  salaryProfiles        SalaryProfile[]
  payrollLines          PayrollLine[]
  departures            Departure[]
  performanceItems      PerformanceItem[]
  payslipArchives       PayslipArchive[]
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@index([directionId])
  @@index([departmentId])
  @@index([status])
}
```

#### 3.2.4 Contrats

```prisma
model Contract {
  id            String   @id @default(cuid())
  employeeId    String
  employee      Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  type          String   // "CDI" | "CDD" | "Stage" | "Consultation"
  startDate     DateTime
  endDate       DateTime? // Null = CDI (indéterminé)
  status        String   @default("Actif") // "Actif" | "Expired" | "Terminated"
  notes         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([employeeId])
  @@index([status])
  @@index([endDate])
  @@index([status, endDate])
}
```

#### ★ 3.2.5 Profils salariaux (VERSIONNÉS) — MODULE CRITIQUE

```prisma
model SalaryProfile {
  id                  String   @id @default(cuid())
  employeeId          String
  employee            Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  baseSalary          Int      @default(0)       // Salaire de base brut (FCFA)
  sursalary           Int      @default(0)       // Sursalaire (FCFA)
  igrParts            Float    @default(1)        // Parts IGR (1, 1.5, 2, 2.5, 3...)
  cmuEmployeeCount    Int      @default(1)        // Nombre personnes CMU cotisé employé
  cmuEmployerCount    Int      @default(1)        // Nombre personnes CMU cotisé employeur
  transportAllowance  Int      @default(0)       // Indemnité de transport totale (FCFA)
  taxablePrimes       Int      @default(0)       // Primes imposables (FCFA)
  taxableBenefits     Int      @default(0)       // Avantages en nature imposables (FCFA)
  nonTaxableAllowances Int     @default(0)       // Indemnités non imposables (FCFA)
  atRate              Float?   // Taux AT personnalisé (null = taux par défaut)
  specificCnpsBase    Int?     // Base CNPS spécifique (null = calcul auto)
  effectiveFrom       DateTime // Date d'effet
  effectiveTo         DateTime? // Date de fin (null = en cours)
  status              String   @default("Actif") // "Actif" | "Historique"
  version             Int      @default(1)        // Numéro de version
  comment             String?  // Commentaire / motif de changement
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@index([employeeId])
  @@index([effectiveFrom])
  payrollLines        PayrollLine[]  // Bulletins basés sur ce profil
}
```

**Règles de versionnement :**
- Un employé n'a qu'**un seul profil actif** (`status = 'Actif'`) à tout moment.
- Lors de la création d'un nouveau profil, l'ancien profil actif est automatiquement basculé en `status = 'Historique'` avec `effectiveTo = jour avant le nouveau effectiveFrom`.
- Chaque profil porte un numéro de `version` incrémental.
- Le champ `effectiveFrom` est obligatoire. Il détermine à partir de quelle date ce profil s'applique.
- Les PayrollLines (bulletins) sont liées à un `salaryProfileId` spécifique, ce qui permet de savoir exactement quel profil a été utilisé pour chaque bulletin.

#### ★ 3.2.6 Paramètres fiscaux et sociaux (VERSIONNÉS)

```prisma
model PayrollParameter {
  id           String   @id @default(cuid())
  code         String   @unique         // Ex: "CNPS_SALARIE", "PLAFOND_CNPS_RETRAITE"
  value        Float                     // Valeur du paramètre
  unit         String?  // "%" | "FCFA" | "jours"
  description  String?
  source       String?  // "CNPS" | "DGI" | "FDFP" | "Entreprise"
  effectiveFrom DateTime
  effectiveTo   DateTime?
  status       String   @default("Actif")
  version      Int      @default(1)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([code])
  @@index([effectiveFrom])
}

model TaxBracketITS {
  id           String   @id @default(cuid())
  lowerBound   Int      // Borne inférieure (FCFA)
  upperBound   Int      // Borne supérieure (999999999 = "au-delà")
  rate         Float    // Taux marginal
  label        String   // Ex: "0 - 65 600"
  effectiveFrom DateTime
  effectiveTo   DateTime?
  order        Int
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([effectiveFrom])
}

model RicfScale {
  id             String   @id @default(cuid())
  igrParts       Float    @unique  // Nombre de parts
  monthlyAmount  Int               // Montant mensuel de réduction (FCFA)
  effectiveFrom  DateTime
  effectiveTo    DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

**Codes de paramètres obligatoires :**

| Code | Description | Valeur par défaut | Unité |
|------|-------------|-------------------|-------|
| `CNPS_SALARIE` | Taux cotisation CNPS employé | 6.3% | % |
| `CNPS_EMPLOYEUR` | Taux cotisation CNPS employeur | 7.7% | % |
| `PLAFOND_CNPS_RETRAITE` | Plafond assiette CNPS retraite | 3 375 000 | FCFA |
| `BASE_PF_AT_MATERNITE` | Base de calcul PF/AT/Maternité | 75 000 | FCFA |
| `PF_RATE` | Taux Prestations Familiales | 5% | % |
| `MATERNITY_RATE` | Taux Assurance Maternité | 0.75% | % |
| `AT_RATE_DEFAULT` | Taux par défaut Accident du Travail | 2% | % |
| `TRANSPORT_EXEMPT_LIMIT` | Plafond exonération transport | 30 000 | FCFA |
| `CMU_PER_PERSON` | Coût CMU par personne | 1 000 | FCFA |
| `CMU_EMPLOYEE_SHARE` | Part employé dans CMU | 50% | % |
| `IS_EMPLOYEUR_LOCAL_RATE` | Taux IS employeur local | 1.2% | % |
| `APPRENTISSAGE_RATE` | Taxe d'apprentissage | 0.4% | % |
| `FPC_MENSUELLE_RATE` | FPC mensuelle | 0.6% | % |
| `FPC_FIN_ANNEE_RATE` | FPC fin d'année | 0.6% | % |

#### 3.2.7 Périodes de paie

```prisma
model PayrollPeriod {
  id            String         @id @default(cuid())
  label         String         // "Janvier 2025"
  startDate     DateTime
  endDate       DateTime
  paymentDate   DateTime
  status        String         @default("Brouillon")
  // Statuts : "Brouillon" → "En cours" → "Validé" → "Clôturé"
  totalGross    Int            @default(0)
  totalNet      Int            @default(0)
  totalCharges  Int            @default(0)
  lineCount     Int            @default(0)
  notes         String?
  payrollLines  PayrollLine[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  @@unique([startDate, endDate])
  @@index([status])
}
```

**Cycle de vie d'une période :**
```
Brouillon → En cours → Validé → Clôturé
   ↑            │          │          │
   │            │          │          └── Irréversible
   │            │          └── Peut revenir à "En cours"
   │            └── Peut être retraité
   └── État initial après création
```

#### ★ 3.2.8 Lignes de paie / Bulletins (PayrollLine)

```prisma
model PayrollLine {
  id                  String        @id @default(cuid())
  periodId            String
  period              PayrollPeriod @relation(fields: [periodId], references: [id], onDelete: Cascade)
  salaryProfileId     String?       // ★ Lien vers le profil utilisé pour ce calcul
  salaryProfile       SalaryProfile? @relation(fields: [salaryProfileId], references: [id])
  employeeId          String
  employee            Employee      @relation(fields: [employeeId], references: [id])
  matricule           String?

  // --- Ancienneté ---
  seniorityYears      Int           @default(0)
  seniorityRate       Float         @default(0)   // 0-25%
  seniorityBonus      Int           @default(0)   // FCFA

  // --- Éléments du brut ---
  baseSalary          Int           @default(0)
  sursalary           Int           @default(0)
  transportExempt     Int           @default(0)   // Part exonérée (≤ 30 000)
  transportTaxable    Int           @default(0)   // Part imposable (> 30 000)
  taxablePrimes       Int           @default(0)
  taxableBenefits     Int           @default(0)
  nonTaxableGains     Int           @default(0)
  grossTaxable        Int           @default(0)   // Assiette ITS

  // --- Déductions employé ---
  cnpsBase            Int           @default(0)
  cnpsEmployee        Int           @default(0)
  cmuEmployee         Int           @default(0)
  ricf                Int           @default(0)   // Réduction IGR charges famille
  its                 Int           @default(0)   // Impôt Traitements et Salaires
  otherDeductions     Int           @default(0)
  totalDeductions     Int           @default(0)

  // --- Charges patronales ---
  cnpsEmployer        Int           @default(0)
  familyAllowances    Int           @default(0)
  workAccident        Int           @default(0)
  maternityInsurance  Int           @default(0)
  cmuEmployer         Int           @default(0)
  isLocalEmployer     Int           @default(0)
  apprenticeshipTax   Int           @default(0)
  fpcMonthly          Int           @default(0)
  fpcEndOfYear        Int           @default(0)
  totalEmployerCharges Int          @default(0)

  // --- Totaux ---
  totalGross          Int           @default(0)
  netPayable          Int           @default(0)
  totalEmployerCost   Int           @default(0)

  // --- Métadonnées ---
  status              String        @default("Calculé") // "Calculé" | "Validé" | "Modifié"
  controlStatus       String?       // "OK" | "Erreur" | "Profil paie à compléter"
  notes               String?       // Notes RH
  calculationSnapshot Json?         // ★ Snapshot complet du calcul + profil + params fiscaux
  reprocessHistory    Json?         // Historique des re-traitements
  reprocessCount      Int           @default(0)
  payslipArchives     PayslipArchive[]
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt

  @@unique([periodId, employeeId])  // Un bulletin par employé par période
  @@index([periodId])
  @@index([employeeId])
}
```

**Le `calculationSnapshot` est un JSON contenant :**
```json
{
  "_profile": {
    "id": "clxxx...",
    "version": 2,
    "effectiveFrom": "2025-01-01T00:00:00.000Z",
    "igrParts": 2
  },
  "_params": {
    "cnpsEmployeeRate": 0.063,
    "cnpsEmployerRate": 0.077,
    "cnpsCeiling": 3375000,
    "cmuPerPerson": 500,
    "transportExemptLimit": 30000
  },
  // + toutes les valeurs calculées du PayrollResult
  "seniorityYears": 5,
  "seniorityRate": 0.05,
  "baseSalary": 500000,
  "netPayable": 412350,
  "totalEmployerCost": 685000,
  ...
}
```

#### ★ 3.2.9 Archives de bulletins (PayslipArchive) — MODULE CRITIQUE

```prisma
model PayslipArchive {
  id            String       @id @default(cuid())
  payrollLineId String
  payrollLine   PayrollLine  @relation(fields: [payrollLineId], references: [id], onDelete: Cascade)
  employeeId    String
  employee      Employee     @relation(fields: [employeeId], references: [id])
  trigger       String       // Type de déclencheur
  delta         Json?        // Détail des modifications (ancien/nouveau)
  snapshot      Json?        // Snapshot complet du bulletin archivé
  version       Int          @default(1)
  createdAt     DateTime     @default(now())

  @@index([payrollLineId])
  @@index([employeeId])
  @@index([trigger])
  @@index([createdAt])
}
```

**Types de `trigger` :**
| Trigger | Description |
|---------|-------------|
| `salary_profile_update` | Archivage déclenché par la modification d'un profil salarial |
| `salary_profile_create` | Archivage déclenché par la création d'un nouveau profil |
| `bulk_reprocess` | Archivage lors d'un retraitement batch de la paie |
| `manual_restore` | Restauration manuelle d'une version antérieure |
| `period_validation` | Archivage automatique avant validation de période |

**Format du `delta` :**
```json
{
  "baseSalary": { "old": 400000, "new": 500000 },
  "sursalary": { "old": 0, "new": 50000 },
  "igrParts": { "old": 1, "new": 2 },
  "transportAllowance": { "old": 30000, "new": 40000 },
  "netPayable": { "old": 345000, "new": 412350 }
}
```

#### 3.2.10 Autres modèles

```prisma
model Departure {
  id             String   @id @default(cuid())
  employeeId     String
  employee       Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  reason         String   // "Démission" | "Licenciement" | "Retraite" | "Fin de contrat" | "Décès" | "Autre"
  type           String   // "Volontaire" | "Non volontaire"
  departureDate  DateTime
  status         String   @default("Enregistré") // "Enregistré" | "Validé" | "Annulé"
  notes          String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([employeeId])
  @@index([departureDate])
}

model ImportBatch {
  id            String   @id @default(cuid())
  type          String   // "employees" | "salary_profiles" | "contracts"
  fileName      String
  totalRows     Int      @default(0)
  successRows   Int      @default(0)
  errorRows     Int      @default(0)
  errors        Json?    // Array<{row, message}>
  status        String   @default("Terminé")
  importedBy    String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model AuditLog {
  id            String   @id @default(cuid())
  userId        String?
  userName      String?
  userEmail     String?
  action        String   // "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "EXPORT" | "IMPORT" | "VALIDATE"
  entity        String   // "Employee" | "Contract" | "SalaryProfile" | "PayrollLine" | etc.
  entityId      String?
  details       Json?    // Données avant/après (sensible masqué)
  ipAddress     String?
  createdAt     DateTime @default(now())

  @@index([userId])
  @@index([action])
  @@index([entity])
  @@index([createdAt])
}

model PerformanceItem {
  id            String   @id @default(cuid())
  employeeId    String?
  employee      Employee? @relation(fields: [employeeId], references: [id])
  period        String?
  activity      String?
  deliverable   String?
  indicator     String?
  target        String?
  achieved      String?
  score         Float?
  notes         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

---

## 4. MODULE 1 — STRUCTURE ORGANISATIONNELLE

### 4.1 Directions

**Route** : `GET/POST /api/directions`

| Fonctionnalité | Description |
|---------------|-------------|
| Liste des directions | Paginée, recherchable par nom/code |
| Création | Nom obligatoire, code et description optionnels |
| Modification | Tous les champs modifiables |
| Suppression | Restrict si des employés ou départements sont liés |

### 4.2 Départements

**Route** : `GET/POST /api/departments`

| Fonctionnalité | Description |
|---------------|-------------|
| Liste | Filtrable par direction, paginée |
| Création | Nom + direction obligatoires |
| Unicité | Nom unique dans une direction |
| Suppression | Restrict si des employés sont liés |

---

## 5. MODULE 2 — GESTION DES EMPLOYÉS

### 5.1 Page Liste (EmployeesPage)

| Fonctionnalité | Description |
|---------------|-------------|
| Liste paginée | 20 employés par page, tri par nom |
| Recherche | Par matricule, nom, prénom, poste |
| Filtres | Par direction, département, statut |
| Tri | Par nom, date d'embauche, statut |
| Export CSV | Export de la liste filtrée |
| Import CSV | Import batch avec rapport d'erreurs |
| Indicateur complétude | Anneau de progression sur chaque carte/ligne |
| Navigation | Clic → fiche détaillée (EmployeeDetailPage) |

### 5.2 Fiche détaillée (EmployeeDetailPage)

**Onglets :**
1. **Informations** : Données personnelles, professionnelles, coordonnées
2. **Contrats** : Liste des contrats avec création/modification
3. **Profil salarial** : Profil actif + historique des versions
4. **Bulletins de paie** : Liste de tous les bulletins par période
5. **Archives** : Historique des archivages de bulletins
6. **Départs** : Enregistrement et suivi des départs

| Fonctionnalité | Description |
|---------------|-------------|
| Photo | Upload/suppression photo employé |
| Édition inline | Modification directe des champs |
| Suppression | Soft-delete (statut → "Démissionné"/"Licencié") |
| PDF fiche employé | Export PDF de la fiche complète |
| Ancienneté | Calcul automatique (années + mois) |
| Boutons rapides | Accès direct profil salarial, bulletins, contrats |

---

## 6. MODULE 3 — GESTION DES CONTRATS

### 6.1 Types de contrats

| Type | Description |
|------|-------------|
| CDI | Contrat à Durée Indéterminée — `endDate = null` |
| CDD | Contrat à Durée Déterminée — `endDate` obligatoire |
| Stage | Contrat de stage — `endDate` obligatoire |
| Consultation | Contrat de consultation — `endDate` optionnel |

### 6.2 Fonctionnalités

| Fonctionnalité | Description |
|---------------|-------------|
| Création | Type, date début, date fin (si CDD/Stage), notes |
| Liste | Filtrée par employé, par statut, par type |
| Alertes expiration | Notification pour contrats expirant dans ≤ 60 jours |
| Suppression | Soft-delete → `status = 'Supprimé'` (pas de `db.delete`) |
| Historique | Via AuditLog |

---

## ★ 7. MODULE 4 — PROFILS SALARIAUX (VERSIONNÉS)

### 7.1 Concept fondamental

Le profil salarial est le **cœur du système de paie**. Il définit tous les éléments de rémunération d'un employé qui servent de base au calcul de la paie. Chaque modification crée une **nouvelle version** et archive l'ancienne.

### 7.2 Cycle de vie d'un profil

```
[Création V1] ──→ [Modification → Création V2] ──→ [Modification → Création V3] → ...
      │                    │                           │
      ▼                    ▼                           ▼
  Actif              Historique                   Historique
  (effectiveFrom    (effectiveTo =                 (effectiveTo =
   = date entrée)    veille V2)                    veille V3)
```

### 7.3 Opérations

#### 7.3.1 Création d'un nouveau profil (POST /api/salary-profiles)

```
POST /api/salary-profiles
Body: {
  employeeId: string,
  baseSalary: number,
  sursalary: number,
  igrParts: number,
  cmuEmployeeCount: number,
  cmuEmployerCount: number,
  transportAllowance: number,
  taxablePrimes: number,
  taxableBenefits: number,
  nonTaxableAllowances: number,
  atRate?: number | null,
  specificCnpsBase?: number | null,
  effectiveFrom: string,  // "2025-01-01"
  comment?: string
}
```

**Logique backend :**
1. Valider les données avec Zod
2. Désactiver le profil actif existant de l'employé :
   - `status = 'Historique'`
   - `effectiveTo = effectiveFrom du nouveau - 1 jour (23:59:59)`
3. Calculer le numéro de version : `count(existing profiles) + 1`
4. Créer le nouveau profil avec `status = 'Actif'`
5. **★ TRIGGER D'ARCHIVAGE** : Voir [Module 9 — Archivage](#12-module-9--archivage--le-chaînage-profilsbulletinsarchives)
6. Journaliser dans AuditLog (`action = 'CREATE'`, `entity = 'SalaryProfile'`)

#### 7.3.2 Mise à jour d'un profil existant (PUT /api/salary-profiles/[id])

```
PUT /api/salary-profiles/[id]
Body: {
  baseSalary?: number,
  sursalary?: number,
  igrParts?: number,
  // ... tous les champs modifiables
  comment?: string
}
```

**Logique backend :**
1. Valider avec Zod
2. Récupérer le profil existant
3. Calculer le delta (anciens → nouvelles valeurs) pour les champs modifiés
4. Mettre à jour le profil dans la DB
5. **★ TRIGGER D'ARCHIVAGE** : Voir [Module 9 — Archivage](#12-module-9--archivage--le-chaînage-profilsbulletinsarchives)
6. Journaliser dans AuditLog (`action = 'UPDATE'`, `entity = 'SalaryProfile'`)

#### 7.3.3 Consultation de l'historique (GET /api/salary-profiles/[id]/history)

Retourne :
- Les infos du profil courant
- Les AuditLog liés à ce profil
- Les PayslipArchive déclenchés par les changements de ce profil

#### 7.3.4 Profils par employé (GET /api/salary-profiles/employee/[employeeId])

Retourne tous les profils d'un employé (actif + historiques), triés par `effectiveFrom` descendant.

#### 7.3.5 Compteur d'utilisation (GET /api/salary-profiles/usage?profileId=xxx)

Retourne le nombre de PayrollLines qui utilisent ce profil.

### 7.4 Page Profils Salariaux (SalaryProfilesPage)

| Élément | Description |
|---------|-------------|
| Statistiques | Total profils, Actifs, À compléter (baseSalary=0), Utilisés en paie |
| Recherche | Par nom, matricule |
| Filtre "À compléter" | Toggle pour afficher uniquement les profils avec baseSalary=0 |
| Tableau | Matricule, Nom, Salaire base, Sursalaire, Parts IGR, Transport, Utilisé en paie, Statut, Actions |
| Dialogue édition | Formulaire de modification avec tous les champs + historique version |
| Lien vers employé | Clic sur le nom → fiche employé |

### 7.5 Contraintes métier

1. **Un profil actif par employé** : La création d'un nouveau profil désactive automatiquement l'ancien.
2. **effectiveFrom obligatoire** : Détermine la date à partir de laquelle le profil s'applique.
3. **Pas de chevauchement** : Les profils d'un même employé ne doivent jamais se chevaucher temporellement.
4. **Immuable après utilisation** : Un profil qui a été utilisé pour générer des bulletins dans une période clôturée ne peut pas être modifié (sauf via création d'une nouvelle version).
5. **Profil à compléter** : Si `baseSalary = 0` et `sursalary = 0`, le profil est signalé comme "à compléter" dans l'UI et le bulletin porte `controlStatus = 'Profil paie à compléter'`.

---

## 8. MODULE 5 — PARAMÈTRES FISCAUX ET SOCIAUX (VERSIONNÉS)

### 8.1 Concept

Les paramètres fiscaux et sociaux sont des **paramètres globaux** qui s'appliquent à tous les employés. Ils sont versionnés pour permettre de tracer quelles valeurs étaient en vigueur à chaque période de paie.

### 8.2 Sous-modules

| Sous-module | Modèle | Description |
|-------------|--------|-------------|
| Paramètres généraux | `PayrollParameter` | Taux CNPS, plafonds, taux AT, CMU, etc. |
| Tranches ITS | `TaxBracketITS` | Barème progressif de l'ITS (tranches par DGI) |
| Barème RICF | `RicfScale` | Réduction pour charges de famille par nombre de parts |

### 8.3 Fonctionnalités

| Fonctionnalité | Description |
|---------------|-------------|
| CRUD complet | Créer, lire, modifier, désactiver |
| Versionnage | `effectiveFrom`/`effectiveTo` pour chaque version |
| Seed par défaut | `POST /api/parameters/seed-defaults` — insère les valeurs réglementaires |
| Interface | Page ParametersPage avec onglets : Paramètres, Tranches ITS, Barème RICF |
| Historique | Consultation des versions précédentes |

### 8.4 Page Paramètres (ParametersPage)

**3 onglets :**
1. **Paramètres généraux** : Tableau des 14+ codes avec valeur, unité, source, statut, dates d'effet
2. **Tranches ITS** : Tableau des tranches (borne inf, borne sup, taux, label) avec drag-reorder
3. **Barème RICF** : Tableau (parts IGR, montant mensuel de réduction)

---

## ★ 9. MODULE 6 — MOTEUR DE CALCUL DE LA PAIE

### 9.1 Architecture

Le moteur de paie (`payroll-engine.ts`) est un ensemble de **fonctions pures** (sans effet de bord, sans accès DB). Il prend en entrée les données du profil salarial et les paramètres fiscaux, et retourne le résultat complet du calcul.

### 9.2 Formules de calcul (tous montants en FCFA, arrondis à l'entier le plus proche)

#### 9.2.1 Ancienneté

```
années_ancienneté = completedYearsBetween(dateEmbauche, dateRéférence)
  - < 2 ans → 0%
  - 2 ans → 2%
  - > 2 ans → 2% + 1% par année supplémentaire
  - Plafond → 25%

prime_ancienneté = base_salaire × taux_ancienneté
```

#### 9.2.2 Transport

```
transport_exonéré = min(indemnité_transport, 30 000)
transport_imposable = max(indemnité_transport - 30 000, 0)
```

#### 9.2.3 Assiette imposable (RBI — Rémunération Brute Imposable)

```
RBI = base_salaire + sursalaire + prime_ancienneté + primes_imposables
    + avantages_nature_imposables + transport_imposable
```

#### 9.2.4 CNPS

```
assiette_CNPS = min(base_salaire + sursalaire + prime_ancienneté + primes_imposables, plafond_CNPS)
  (ou specificCnpsBase si défini et > 0)

cotisation_CNPS_employé = assiette_CNPS × 6.3%
cotisation_CNPS_employeur = assiette_CNPS × 7.7%
```

#### 9.2.5 Prestations familiales

```
prestations_familiales = base_PF × 5%  (base_PF = 75 000 FCFA par défaut)
```

#### 9.2.6 Accident du travail

```
accident_travail = assiette_CNPS × taux_AT
  (taux_AT = atRate du profil si défini, sinon taux par défaut = 2%)
```

#### 9.2.7 Assurance maternité

```
assurance_maternité = base_PF × 0.75%
```

#### 9.2.8 CMU

```
CMU_employé = nombre_personnes_CMU_employé × coût_par_personne × part_employé
CMU_employeur = nombre_personnes_CMU_employeur × coût_par_personne × part_employeur
  (coût_par_personne × part_employé ≈ 1 000 × 50% = 500 FCFA)
```

#### 9.2.9 ITS (Impôt sur les Traitements et Salaires)

```
RICF(_parts_IGR) = lookup dans barème RICF par nombre de parts

ITS = max(tranche_progressive(RBI) - RICF, 0)

  tranche_progressive(RBI):
    pour chaque tranche [borne_inf, borne_sup] avec taux:
      si RBI > borne_inf:
        taxable_dans_tranche = min(RBI, borne_sup) - borne_inf
        impôt += taxable_dans_tranche × taux
```

#### 9.2.10 Autres charges patronales

```
IS_employeur_local = RBI × 1.2%
taxe_apprentissage = RBI × 0.4%
FPC_mensuelle = RBI × 0.6%
FPC_fin_d_année = RBI × 0.6%
```

#### 9.2.11 Totaux

```
brut_total = RBI + indemnités_non_imposables + transport_exonéré

total_déductions = CNPS_employé + CMU_employé + ITS + autres_déductions

net_à_payer = max(brut_total - total_déductions, 0)  // Minimum 0

total_charges_patronales = CNPS_employeur + PF + AT + maternité
    + CMU_employeur + IS_local + apprentissage + FPC_mensuelle + FPC_fin_année

coût_total_employeur = brut_total + total_charges_patronales
```

### 9.3 Interface TypeScript

```typescript
// Entrée du calcul
interface PayrollInput {
  baseSalary: number
  sursalary: number
  igrParts: number
  cmuEmployeeCount: number
  cmuEmployerCount: number
  transportPaid: number
  taxablePrimes: number
  taxableBenefits: number
  nonTaxableAllowances: number
  atRate: number | null
  specificCnpsBase: number | null
  hireDate: Date
  referenceDate: Date
  otherTaxableGains?: number
  otherDeductions?: number
}

// Paramètres fiscaux
interface PayrollParams {
  cnpsEmployeeRate: number
  cnpsEmployerRate: number
  cnpsCeiling: number
  pfBase: number
  pfRate: number
  maternityRate: number
  atRateDefault: number
  transportExemptLimit: number
  cmuPerPerson: number
  isLocalRate: number
  apprenticeshipRate: number
  fpcMonthlyRate: number
  fpcEndOfYearRate: number
  taxBrackets: TaxBracket[]
  ricfScale: RicfEntry[]
}

// Résultat complet
interface PayrollResult {
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
}
```

---

## ★ 10. MODULE 7 — PÉRIODES ET TRAITEMENT DE LA PAIE

### 10.1 Création d'une période (POST /api/payroll/periods)

**Requête :**
```json
{
  "label": "Janvier 2025",
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "paymentDate": "2025-01-31"
}
```

**Logique backend :**
1. Vérifier l'unicité `(startDate, endDate)`
2. Créer la période avec `status = 'En cours'`
3. **Auto-générer les lignes de paie** pour tous les employés actifs :
   - Pour chaque employé actif, récupérer son profil salarial actif
   - Si pas de profil → marquer `skipped` avec erreur "Profil paie à compléter"
   - Si pas de date d'embauche → marquer `skipped`
   - Calculer la paie avec `calculateFullPayroll()` et les paramètres actifs
   - Créer le `PayrollLine` avec le `salaryProfileId` du profil utilisé
   - Stocker le `calculationSnapshot` complet
4. Agréger les totaux (brut, net, charges) et mettre à jour la période
5. Journaliser dans AuditLog

### 10.2 Retraitement batch (POST /api/payroll/process)

```
POST /api/payroll/process
Body: { "periodId": "clxxx..." }
```

**Logique :**
1. Vérifier que la période n'est pas Validée ni Clôturée
2. Passer la période en `status = 'En cours'`
3. Pour chaque employé actif :
   - Récupérer le profil actif
   - Si une PayrollLine existe déjà avec un `salaryProfileId` différent → **archiver** la ligne existante (voir Module 9)
   - Calculer avec le profil actuel
   - Upsert la PayrollLine (créer ou mettre à jour)
   - Si mise à jour suite à changement de profil → `status = 'Modifié'`
4. Agréger et mettre à jour les totaux
5. Journaliser

### 10.3 Retraitement unitaire (POST /api/payroll/lines/[id]/recalculate)

```
POST /api/payroll/lines/[id]/recalculate
```

**Logique :**
1. Récupérer la PayrollLine existante
2. Récupérer le profil salarial actif de l'employé
3. Si le profil a changé (`salaryProfileId` différent) → archiver l'ancien état
4. Recalculer avec le profil actuel
5. Mettre à jour la PayrollLine
6. Mettre à jour les totaux de la période

### 10.4 Validation de période (POST /api/payroll/validate-period)

**Logique :**
1. Vérifier que la période est "En cours"
2. Marquer toutes les PayrollLine comme `status = 'Validé'`
3. Marquer la période comme `status = 'Validé'`
4. Journaliser

### 10.5 Clôture de période

La clôture est irréversible. Après clôture :
- Les bulletins ne peuvent plus être modifiés
- Les profils salariaux utilisés sont "figés" pour cette période

### 10.6 Page Paie (PayrollPage)

| Élément | Description |
|---------|-------------|
| Sélecteur de période | Dropdown avec toutes les périodes |
| Création période | Dialogue avec label, date début, date fin, date paiement |
| Statistiques période | Total brut, total net, total charges, nombre de lignes |
| Tableau des bulletins | Matricule, Nom, Brut, Net, Charges, Statut, Actions |
| Actions par ligne | Voir détail, Recalculer, Ajouter notes, PDF |
| Actions bulk | Tout sélectionner, Retraiter sélection, Valider sélection |
| Filtres | Par statut, par contrôle (OK/Erreur/À compléter), recherche |
| Comparaison | Bouton pour comparer avec une période précédente |
| Export | Export CSV de la période, PDF groupé des bulletins |

---

## ★ 11. MODULE 8 — BULLETINS DE PAIE (PAYROLLLINES)

### 11.1 Consultation d'un bulletin (PayslipDetailPage)

**Route** : `GET /api/payroll/lines/[id]`

Retourne le bulletin complet avec :
- Employé (nom, prénom, matricule, direction, département)
- Profil salarial utilisé (version, date d'effet)
- Période de paie
- Toutes les valeurs calculées
- Snapshot de calcul
- Notes RH
- Historique des re-traitements
- Archives liées

### 11.2 Visualisation du bulletin

**Sections affichées :**
1. **En-tête** : AFWASA, période, n° bulletin
2. **Identité** : Matricule, Nom, Prénom, Direction, Département, Poste
3. **Éléments du brut** : Base, Sursalaire, Ancienneté, Transport (exonéré/imposable), Primes, Avantages
4. **Assiettes** : CNPS, Imposable
5. **Déductions employé** : CNPS, CMU, ITS, RICF
6. **Charges patronales** : CNPS, PF, AT, Maternité, CMU, IS, Apprentissage, FPC
7. **Totaux** : Brut total, Net à payer, Coût total employeur
8. **Métadonnées** : Profil version X, paramètres utilisés, date de calcul

### 11.3 Export PDF (GET /api/export/payslip-pdf/[lineId])

- Utilise un template HTML (`payslip-template.ts`)
- Généré via Playwright/Puppeteer
- Format A4 portrait
- Protection XSS sur tous les champs dynamiques (`escapeHtml()`)

### 11.4 Notes RH (PUT /api/payroll/lines/[id]/notes)

Ajout/modification de notes libres sur un bulletin. Journalisé dans AuditLog.

### 11.5 Restauration d'une version antérieure (POST /api/payroll/lines/[id]/restore-version)

Restaure un bulletin à un état archivé (depuis `reprocessHistory` ou `PayslipArchive`).

### 11.6 Modification manuelle

Possibilité de modifier manuellement certains champs d'un bulletin (si la période n'est pas clôturée). Toute modification manuelle :
- Archive l'état précédent
- Passe le statut à "Modifié"
- Journalise dans AuditLog

---

## ★ 12. MODULE 9 — ARCHIVAGE — LE CHAÎNAGE PROFILS→BULLETINS→ARCHIVES

### 12.1 PRINCIPE FONDAMENTAL

C'est le **module le plus critique** du système. Il garantit que :
1. Tout changement de profil salarial est traçable
2. Les anciens bulletins sont préservés avec les valeurs qui étaient en vigueur au moment de leur génération
3. On peut toujours répondre à la question : "Quel était le salaire de X en janvier 2025 ?"

### 12.2 Flux d'archivage complet

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MODIFICATION D'UN PROFIL SALARIAL                │
│                                                                     │
│  1. RH modifie le profil de l'employé X (ex: augmentation)         │
│     PUT /api/salary-profiles/[id]                                   │
│                                                                     │
│  2. Backend calcule le DELTA (ancien → nouveau)                     │
│     delta = { baseSalary: { old: 400000, new: 500000 }, ... }      │
│                                                                     │
│  3. Backend identifie les BULLETINS IMPACTÉS                       │
│     - Toutes les PayrollLines où salaryProfileId = ce profil        │
│     - Qui appartiennent à des périodes EN COURS (non clôturées)     │
│                                                                     │
│  4. Pour CHAQUE bulletin impacté :                                  │
│     a) Créer un PayslipArchive :                                    │
│        - trigger = "salary_profile_update"                          │
│        - delta = { champ: { old, new } }                            │
│        - snapshot = { copie complète du bulletin avant modification }│
│        - version = incrémental                                       │
│                                                                     │
│     b) Recalculer le bulletin avec les nouvelles valeurs du profil  │
│        - Appeler calculateFullPayroll()                             │
│        - Mettre à jour la PayrollLine                               │
│        - status = "Modifié"                                         │
│        - Stocker le nouveau calculationSnapshot                      │
│                                                                     │
│     c) Mettre à jour les totaux de la période                       │
│                                                                     │
│  5. Journaliser dans AuditLog                                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 12.3 Cas d'usage détaillés

#### Cas 1 : Création d'un nouveau profil (changement de profil)

```
Situation : L'employé X a le profil V1 (400 000 FCFA). RH crée un profil V2 (500 000 FCFA).

Actions automatiques :
1. Profil V1 → status = "Historique", effectiveTo = veille du effectiveFrom V2
2. Profil V2 → status = "Actif"
3. Pour chaque PayrollLine en période non clôturée utilisant V1 :
   a) Archiver l'ancien bulletin (PayslipArchive, trigger = "salary_profile_create")
   b) Recalculer avec V2
   c) Mettre à jour salaryProfileId → V2
4. AuditLog
```

#### Cas 2 : Modification directe d'un profil actif

```
Situation : RH augmente le salaire de base de 400 000 → 450 000 FCFA sur le profil actif.

Actions automatiques :
1. Mettre à jour le profil (les anciennes valeurs sont dans le snapshot des bulletins existants)
2. Pour chaque PayrollLine en période non clôturée utilisant ce profil :
   a) Archiver (PayslipArchive, trigger = "salary_profile_update", delta = { baseSalary: { old: 400000, new: 450000 } })
   b) Recalculer avec les nouvelles valeurs
   c) Mettre à jour le bulletin
3. AuditLog
```

#### Cas 3 : Retraitement batch

```
Situation : RH clique "Retraiter" sur une période.

Actions :
1. Pour chaque employé, récupérer le profil actif
2. Si le profil actuel est différent de celui utilisé dans la PayrollLine :
   a) Archiver (trigger = "bulk_reprocess")
   b) Recalculer
   c) Mettre à jour
3. Agréger les totaux
4. AuditLog
```

#### Cas 4 : Création d'une nouvelle période

```
Situation : RH crée la période "Février 2025".

Actions :
1. Créer la PayrollPeriod
2. Pour chaque employé actif, utiliser le profil actif au moment de la création
3. Les bulletins sont créés avec le profil actuel
4. Si l'employé a eu un changement de profil en cours de mois, c'est le profil
   actif à la date de fin de période qui est utilisé
5. Les totaux sont calculés automatiquement
```

### 12.4 Règles d'archivage

| Règle | Description |
|-------|-------------|
| **Non destructif** | Les bulletins ne sont jamais supprimés. Seuls des archivages sont créés. |
| **Périodes clôturées** | Les bulletins des périodes clôturées ne sont JAMAIS recalculés, même si le profil change. |
| **Traçabilité** | Chaque archive contient le trigger, le delta, et un snapshot complet. |
| **Consultation** | L'historique des archives est consultable depuis la fiche employé ou le détail d'un bulletin. |
| **Restauration** | Un bulletin peut être restauré à un état archivé (si la période n'est pas clôturée). |
| **Snapshot** | Le `calculationSnapshot` d'un PayrollLine contient les valeurs du profil ET des paramètres fiscaux utilisés, permettant une reconstitution exacte. |

### 12.5 API d'archivage

#### Liste des archives (GET /api/payslip-archives)

```
GET /api/payslip-archives?payrollLineId=xxx   // Archives d'un bulletin
GET /api/payslip-archives?employeeId=xxx      // Toutes les archives d'un employé
```

#### Détail d'une archive (GET /api/payslip-archives/[id])

Retourne l'archive complète avec le snapshot et le delta.

### 12.6 Affichage dans l'interface

**Dans PayslipDetailPage :**
- Section "Historique des modifications" avec timeline
- Chaque entrée montre : date, trigger, delta (champs modifiés avec ancien/nouveau)
- Bouton "Restaurer cette version" (si période non clôturée)

**Dans EmployeeDetailPage (onglet Archives) :**
- Liste chronologique de toutes les archives de l'employé
- Lien vers le bulletin concerné
- Indicateur de la période

---

## 13. MODULE 10 — GESTION DES DÉPARTS

### 13.1 Types de départ

| Raison | Type |
|--------|------|
| Démission | Volontaire |
| Licenciement | Non volontaire |
| Retraite | Volontaire/Non volontaire |
| Fin de contrat | Non volontaire |
| Décès | Non volontaire |
| Autre | — |

### 13.2 Fonctionnalités

| Fonctionnalité | Description |
|---------------|-------------|
| Enregistrement | Date de départ, raison, type, notes |
| Validation | Changement de statut → "Validé" |
| Annulation | Changement de statut → "Annulé" |
| Impact sur employé | Si validé, le statut employé passe à "Démissionné"/"Licencié"/"Retraité" |
| Impact sur paie | L'employé n'apparaît plus dans les traitements de paie futurs |
| Historique | Consultable dans la fiche employé |

---

## 14. MODULE 11 — TABLEAU DE BORD ET ANALYTIQUE

### 14.1 Dashboard (DashboardPage)

**Widgets :**
- Effectif total / actifs / en départ
- Masse salariale du mois (brut/net/charges)
- Évolution mensuelle (mini-graphique)
- Alertes : contrats expirant, profils à compléter, données manquantes
- Qualité des données (DataQualityBar)
- Derniers audits
- Répartition par direction/département (camembert)
- Répartition par sexe (donut)
- Top 5 salaires les plus élevés

### 14.2 Analytics (AnalyticsPage)

**Analyses :**
- Distribution salariale (histogramme)
- Écart salarial homme/femme
- Coût par direction
- Évolution de la masse salariale (courbe)
- Comparaison inter-périodes
- Pyramide des âges
- Ancienneté moyenne

### 14.3 Comparaison de paie (PayrollComparisonPage)

- Sélection de deux périodes
- Tableau comparatif par employé (ancien vs nouveau)
- Mises en évidence des différences (vert/rouge)
- Totaux comparatifs
- Export CSV des différences

---

## 15. MODULE 12 — IMPORT/EXPORT

### 15.1 Import

| Type | Route | Description |
|------|-------|-------------|
| Employés | `POST /api/import/employees` | CSV avec matricule, nom, prénom, direction, département, etc. |
| Profils salariaux | `POST /api/import/salary-profiles` | CSV avec matricule, salaire, sursalaire, etc. |
| Historique | `GET /api/import/history` | Liste des imports avec statut |

**Format CSV employés :**
```
matricule;nom;prenom;sexe;date_naissance;nationalite;statut_matrimonial;nb_enfants;
adresse;telephone;email;poste;direction;departement;lieu_travail;date_embauche;cnps
```

### 15.2 Export

| Type | Route | Format |
|------|-------|--------|
| Liste employés | `GET /api/export/employees?format=csv` | CSV |
| Fiche employé | `GET /api/export/employee-pdf/[employeeId]` | PDF |
| Bulletin individuel | `GET /api/export/payslip-pdf/[lineId]` | PDF |
| Bulletins période | `GET /api/export/payslips?periodId=xxx` | CSV |
| Bulletins groupés | `GET /api/export/payslips/bulk?periodId=xxx` | ZIP (PDFs) |

---

## 16. MODULE 13 — TRAÇABILITÉ ET AUDIT

### 16.1 Journal d'audit (AuditLog)

**Actions journalisées :**
- `CREATE` : Création d'un employé, contrat, profil, période
- `UPDATE` : Modification de n'importe quelle entité
- `DELETE` : Suppression (soft ou hard)
- `LOGIN` : Connexion d'un utilisateur
- `EXPORT` : Export de données (PDF, CSV)
- `IMPORT` : Import de données
- `VALIDATE` : Validation d'une période de paie

**Données sensibles masquées :**
- `passwordHash` jamais inclus dans les détails
- Seuls les champs modifiés sont inclus dans le delta (pas le profil complet)

### 16.2 Page Journal d'audit (AuditLogsPage)

| Élément | Description |
|---------|-------------|
| Liste | Paginée, triée par date décroissante |
| Filtres | Par utilisateur, par action, par entité, par date |
| Recherche | Par nom d'utilisateur |
| Export CSV | Export du journal filtré |
| Détails | Vue étendue du delta avant/après |

---

## 17. MODULE 14 — AUTHENTIFICATION ET PERMISSIONS

### 17.1 Authentification

- Login par email + mot de passe
- JWT stocké dans le Zustand store (persisté en localStorage)
- Token envoyé en header `Authorization: Bearer <token>`
- Vérification à chaque requête API
- 401 → déconnexion automatique

### 17.2 Rôles et permissions

| Rôle | Permissions |
|------|-------------|
| Admin | Toutes les permissions |
| RH | Lecture + Écriture sur employés, profils, paie, contrats |
| Comptable | Lecture paie, export bulletins, validation |
| Manager | Lecture équipe (sa direction uniquement) |
| Lecteur | Lecture seule |

**Permissions granulaires :**
- `employees.read`, `employees.write`, `employees.delete`
- `contracts.read`, `contracts.write`
- `salary-profiles.read`, `salary-profiles.write`
- `payroll.read`, `payroll.write`, `payroll.validate`, `payroll.close`
- `parameters.read`, `parameters.write`
- `export.*`
- `import.*`
- `audit.read`

---

## 18. MODULE 15 — NOTIFICATIONS

### 18.1 Types de notifications

| Type | Description |
|------|-------------|
| Contrat expirant | Contrat dont la fin est dans ≤ 60 jours |
| Profil à compléter | Employé avec profil salarial mais baseSalary=0 |
| Données manquantes | Champs obligatoires vides (date embauche, CNPS, etc.) |
| Paie traitée | Notification après traitement batch |

### 18.2 API (GET /api/notifications)

Retourne les notifications non lues + compteur. Mise à jour du compteur de lues.

---

## 19. MODULE 16 — SIMULATEUR DE PAIE

### 19.1 Concept

Le simulateur permet de calculer une paie hypothétique sans persister les résultats. Il utilise les **mêmes fonctions** que le traitement batch (`calculateFullPayroll()`).

### 19.2 Page Simulateur (SimulatorPage)

| Élément | Description |
|---------|-------------|
| Formulaire | Tous les champs du profil salarial + date embauche + date référence |
| Résultat | Affichage complet du bulletin (même format que PayslipDetailPage) |
| Pas de persistance | Tout est calculé côté client ou via API stateless |
| Export | Possibilité d'exporter le résultat en PDF |
| Réinitialisation | Bouton pour vider le formulaire |

### 19.3 API (POST /api/payroll/simulate)

```
POST /api/payroll/simulate
Body: { ... PayrollInput }
Response: { ... PayrollResult }
```

Stateless — ne crée aucune entrée en base.

---

## 20. SPÉCIFICATIONS UI/UX

### 20.1 Layout principal

```
┌──────────────────────────────────────────────────────┐
│  ┌─────┐  RH AFWASA          [Notifications] [User] │  ← Header
│  │     │                                              │
│  │ S   │  ┌──────────────────────────────────────┐   │
│  │ i   │  │                                      │   │
│  │ d   │  │         CONTENU PRINCIPAL            │   │
│  │ e   │  │      (Page courante)                 │   │
│  │ b   │  │                                      │   │
│  │ a   │  │                                      │   │
│  │ r   │  │                                      │   │
│  │     │  │                                      │   │
│  │     │  │                                      │   │
│  └─────┘  └──────────────────────────────────────┘   │
│                                                      │
│  └──────────────────────────────────────────────────┘ │  ← Footer (sticky)
└──────────────────────────────────────────────────────┘
```

### 20.2 Design system

| Élément | Spécification |
|---------|---------------|
| Couleur primaire | `#362981` (violet) |
| Couleur secondaire | `#009446` (vert) |
| Couleur tertiaire | `#029CB1` (teal) |
| Couleur accent | `#C7FFEE` (aqua) |
| Background | Blanc (mode clair), gris foncé (mode sombre) |
| Police | Inter, system-ui |
| Arrondi | `rounded-xl` pour les cartes |
| Ombres | `shadow-lg` avec glassmorphism |
| Animations | Framer Motion — enter/exit sur les listes, hover sur les cartes |
| Mode sombre | Support via `next-themes` |

### 20.3 Composants partagés

| Composant | Description |
|-----------|-------------|
| `PageHeader` | Titre + description + icône + action |
| `StatusBadge` | Badge coloré par statut |
| `EmptyState` | État vide avec icône, titre, description |
| `TableEmptyState` | État vide pour tableaux |
| `CompletenessRing` | Anneau de progression (fiche employé) |
| `CardSpotlight` | Effet de lumière au survol des cartes |
| `DataQualityBar` | Barre de qualité des données |
| `StatusDot` | Point coloré inline pour les statuts |

### 20.4 Responsive

- **Mobile first** : Conception pour mobile, enrichissement pour desktop
- **Breakpoints** : `sm:`, `md:`, `lg:`, `xl:`
- **Sidebar** : Collapsible sur mobile (hamburger menu)
- **Tables** : Scroll horizontal sur mobile, colonnes masquées avec `hidden md:table-cell`
- **Touch** : Minimum 44px pour les zones interactives

### 20.5 Performance

- **Lazy loading** : Toutes les pages sont chargées dynamiquement (`React.lazy()`)
- **Code splitting** : Chaque page est un chunk séparé
- **Pagination** : Toutes les listes sont paginées (15-20 par page)
- **Optimistic updates** : Mises à jour optimistes via TanStack Query
- **Skeleton loaders** : Skeleton pendant le chargement des données

---

## 21. RÈGLES MÉTIER CRITIQUES

### 21.1 Règles de calcul

| # | Règle |
|---|-------|
| R1 | Tous les montants sont en FCFA, arrondis à l'entier le plus proche (`Math.round()`) |
| R2 | L'ancienneté est calculée en années complètes (pas de prorata) |
| R3 | Le taux d'ancienneté va de 0% (< 2 ans) à 25% (max), avec 2% à 2 ans et +1%/an |
| R4 | L'indemnité de transport est exonérée jusqu'à 30 000 FCFA/mois |
| R5 | L'assiette CNPS est plafonnée à 3 375 000 FCFA/mois |
| R6 | Le net à payer ne peut pas être négatif (minimum 0) |
| R7 | Le plafond CNPS peut être personnalisé par employé via `specificCnpsBase` |
| R8 | Le taux AT peut être personnalisé par employé via `atRate` |

### 21.2 Règles de gestion

| # | Règle |
|---|-------|
| G1 | Un seul profil salarial actif par employé |
| G2 | La création d'un nouveau profil désactive l'ancien |
| G3 | Un bulletin par employé par période (contrainte unique `periodId + employeeId`) |
| G4 | Les périodes clôturées sont irréversibles |
| G5 | Les bulletins de périodes clôturées ne sont jamais recalculés |
| G6 | La suppression d'un contrat est un soft-delete (`status = 'Supprimé'`) |
| G7 | Un employé avec le statut "Actif" seulement est inclus dans la paie |
| G8 | L'export PDF des bulletins doit échapper tous les champs dynamiques (XSS) |

### 21.3 Règles d'archivage

| # | Règle |
|---|-------|
| A1 | Toute modification de profil salarial déclenche l'archivage des bulletins impactés |
| A2 | L'archivage ne se produit que pour les périodes non clôturées |
| A3 | Chaque archive contient un snapshot complet et un delta |
| A4 | Les archives sont consultables mais non modifiables |
| A5 | La restauration d'une archive crée un nouvel archivage |

---

## 22. SCÉNARIOS DE TEST FONCTIONNELS

### 22.1 Scénario 1 : Cycle de vie complet d'un employé

```
1. Créer un employé (matricule, nom, prénom, direction, département, date embauche)
2. Vérifier : l'employé apparaît dans la liste
3. Créer un contrat (CDI)
4. Créer un profil salarial (baseSalary = 500 000, parts IGR = 2)
5. Vérifier : le profil est "Actif"
6. Créer une période de paie (Janvier 2025)
7. Vérifier : un bulletin est automatiquement généré avec les bons calculs
8. Consulter le bulletin : vérifier CNPS, ITS, net à payer
9. Exporter le bulletin en PDF
10. Valider la période
11. Clôturer la période
12. Vérifier : le bulletin n'est plus modifiable
```

### 22.2 Scénario 2 : Changement de profil salarial avec archivage

```
1. Partir d'un employé avec un profil V1 (400 000 FCFA) et un bulletin janvier validé
2. Modifier le profil : baseSalary → 450 000 FCFA
3. Vérifier :
   a) Le profil est mis à jour
   b) Un PayslipArchive est créé avec le delta
   c) Les bulletins des périodes en cours sont recalculés
   d) Le bulletin de janvier (clôturé) n'est PAS modifié
4. Consulter l'historique d'archives
5. Vérifier le delta affiche { baseSalary: { old: 400000, new: 450000 } }
```

### 22.3 Scénario 3 : Création de nouveau profil (promotion)

```
1. Partir d'un employé avec profil V1 (400 000)
2. Créer un nouveau profil V2 (600 000 FCFA) avec effectiveFrom = 2025-02-01
3. Vérifier :
   a) Profil V1 → status = "Historique", effectiveTo = 2025-01-31
   b) Profil V2 → status = "Actif", version = 2
   c) Le bulletin de janvier utilise V1
   d) Les bulletins des périodes en cours (si existantes) sont recalculés avec V2
   e) Des PayslipArchives sont créés (trigger = "salary_profile_create")
4. Créer la période février 2025
5. Vérifier : le bulletin de février utilise V2 (600 000)
```

### 22.4 Scénario 4 : Retraitement batch

```
1. Avoir une période en cours avec des bulletins
2. Modifier 3 profils salariaux
3. Cliquer "Retraiter" sur la période
4. Vérifier :
   a) Les 3 bulletins impactés sont recalculés
   b) Des archives sont créées (trigger = "bulk_reprocess")
   c) Les totaux de la période sont mis à jour
   d) Les bulletins non impactés sont inchangés
```

### 22.5 Scénario 5 : Départ d'un employé

```
1. Enregistrer un départ (Démission)
2. Valider le départ
3. Vérifier :
   a) Le statut de l'employé passe à "Démissionné"
   b) L'employé n'apparaît plus dans le traitement de paie
   c) Le contrat passe à "Terminé"
4. Créer une nouvelle période de paie
5. Vérifier : aucun bulletin n'est généré pour cet employé
```

### 22.6 Scénario 6 : Simulation de paie

```
1. Ouvrir le simulateur
2. Saisir : baseSalary = 800 000, parts IGR = 3, transport = 50 000, date embauche = 2020-06-15
3. Vérifier :
   a) Ancienneté correcte (5 ans)
   b) Prime d'ancienneté = 800 000 × 5% = 40 000
   c) Transport exonéré = 30 000, imposable = 20 000
   d) CNPS = min(800 000, 3 375 000) × 6.3% = 50 400
   e) Net à payer cohérent
4. Vérifier : aucune donnée n'est persistée en base
```

---

## ANNEXES

### A. Variables d'environnement

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | URL PostgreSQL (Neon) |
| `JWT_SECRET` | Clé secrète pour les tokens JWT |
| `NEXT_PUBLIC_APP_NAME` | Nom de l'application |

### B. Déploiement

- **Hébergement** : Vercel
- **Base de données** : Neon PostgreSQL
- **Domaine** : `rh-afwasa.vercel.app`
- **CI/CD** : Push sur `main` → déploiement automatique via Vercel

### C. Statistiques du projet

| Métrique | Valeur |
|----------|--------|
| Pages | 17 |
| Routes API | 54 |
| Composants UI (shadcn) | 42+ |
| Modèles Prisma | 15 |
| Lignes de code (estimé) | ~25 000 |

### D. Résumé du chaînage critique

```
                     ┌──────────────────┐
                     │  SalaryProfile   │
                     │  (Versionné)     │
                     │  - baseSalary    │
                     │  - sursalary     │
                     │  - igrParts      │
                     │  - effectiveFrom │
                     │  - version       │
                     └────────┬─────────┘
                              │ 1 profil actif/employé
                              │ utilisé comme base de calcul
                              ▼
                     ┌──────────────────┐
                     │  PayrollPeriod   │
                     │  (Mois)          │
                     │  - startDate     │
                     │  - endDate       │
                     │  - status        │
                     └────────┬─────────┘
                              │ 1 période = N bulletins
                              ▼
                     ┌──────────────────┐
                     │  PayrollLine     │
                     │  (Bulletin)      │
                     │  - salaryProfileId│ ← Lien vers le profil utilisé
                     │  - periodId      │
                     │  - employeeId    │
                     │  - netPayable    │
                     │  - snapshot      │
                     │  @@unique(période│
                     │    + employé)    │
                     └────────┬─────────┘
                              │ chaque modification crée
                              ▼
                     ┌──────────────────┐
                     │  PayslipArchive  │
                     │  (Archive)       │
                     │  - trigger       │
                     │  - delta         │
                     │  - snapshot      │
                     │  - version       │
                     └──────────────────┘
```

**Ce schéma résume le principe fondamental :**
1. **SalaryProfile** définit *quoi* calculer (les éléments de rémunération)
2. **PayrollPeriod** définit *quand* calculer (le mois concerné)
3. **PayrollLine** est le *résultat* du calcul (le bulletin), lié à un profil ET une période
4. **PayslipArchive** est *l'historique* de chaque modification du bulletin

Toute modification d'un profil salarial actif déclenche automatiquement la création d'archives pour les bulletins des périodes non clôturées qui utilisaient ce profil, puis leur recalcul avec les nouvelles valeurs.

---

*Fin du Cahier des Charges — RH-AFWASA v3.0*