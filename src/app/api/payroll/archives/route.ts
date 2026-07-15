import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const payrollLineId = searchParams.get('payrollLineId')
    const employeeId = searchParams.get('employeeId')

    if (!payrollLineId && !employeeId) {
      return NextResponse.json(
        { error: 'Paramètre payrollLineId ou employeeId requis' },
        { status: 400 }
      )
    }

    const archives = await db.payslipArchive.findMany({
      where: {
        ...(payrollLineId ? { payrollLineId } : {}),
        ...(employeeId ? { employeeId } : {}),
      },
      include: {
        employee: {
          select: { id: true, matricule: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    const formatted = archives.map((a) => ({
      id: a.id,
      payrollLineId: a.payrollLineId,
      employeeId: a.employeeId,
      employeeName: a.employee
        ? `${a.employee.firstName} ${a.employee.lastName}`
        : '—',
      employeeMatricule: a.employee?.matricule || '—',
      trigger: a.trigger,
      delta: a.delta,
      snapshot: a.snapshot,
      version: a.version,
      createdAt: a.createdAt,
    }))

    return NextResponse.json({ data: formatted, total: formatted.length })
  } catch (error) {
    console.error('[ARCHIVES GET]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des archives' },
      { status: 500 }
    )
  }
}