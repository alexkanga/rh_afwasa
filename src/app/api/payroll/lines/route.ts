import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// ── GET: List payroll lines for a period ──
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const periodId = searchParams.get('periodId')
    const controlStatus = searchParams.get('controlStatus')
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '100', 10), 1), 500)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0)

    if (!periodId) {
      return NextResponse.json({ error: 'periodId est requis' }, { status: 400 })
    }

    // Verify period exists
    const period = await db.payrollPeriod.findUnique({
      where: { id: periodId },
      select: { id: true, label: true, status: true },
    })
    if (!period) {
      return NextResponse.json({ error: 'Période non trouvée' }, { status: 404 })
    }

    const where: Prisma.PayrollLineWhereInput = {
      periodId,
      ...(controlStatus ? { controlStatus } : {}),
    }

    const [data, total] = await Promise.all([
      db.payrollLine.findMany({
        where,
        select: {
          id: true,
          periodId: true,
          employeeId: true,
          matricule: true,
          baseSalary: true,
          sursalary: true,
          totalGross: true,
          totalDeductions: true,
          netPayable: true,
          totalEmployerCharges: true,
          totalEmployerCost: true,
          controlStatus: true,
          status: true,
          reprocessCount: true,
          createdAt: true,
          employee: {
            select: {
              matricule: true,
              lastName: true,
              firstName: true,
              currentPosition: true,
              direction: { select: { name: true } },
            },
          },
        },
        orderBy: { matricule: 'asc' },
        take: limit,
        skip: offset,
      }),
      db.payrollLine.count({ where }),
    ])

    const enriched = data.map((line) => ({
      ...line,
      employeeName: `${line.employee.lastName} ${line.employee.firstName}`,
      directionName: line.employee.direction?.name || '—',
      position: line.employee.currentPosition || '—',
    }))

    return NextResponse.json({ data: enriched, total, period })
  } catch (error) {
    console.error('Payroll lines list API error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}