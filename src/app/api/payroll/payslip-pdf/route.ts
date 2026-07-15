import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function fmt(n: number): string {
  return (n || 0).toLocaleString('fr-FR')
}

function fmtDate(d: string | Date | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

function fmtDateShort(d: string | Date | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR')
}

export async function GET(req: NextRequest) {
  try {
    const lineId = req.nextUrl.searchParams.get('lineId')
    if (!lineId) {
      return NextResponse.json({ error: 'lineId requis' }, { status: 400 })
    }

    const line = await db.payrollLine.findUnique({
      where: { id: lineId },
      include: {
        employee: {
          select: {
            matricule: true, lastName: true, firstName: true,
            currentPosition: true, hireDate: true, cnpsNumber: true,
            sex: true, dateOfBirth: true, nationality: true,
            direction: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
        period: {
          select: {
            label: true, startDate: true, endDate: true, paymentDate: true,
          },
        },
        salaryProfile: {
          select: { igrParts: true, atRate: true, cmuEmployeeCount: true, cmuEmployerCount: true },
        },
      },
    })

    if (!line) {
      return NextResponse.json({ error: 'Bulletin non trouvé' }, { status: 404 })
    }

    const emp = line.employee
    const period = line.period
    const sp = line.salaryProfile
    const igrParts = sp?.igrParts ?? 1
    const atRate = sp?.atRate ?? 0.02
    const matricule = emp.matricule || 'XXX'
    const periodSlug = period.label.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')

    const nonTransportNonTaxable = (line.nonTaxableGains || 0) - (line.transportExempt || 0)
    const generatedAt = new Date().toLocaleString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Bulletin de paie — ${emp.lastName} ${emp.firstName}</title>
<style>
  @page { size: A4; margin: 15mm 15mm 20mm 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    font-size: 11px; color: #1a1a1a; line-height: 1.5;
    padding: 0 10px;
  }

  /* Header */
  .header {
    display: flex; align-items: center; justify-content: space-between;
    border-bottom: 3px solid #362981; padding-bottom: 12px; margin-bottom: 16px;
  }
  .header-left { display: flex; align-items: center; gap: 14px; }
  .logo-svg { width: 56px; height: 56px; flex-shrink: 0; }
  .org-name { font-size: 14px; font-weight: 700; color: #362981; line-height: 1.3; }
  .org-subtitle { font-size: 9px; color: #666; }
  .doc-title {
    font-size: 18px; font-weight: 700; color: #362981;
    text-align: center; letter-spacing: 0.5px;
  }

  /* Employee info */
  .info-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px;
    background: #f8f7fc; border: 1px solid #e8e5f0; border-radius: 6px;
    padding: 10px 14px; margin-bottom: 16px;
  }
  .info-label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.3px; }
  .info-value { font-weight: 600; font-size: 11px; }

  /* Period */
  .period-bar {
    background: #362981; color: white; text-align: center;
    padding: 6px 14px; border-radius: 4px; margin-bottom: 16px;
    font-size: 12px; font-weight: 600; letter-spacing: 0.3px;
  }

  /* Tables */
  .tables-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;
  }
  table {
    width: 100%; border-collapse: collapse; font-size: 10.5px;
  }
  thead th {
    background: #362981; color: white; font-weight: 600;
    padding: 6px 8px; text-align: left; font-size: 9.5px;
    text-transform: uppercase; letter-spacing: 0.3px;
  }
  thead th:last-child { text-align: right; }
  tbody td {
    padding: 5px 8px; border-bottom: 1px solid #eee;
  }
  tbody td:last-child { text-align: right; font-variant-numeric: tabular-nums; }
  .section-title {
    background: #f0eff5; font-weight: 700; font-size: 10px;
    color: #362981; text-transform: uppercase; letter-spacing: 0.5px;
    padding: 5px 8px;
  }
  .section-title.green { background: #e6f7ed; color: #009446; }
  .section-title.teal { background: #e5f5f8; color: #029CB1; }
  .row-total td {
    font-weight: 700; background: #f8f7fc; border-top: 2px solid #362981;
  }
  .row-net td {
    font-weight: 800; font-size: 12px; background: #362981; color: white;
    border-top: 2px solid #362981; padding: 7px 8px;
  }

  /* Full-width charges table */
  .charges-section { margin-bottom: 14px; }
  .charges-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 0 14px;
  }
  .charges-grid table { margin-top: 0; }

  /* Footer */
  .footer {
    margin-top: 20px; padding-top: 10px;
    border-top: 1px solid #ddd; display: flex;
    justify-content: space-between; font-size: 9px; color: #999;
  }
  .footer-left { text-align: left; }
  .footer-right { text-align: right; }

  /* Print */
  @media print {
    body { padding: 0; }
    .no-print { display: none; }
  }
  @media screen {
    .print-btn {
      display: block; margin: 0 auto 16px; padding: 8px 24px;
      background: #362981; color: white; border: none; border-radius: 6px;
      font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .print-btn:hover { background: #2a1f63; }
  }
</style>
</head>
<body>

<button class="print-btn no-print" onclick="window.print()">🖨 Imprimer / Enregistrer en PDF</button>

<!-- Header -->
<div class="header">
  <div class="header-left">
    <svg class="logo-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="46" fill="#362981"/>
      <text x="50" y="42" text-anchor="middle" fill="white" font-size="12" font-weight="bold" font-family="Arial">AAEA</text>
      <text x="50" y="58" text-anchor="middle" fill="#C7FFEE" font-size="7" font-family="Arial">AFWASA</text>
      <path d="M25 68 Q50 78 75 68" stroke="#009446" stroke-width="2" fill="none"/>
    </svg>
    <div>
      <div class="org-name">Association Africaine de l'Eau<br/>et de l'Assainissement</div>
      <div class="org-subtitle">AFWASA — RH &amp; Paie</div>
    </div>
  </div>
  <div class="doc-title">BULLETIN DE PAIE</div>
</div>

<!-- Period -->
<div class="period-bar">
  Période : ${period.label} — du ${fmtDateShort(period.startDate)} au ${fmtDateShort(period.endDate)}
  &nbsp;&nbsp;|&nbsp;&nbsp; Paiement : ${fmtDateShort(period.paymentDate)}
</div>

<!-- Employee Info -->
<div class="info-grid">
  <div><div class="info-label">Matricule</div><div class="info-value">${matricule}</div></div>
  <div><div class="info-label">N° CNPS</div><div class="info-value">${emp.cnpsNumber || '—'}</div></div>
  <div><div class="info-label">Nom &amp; Prénom</div><div class="info-value">${emp.lastName} ${emp.firstName}</div></div>
  <div><div class="info-label">Sexe</div><div class="info-value">${emp.sex || '—'}</div></div>
  <div><div class="info-label">Poste</div><div class="info-value">${emp.currentPosition || '—'}</div></div>
  <div><div class="info-label">Direction</div><div class="info-value">${emp.direction?.name || '—'}</div></div>
  <div><div class="info-label">Département</div><div class="info-value">${emp.department?.name || '—'}</div></div>
  <div><div class="info-label">Date d'embauche</div><div class="info-value">${fmtDate(emp.hireDate)}</div></div>
</div>

<!-- Salary + Deductions -->
<div class="tables-grid">
  <!-- Left: Salary Elements -->
  <table>
    <thead>
      <tr><th colspan="2" style="text-align:center; background:#362981;">Éléments du salaire</th></tr>
      <tr><th>Élément</th><th>Montant (FCFA)</th></tr>
    </thead>
    <tbody>
      <tr><td>Salaire de base</td><td>${fmt(line.baseSalary)}</td></tr>
      <tr><td>Sursalaire</td><td>${fmt(line.sursalary)}</td></tr>
      <tr><td>Ancienneté (${line.seniorityYears} ans — ${(line.seniorityRate * 100).toFixed(0)}%)</td><td>${fmt(line.seniorityBonus)}</td></tr>
      <tr><td>Ind. transport (exonéré)</td><td>${fmt(line.transportExempt)}</td></tr>
      <tr><td>Ind. transport (imposable)</td><td>${fmt(line.transportTaxable)}</td></tr>
      <tr><td>Primes imposables</td><td>${fmt(line.taxablePrimes)}</td></tr>
      <tr><td>Avantages imposables</td><td>${fmt(line.taxableBenefits)}</td></tr>
      <tr><td>Indemnités non imposables</td><td>${fmt(nonTransportNonTaxable)}</td></tr>
      <tr class="row-total"><td>Brut imposable</td><td>${fmt(line.grossTaxable)}</td></tr>
      <tr class="row-total"><td>Brut total</td><td>${fmt(line.totalGross)}</td></tr>
    </tbody>
  </table>

  <!-- Right: Deductions -->
  <table>
    <thead>
      <tr><th colspan="2" style="text-align:center; background:#009446;">Cotisations &amp; Déductions salarié</th></tr>
      <tr><th>Cotisation</th><th>Montant (FCFA)</th></tr>
    </thead>
    <tbody>
      <tr><td>CNPS (6,3%)</td><td>${fmt(line.cnpsEmployee)}</td></tr>
      <tr><td>CMU (${sp?.cmuEmployeeCount ?? 1} pers.)</td><td>${fmt(line.cmuEmployee)}</td></tr>
      <tr><td>RICF (${igrParts} part${igrParts > 1 ? 's' : ''})</td><td>${fmt(line.ricf)}</td></tr>
      <tr><td>ITS</td><td>${fmt(line.its)}</td></tr>
      <tr><td>Autres déductions</td><td>${fmt(line.otherDeductions)}</td></tr>
      <tr class="row-total"><td>Total déductions</td><td>${fmt(line.totalDeductions)}</td></tr>
      <tr class="row-net"><td>NET À PAYER</td><td>${fmt(line.netPayable)}</td></tr>
    </tbody>
  </table>
</div>

<!-- Employer Charges -->
<div class="charges-section">
  <table>
    <thead>
      <tr><th colspan="4" style="text-align:center; background:#029CB1;">Charges patronales</th></tr>
      <tr>
        <th>Charge</th><th style="text-align:right">Montant (FCFA)</th>
        <th>Charge</th><th style="text-align:right">Montant (FCFA)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>CNPS employeur (7,7%)</td><td>${fmt(line.cnpsEmployer)}</td>
        <td>IS employeur local</td><td>${fmt(line.isLocalEmployer)}</td>
      </tr>
      <tr>
        <td>Prestations familiales</td><td>${fmt(line.familyAllowances)}</td>
        <td>Taxe apprentissage</td><td>${fmt(line.apprenticeshipTax)}</td>
      </tr>
      <tr>
        <td>Accident du travail (${(atRate * 100).toFixed(1)}%)</td><td>${fmt(line.workAccident)}</td>
        <td>FPC mensuelle</td><td>${fmt(line.fpcMonthly)}</td>
      </tr>
      <tr>
        <td>Assurance maternité</td><td>${fmt(line.maternityInsurance)}</td>
        <td>FPC fin d'année</td><td>${fmt(line.fpcEndOfYear)}</td>
      </tr>
      <tr>
        <td>CMU employeur</td><td>${fmt(line.cmuEmployer)}</td>
        <td></td><td></td>
      </tr>
      <tr class="row-total">
        <td colspan="2">Total charges patronales</td><td colspan="2" style="text-align:right">${fmt(line.totalEmployerCharges)}</td>
      </tr>
      <tr class="row-net">
        <td colspan="2">Coût total employeur</td><td colspan="2" style="text-align:right">${fmt(line.totalEmployerCost)}</td>
      </tr>
    </tbody>
  </table>
</div>

<!-- Footer -->
<div class="footer">
  <div class="footer-left">
    Document généré automatiquement par RH-AFWASA<br/>
    Généré le ${generatedAt}
  </div>
  <div class="footer-right">
    Association Africaine de l'Eau et de l'Assainissement<br/>
    Ce document est un bulletin de paie officiel
  </div>
</div>

</body>
</html>`

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="bulletin_${matricule}_${periodSlug}.html"`,
      },
    })
  } catch (error) {
    console.error('Payslip PDF API error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}