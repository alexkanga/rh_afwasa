import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Calculation fields that require archive creation when manually adjusted
const CALC_FIELDS = [
  'baseSalary', 'sursalary', 'transportExempt', 'transportTaxable',
  'taxablePrimes', 'taxableBenefits', 'nonTaxableGains',
  'grossTaxable', 'cnpsBase', 'cnpsEmployee', 'cmuEmployee',
  'ricf', 'its', 'otherDeductions', 'totalDeductions',
  'cnpsEmployer', 'familyAllowances', 'workAccident',
  'maternityInsurance', 'cmuEmployer', 'isLocalEmployer',
  'apprenticeshipTax', 'fpcMonthly', 'fpcEndOfYear',
  'totalEmployerCharges', 'totalGross', 'netPayable', 'totalEmployerCost',
  'seniorityYears', 'seniorityRate', 'seniorityBonus',
] as const

// ── GET: Single payroll line with full details + employee info ──
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const line = await db.payrollLine.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            matricule: true,
            lastName: true,
            firstName: true,
            sex: true,
            currentPosition: true,
            hireDate: true,
            cnpsNumber: true,
            direction: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
          },
        },
        period: {
          select: {
            id: true,
            label: true,
            startDate: true,
            endDate: true,
            paymentDate: true,
            status: true,
          },
        },
        salaryProfile: {
          select: {
            id: true,
            version: true,
            effectiveFrom: true,
            igrParts: true,
            atRate: true,
            cmuEmployeeCount: true,
          },
        },
      },
    })

    if (!line) {
      return NextResponse.json({ error: 'Ligne non trouvée' }, { status: 404 })
    }

    // Get archive count
    const archiveCount = await db.payslipArchive.count({
      where: { payrollLineId: id },
    })

    // Get recent archives
    const recentArchives = await db.payslipArchive.findMany({
      where: { payrollLineId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        trigger: true,
        version: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      ...line,
      employeeName: `${line.employee.lastName} ${line.employee.firstName}`,
      directionName: line.employee.direction?.name || '—',
      departmentName: line.employee.department?.name || '—',
      archiveCount,
      recentArchives,
    })
  } catch (error) {
    console.error('Payroll line detail API error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ── PUT: Update line (manual adjustments) ──
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const existing = await db.payrollLine.findUnique({
      where: { id },
      select: {
        id: true,
        employeeId: true,
        reprocessCount: true,
        reprocessHistory: true,
        status: true,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Ligne non trouvée' }, { status: 404 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    const allAllowedFields = [
      ...CALC_FIELDS,
      'controlStatus', 'notes',
    ]

    let hasCalcChanges = false

    for (const field of allAllowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
        if ((CALC_FIELDS as readonly string[]).includes(field)) {
          hasCalcChanges = true
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Aucun champ à modifier' }, { status: 400 })
    }

    // If calculation fields changed, create archive and update metadata
    if (hasCalcChanges) {
      // Get the full existing line for snapshot
      const fullLine = await db.payrollLine.findUnique({ where: { id } })

      // Build delta
      const delta: Record<string, { old: unknown; new: unknown }> = {}
      for (const field of CALC_FIELDS) {
        if (body[field] !== undefined && fullLine) {
          const oldVal = (fullLine as Record<string, unknown>)[field]
          if (oldVal !== body[field]) {
            delta[field] = { old: oldVal, new: body[field] }
          }
        }
      }

      // Create archive
      await db.payslipArchive.create({
        data: {
          payrollLineId: id,
          employeeId: existing.employeeId,
          trigger: 'MANUAL_ADJUSTMENT',
          delta: Object.keys(delta).length > 0 ? delta : null,
          snapshot: fullLine ? {
            seniorityYears: fullLine.seniorityYears,
            seniorityRate: fullLine.seniorityRate,
            seniorityBonus: fullLine.seniorityBonus,
            baseSalary: fullLine.baseSalary,
            sursalary: fullLine.sursalary,
            transportExempt: fullLine.transportExempt,
            transportTaxable: fullLine.transportTaxable,
            taxablePrimes: fullLine.taxablePrimes,
            taxableBenefits: fullLine.taxableBenefits,
            nonTaxableGains: fullLine.nonTaxableGains,
            grossTaxable: fullLine.grossTaxable,
            cnpsBase: fullLine.cnpsBase,
            cnpsEmployee: fullLine.cnpsEmployee,
            cmuEmployee: fullLine.cmuEmployee,
            ricf: fullLine.ricf,
            its: fullLine.its,
            otherDeductions: fullLine.otherDeductions,
            totalDeductions: fullLine.totalDeductions,
            cnpsEmployer: fullLine.cnpsEmployer,
            familyAllowances: fullLine.familyAllowances,
            workAccident: fullLine.workAccident,
            maternityInsurance: fullLine.maternityInsurance,
            cmuEmployer: fullLine.cmuEmployer,
            isLocalEmployer: fullLine.isLocalEmployer,
            apprenticeshipTax: fullLine.apprenticeshipTax,
            fpcMonthly: fullLine.fpcMonthly,
            fpcEndOfYear: fullLine.fpcEndOfYear,
            totalEmployerCharges: fullLine.totalEmployerCharges,
            totalGross: fullLine.totalGross,
            netPayable: fullLine.netPayable,
            totalEmployerCost: fullLine.totalEmployerCost,
            controlStatus: fullLine.controlStatus,
            reprocessCount: fullLine.reprocessCount,
          } : null,
          version: existing.reprocessCount + 1,
        },
      })

      // Update reprocess history
      const existingHistory = Array.isArray(existing.reprocessHistory)
        ? [...existing.reprocessHistory]
        : []
      existingHistory.push({
        date: new Date().toISOString(),
        trigger: 'MANUAL_ADJUSTMENT',
        changedFields: Object.keys(delta),
      })

      updateData.reprocessHistory = existingHistory
      updateData.reprocessCount = existing.reprocessCount + 1
      updateData.status = 'Modifié'
    }

    const updated = await db.payrollLine.update({
      where: { id },
      data: updateData,
    })

    // Audit log
    await db.auditLog.create({
      data: {
        action: 'UPDATE',
        entity: 'PayrollLine',
        entityId: id,
        details: {
          trigger: hasCalcChanges ? 'MANUAL_ADJUSTMENT' : 'FIELD_UPDATE',
          changedFields: Object.keys(body),
          newStatus: updated.status,
        },
      },
    })

    return NextResponse.json({ success: true, line: updated })
  } catch (error) {
    console.error('Payroll line update API error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}