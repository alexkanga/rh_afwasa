import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// ── GET: List payroll periods with line counts ──
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || ''

    const where: Prisma.PayrollPeriodWhereInput = {
      ...(status ? { status } : {}),
    }

    const [periods, total] = await Promise.all([
      db.payrollPeriod.findMany({
        where,
        select: {
          id: true,
          label: true,
          startDate: true,
          endDate: true,
          paymentDate: true,
          status: true,
          totalGross: true,
          totalNet: true,
          totalCharges: true,
          lineCount: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { payrollLines: true } },
        },
        orderBy: { startDate: 'desc' },
      }),
      db.payrollPeriod.count({ where }),
    ])

    const data = periods.map((p) => ({
      ...p,
      lineCount: p._count.payrollLines,
    }))

    return NextResponse.json({ data, total })
  } catch (error) {
    console.error('Payroll periods list API error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ── POST: Create a new payroll period ──
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { label, startDate, endDate, paymentDate, notes } = body

    if (!label || !startDate || !endDate || !paymentDate) {
      return NextResponse.json(
        { error: 'label, startDate, endDate et paymentDate sont requis' },
        { status: 400 }
      )
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    const payment = new Date(paymentDate)

    if (start >= end) {
      return NextResponse.json(
        { error: 'La date de début doit être antérieure à la date de fin' },
        { status: 400 }
      )
    }

    if (payment < end) {
      return NextResponse.json(
        { error: 'La date de paiement doit être postérieure ou égale à la date de fin' },
        { status: 400 }
      )
    }

    // Check for unique constraint (startDate, endDate)
    const existing = await db.payrollPeriod.findUnique({
      where: { startDate_endDate: { startDate: start, endDate: end } },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Une période avec ces mêmes dates existe déjà' },
        { status: 409 }
      )
    }

    const period = await db.payrollPeriod.create({
      data: {
        label,
        startDate: start,
        endDate: end,
        paymentDate: payment,
        status: 'Brouillon',
        notes: notes || null,
      },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        action: 'CREATE',
        entity: 'PayrollPeriod',
        entityId: period.id,
        details: { label, startDate: start.toISOString(), endDate: end.toISOString() },
      },
    })

    return NextResponse.json(period, { status: 201 })
  } catch (error) {
    console.error('Payroll period create API error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}