import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

const VALID_TRANSITIONS: Record<string, string> = {
  Brouillon: 'En cours',
  'En cours': 'Validé',
  Validé: 'Clôturé',
}

// ── GET: Single period with aggregate stats ──
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const period = await db.payrollPeriod.findUnique({
      where: { id },
      include: {
        payrollLines: {
          select: {
            id: true,
            employeeId: true,
            matricule: true,
            employee: {
              select: { lastName: true, firstName: true },
            },
            totalGross: true,
            netPayable: true,
            totalEmployerCharges: true,
            controlStatus: true,
            status: true,
          },
          orderBy: { matricule: 'asc' },
        },
      },
    })

    if (!period) {
      return NextResponse.json({ error: 'Période non trouvée' }, { status: 404 })
    }

    // Compute aggregates from lines
    const agg = await db.payrollLine.aggregate({
      where: { periodId: id },
      _sum: {
        totalGross: true,
        netPayable: true,
        totalEmployerCharges: true,
      },
      _count: true,
    })

    const linesWithNames = period.payrollLines.map((l) => ({
      ...l,
      employeeName: `${l.employee.lastName} ${l.employee.firstName}`,
    }))

    return NextResponse.json({
      ...period,
      totalGross: agg._sum.totalGross || 0,
      totalNet: agg._sum.netPayable || 0,
      totalCharges: agg._sum.totalEmployerCharges || 0,
      lineCount: agg._count,
      payrollLines: linesWithNames,
    })
  } catch (error) {
    console.error('Payroll period detail API error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ── PUT: Update period fields + status transitions ──
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const existing = await db.payrollPeriod.findUnique({
      where: { id },
      include: { payrollLines: { select: { id: true } } },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Période non trouvée' }, { status: 404 })
    }

    // Handle status transition
    if (body.status && body.status !== existing.status) {
      const expectedNext = VALID_TRANSITIONS[existing.status]
      if (!expectedNext || body.status !== expectedNext) {
        return NextResponse.json(
          { error: `Transition invalide. "${existing.status}" ne peut passer qu'à "${expectedNext || 'aucun état'}"` },
          { status: 400 }
        )
      }

      await db.payrollPeriod.update({
        where: { id },
        data: { status: body.status },
      })

      await db.auditLog.create({
        data: {
          action: 'STATUS_CHANGE',
          entity: 'PayrollPeriod',
          entityId: id,
          details: {
            from: existing.status,
            to: body.status,
            label: existing.label,
          },
        },
      })

      const updated = await db.payrollPeriod.findUnique({ where: { id } })
      return NextResponse.json(updated)
    }

    // Handle field updates (label, dates, notes)
    const updateData: Record<string, unknown> = {}
    const allowedFields = ['label', 'notes'] as const

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    // Date field updates with validation
    if (body.startDate) {
      const newStart = new Date(body.startDate)
      const newEnd = body.endDate ? new Date(body.endDate) : existing.endDate
      if (newStart >= newEnd) {
        return NextResponse.json(
          { error: 'La date de début doit être antérieure à la date de fin' },
          { status: 400 }
        )
      }
      updateData.startDate = newStart
    }

    if (body.endDate) {
      const newEnd = new Date(body.endDate)
      const currentStart = body.startDate ? new Date(body.startDate) : existing.startDate
      if (currentStart >= newEnd) {
        return NextResponse.json(
          { error: 'La date de début doit être antérieure à la date de fin' },
          { status: 400 }
        )
      }
      const currentPayment = body.paymentDate ? new Date(body.paymentDate) : existing.paymentDate
      if (currentPayment < newEnd) {
        return NextResponse.json(
          { error: 'La date de paiement doit être postérieure ou égale à la date de fin' },
          { status: 400 }
        )
      }
      updateData.endDate = newEnd
    }

    if (body.paymentDate) {
      const newPayment = new Date(body.paymentDate)
      const currentEnd = body.endDate ? new Date(body.endDate) : existing.endDate
      if (newPayment < currentEnd) {
        return NextResponse.json(
          { error: 'La date de paiement doit être postérieure ou égale à la date de fin' },
          { status: 400 }
        )
      }
      updateData.paymentDate = newPayment
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 })
    }

    const updated = await db.payrollPeriod.update({
      where: { id },
      data: updateData,
    })

    await db.auditLog.create({
      data: {
        action: 'UPDATE',
        entity: 'PayrollPeriod',
        entityId: id,
        details: {
          label: existing.label,
          changedFields: Object.keys(updateData),
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Payroll period update API error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ── DELETE: Delete period (only Brouillon with no lines) ──
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.payrollPeriod.findUnique({
      where: { id },
      include: { payrollLines: { select: { id: true }, take: 1 } },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Période non trouvée' }, { status: 404 })
    }

    if (existing.status !== 'Brouillon') {
      return NextResponse.json(
        { error: 'Seules les périodes en statut "Brouillon" peuvent être supprimées' },
        { status: 400 }
      )
    }

    if (existing.payrollLines.length > 0) {
      return NextResponse.json(
        { error: 'Impossible de supprimer une période contenant des lignes de paie' },
        { status: 400 }
      )
    }

    await db.payrollPeriod.delete({ where: { id } })

    await db.auditLog.create({
      data: {
        action: 'DELETE',
        entity: 'PayrollPeriod',
        entityId: id,
        details: { label: existing.label },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Payroll period delete API error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}