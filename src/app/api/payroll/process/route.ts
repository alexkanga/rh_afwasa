import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { calculatePayroll, type PayrollParams, type ItsBracket, type RicfEntry } from '@/lib/payroll-engine'
import { DEFAULT_PARAMS, DEFAULT_ITS_BRACKETS, DEFAULT_RICF_SCALE } from '@/lib/constants'

// ── POST: Process payroll for a period ──
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { periodId } = body as { periodId?: string }

    if (!periodId) {
      return NextResponse.json({ error: 'periodId est requis' }, { status: 400 })
    }

    // 1. Validate period
    const period = await db.payrollPeriod.findUnique({ where: { id: periodId } })
    if (!period) {
      return NextResponse.json({ error: 'Période non trouvée' }, { status: 404 })
    }
    if (!['Brouillon', 'En cours'].includes(period.status)) {
      return NextResponse.json(
        { error: `Impossible de traiter une période en statut "${period.status}"` },
        { status: 400 }
      )
    }

    // 2. Build payroll params (DB or defaults)
    const dbParams = await db.payrollParameter.findMany({ where: { status: 'Actif' } })
    const paramsMap: Record<string, { value: number; unit: string; description: string; source: string }> = {}
    if (dbParams.length > 0) {
      for (const p of dbParams) {
        paramsMap[p.code] = { value: p.value, unit: p.unit || '', description: p.description || '', source: p.source || '' }
      }
    } else {
      Object.assign(paramsMap, DEFAULT_PARAMS)
    }

    const params: Record<string, number> = {}
    for (const [code, def] of Object.entries(paramsMap)) {
      params[code] = def.value
    }
    const typedParams = params as unknown as PayrollParams

    // 3. Get ITS brackets
    const dbItsBrackets = await db.taxBracketITS.findMany({ orderBy: { order: 'asc' } })
    const itsBrackets: ItsBracket[] = dbItsBrackets.length > 0
      ? dbItsBrackets.map(b => ({
          lowerBound: b.lowerBound,
          upperBound: b.upperBound,
          rate: b.rate,
          label: b.label,
        }))
      : DEFAULT_ITS_BRACKETS as unknown as ItsBracket[]

    // 4. Get RICF scale
    const dbRicfScale = await db.ricfScale.findMany()
    const ricfScale: RicfEntry[] = dbRicfScale.length > 0
      ? dbRicfScale.map(r => ({
          igrParts: r.igrParts,
          monthlyAmount: r.monthlyAmount,
        }))
      : DEFAULT_RICF_SCALE as unknown as RicfEntry[]

    // 5. Get all active employees with their active salary profiles
    const employees = await db.employee.findMany({
      where: { status: 'Actif' },
      include: {
        salaryProfiles: {
          where: { status: 'Actif' },
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
      orderBy: { matricule: 'asc' },
    })

    const employeesWithProfile = employees.filter(e => e.salaryProfiles.length > 0)

    if (employeesWithProfile.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        skipped: employees.length,
        period: { id: period.id, label: period.label, status: period.status },
        message: 'Aucun employé actif avec profil salarial trouvé',
      })
    }

    const referenceDate = period.startDate
    let processed = 0
    const errors: string[] = []

    // Audit log: batch processing start
    await db.auditLog.create({
      data: {
        action: 'BATCH_PROCESS_START',
        entity: 'PayrollPeriod',
        entityId: periodId,
        details: {
          periodLabel: period.label,
          employeeCount: employeesWithProfile.length,
        },
      },
    })

    // 6. Process employees WITHOUT a long-running transaction
    //    (upsert is safe via unique constraint on periodId_employeeId)
    //    Only the final aggregate update uses a short transaction.
    for (const employee of employeesWithProfile) {
      const profile = employee.salaryProfiles[0]
      try {
        const result = calculatePayroll(
          {
            baseSalary: profile.baseSalary,
            sursalary: profile.sursalary,
            igrParts: profile.igrParts,
            cmuEmployeeCount: profile.cmuEmployeeCount,
            cmuEmployerCount: profile.cmuEmployerCount,
            transportAllowance: profile.transportAllowance,
            taxablePrimes: profile.taxablePrimes,
            taxableBenefits: profile.taxableBenefits,
            nonTaxableAllowances: profile.nonTaxableAllowances,
            atRate: profile.atRate,
            specificCnpsBase: profile.specificCnpsBase,
          },
          {
            hireDate: employee.hireDate,
            matricule: employee.matricule,
          },
          typedParams,
          itsBrackets,
          ricfScale,
          referenceDate,
        )

        const parsedSnapshot = JSON.parse(result.calculationSnapshot)

        // Check for existing line
        const existingLine = await db.payrollLine.findUnique({
          where: {
            periodId_employeeId: {
              periodId,
              employeeId: employee.id,
            },
          },
        })

        if (existingLine) {
          // Build delta for archive
          const numericFields = [
            'seniorityYears', 'seniorityRate', 'seniorityBonus',
            'baseSalary', 'sursalary', 'transportExempt', 'transportTaxable',
            'taxablePrimes', 'taxableBenefits', 'nonTaxableGains',
            'grossTaxable', 'cnpsBase', 'cnpsEmployee', 'cmuEmployee',
            'ricf', 'its', 'otherDeductions', 'totalDeductions',
            'cnpsEmployer', 'familyAllowances', 'workAccident',
            'maternityInsurance', 'cmuEmployer', 'isLocalEmployer',
            'apprenticeshipTax', 'fpcMonthly', 'fpcEndOfYear',
            'totalEmployerCharges', 'totalGross', 'netPayable', 'totalEmployerCost',
          ] as const

          const delta: Record<string, { old: unknown; new: unknown }> = {}
          for (const field of numericFields) {
            const oldVal = (existingLine as Record<string, unknown>)[field]
            const newVal = result[field]
            if (oldVal !== newVal) {
              delta[field] = { old: oldVal, new: newVal }
            }
          }

          // Create archive
          await db.payslipArchive.create({
            data: {
              payrollLineId: existingLine.id,
              employeeId: employee.id,
              trigger: 'REPROCESS',
              delta: Object.keys(delta).length > 0 ? delta : null,
              snapshot: {
                seniorityYears: existingLine.seniorityYears,
                seniorityRate: existingLine.seniorityRate,
                seniorityBonus: existingLine.seniorityBonus,
                baseSalary: existingLine.baseSalary,
                sursalary: existingLine.sursalary,
                transportExempt: existingLine.transportExempt,
                transportTaxable: existingLine.transportTaxable,
                grossTaxable: existingLine.grossTaxable,
                cnpsBase: existingLine.cnpsBase,
                cnpsEmployee: existingLine.cnpsEmployee,
                cmuEmployee: existingLine.cmuEmployee,
                ricf: existingLine.ricf,
                its: existingLine.its,
                totalDeductions: existingLine.totalDeductions,
                cnpsEmployer: existingLine.cnpsEmployer,
                totalEmployerCharges: existingLine.totalEmployerCharges,
                totalGross: existingLine.totalGross,
                netPayable: existingLine.netPayable,
                totalEmployerCost: existingLine.totalEmployerCost,
                controlStatus: existingLine.controlStatus,
                reprocessCount: existingLine.reprocessCount,
              },
              version: existingLine.reprocessCount + 1,
            },
          })

          // Build reprocess history
          const existingHistory = Array.isArray(existingLine.reprocessHistory)
            ? [...existingLine.reprocessHistory]
            : []
          existingHistory.push({
            date: new Date().toISOString(),
            trigger: 'REPROCESS',
            changedFields: Object.keys(delta),
          })

          // Update existing line
          await db.payrollLine.update({
            where: { id: existingLine.id },
            data: {
              salaryProfileId: profile.id,
              matricule: employee.matricule,
              seniorityYears: result.seniorityYears,
              seniorityRate: result.seniorityRate,
              seniorityBonus: result.seniorityBonus,
              baseSalary: result.baseSalary,
              sursalary: result.sursalary,
              transportExempt: result.transportExempt,
              transportTaxable: result.transportTaxable,
              taxablePrimes: result.taxablePrimes,
              taxableBenefits: result.taxableBenefits,
              nonTaxableGains: result.nonTaxableGains,
              grossTaxable: result.grossTaxable,
              cnpsBase: result.cnpsBase,
              cnpsEmployee: result.cnpsEmployee,
              cmuEmployee: result.cmuEmployee,
              ricf: result.ricf,
              its: result.its,
              otherDeductions: result.otherDeductions,
              totalDeductions: result.totalDeductions,
              cnpsEmployer: result.cnpsEmployer,
              familyAllowances: result.familyAllowances,
              workAccident: result.workAccident,
              maternityInsurance: result.maternityInsurance,
              cmuEmployer: result.cmuEmployer,
              isLocalEmployer: result.isLocalEmployer,
              apprenticeshipTax: result.apprenticeshipTax,
              fpcMonthly: result.fpcMonthly,
              fpcEndOfYear: result.fpcEndOfYear,
              totalEmployerCharges: result.totalEmployerCharges,
              totalGross: result.totalGross,
              netPayable: result.netPayable,
              totalEmployerCost: result.totalEmployerCost,
              controlStatus: result.controlStatus,
              calculationSnapshot: parsedSnapshot,
              reprocessHistory: existingHistory,
              reprocessCount: existingLine.reprocessCount + 1,
            },
          })
        } else {
          // Create new line
          await db.payrollLine.create({
            data: {
              periodId,
              salaryProfileId: profile.id,
              employeeId: employee.id,
              matricule: employee.matricule,
              seniorityYears: result.seniorityYears,
              seniorityRate: result.seniorityRate,
              seniorityBonus: result.seniorityBonus,
              baseSalary: result.baseSalary,
              sursalary: result.sursalary,
              transportExempt: result.transportExempt,
              transportTaxable: result.transportTaxable,
              taxablePrimes: result.taxablePrimes,
              taxableBenefits: result.taxableBenefits,
              nonTaxableGains: result.nonTaxableGains,
              grossTaxable: result.grossTaxable,
              cnpsBase: result.cnpsBase,
              cnpsEmployee: result.cnpsEmployee,
              cmuEmployee: result.cmuEmployee,
              ricf: result.ricf,
              its: result.its,
              otherDeductions: result.otherDeductions,
              totalDeductions: result.totalDeductions,
              cnpsEmployer: result.cnpsEmployer,
              familyAllowances: result.familyAllowances,
              workAccident: result.workAccident,
              maternityInsurance: result.maternityInsurance,
              cmuEmployer: result.cmuEmployer,
              isLocalEmployer: result.isLocalEmployer,
              apprenticeshipTax: result.apprenticeshipTax,
              fpcMonthly: result.fpcMonthly,
              fpcEndOfYear: result.fpcEndOfYear,
              totalEmployerCharges: result.totalEmployerCharges,
              totalGross: result.totalGross,
              netPayable: result.netPayable,
              totalEmployerCost: result.totalEmployerCost,
              controlStatus: result.controlStatus,
              calculationSnapshot: parsedSnapshot,
              status: 'Calculé',
            },
          })
        }

        processed++
      } catch (err) {
        errors.push(`${employee.matricule}: ${(err as Error).message}`)
      }
    }

    // 7. Calculate aggregates and update period (short transaction)
    try {
      await db.$transaction(async (tx) => {
        const aggregates = await tx.payrollLine.aggregate({
          where: { periodId },
          _sum: {
            totalGross: true,
            netPayable: true,
            totalEmployerCharges: true,
          },
          _count: true,
        })

        await tx.payrollPeriod.update({
          where: { id: periodId },
          data: {
            totalGross: aggregates._sum.totalGross || 0,
            totalNet: aggregates._sum.netPayable || 0,
            totalCharges: aggregates._sum.totalEmployerCharges || 0,
            lineCount: aggregates._count,
            status: period.status === 'Brouillon' ? 'En cours' : period.status,
          },
        })
      }, { timeout: 30000 }) // 30s timeout for the aggregate transaction
    } catch (txError) {
      // Even if the aggregate update fails, lines were already created
      // Just update the period status without aggregate
      await db.payrollPeriod.update({
        where: { id: periodId },
        data: {
          lineCount: processed,
          status: period.status === 'Brouillon' ? 'En cours' : period.status,
        },
      })
      console.error('Aggregate update failed (non-fatal):', (txError as Error).message)
    }

    // Audit log: batch processing end
    await db.auditLog.create({
      data: {
        action: 'BATCH_PROCESS_END',
        entity: 'PayrollPeriod',
        entityId: periodId,
        details: {
          periodLabel: period.label,
          processed,
          skipped: employees.length - employeesWithProfile.length,
          errors: errors.length,
        },
      },
    })

    // Return updated period
    const updatedPeriod = await db.payrollPeriod.findUnique({ where: { id: periodId } })

    return NextResponse.json({
      success: true,
      processed,
      skipped: employees.length - employeesWithProfile.length,
      errors: errors.length > 0 ? errors : undefined,
      period: updatedPeriod
        ? {
            id: updatedPeriod.id,
            label: updatedPeriod.label,
            startDate: updatedPeriod.startDate,
            endDate: updatedPeriod.endDate,
            status: updatedPeriod.status,
            totalGross: updatedPeriod.totalGross,
            totalNet: updatedPeriod.totalNet,
            totalCharges: updatedPeriod.totalCharges,
            lineCount: updatedPeriod.lineCount,
          }
        : null,
    })
  } catch (error) {
    console.error('Payroll process API error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur', details: (error as Error).message },
      { status: 500 }
    )
  }
}