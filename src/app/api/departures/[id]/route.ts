import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const STATUS_WORKFLOW = ['Enregistré', 'En cours', 'Traité', 'Clôturé'] as const

function getNextStatus(current: string): string | null {
  const idx = STATUS_WORKFLOW.indexOf(current as typeof STATUS_WORKFLOW[number])
  if (idx === -1 || idx >= STATUS_WORKFLOW.length - 1) return null
  return STATUS_WORKFLOW[idx + 1]
}

function isValidTransition(from: string, to: string): boolean {
  const next = getNextStatus(from)
  return next === to
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const departure = await db.departure.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            matricule: true,
            firstName: true,
            lastName: true,
            currentPosition: true,
            status: true,
            hireDate: true,
            department: {
              select: {
                id: true,
                name: true,
                direction: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    })

    if (!departure) {
      return NextResponse.json(
        { error: 'Départ non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: departure.id,
      employeeId: departure.employeeId,
      matricule: departure.employee?.matricule || '—',
      employeeName: departure.employee
        ? `${departure.employee.firstName} ${departure.employee.lastName}`
        : '—',
      employeeLastName: departure.employee?.lastName || '',
      employeeFirstName: departure.employee?.firstName || '',
      currentPosition: departure.employee?.currentPosition || '—',
      employeeStatus: departure.employee?.status || '—',
      hireDate: departure.employee?.hireDate || null,
      departmentName: departure.employee?.department?.name || '—',
      directionName: departure.employee?.department?.direction?.name || '—',
      reason: departure.reason,
      type: departure.type,
      departureDate: departure.departureDate,
      status: departure.status,
      notes: departure.notes,
      createdAt: departure.createdAt,
      updatedAt: departure.updatedAt,
      workflow: STATUS_WORKFLOW,
      nextStatus: getNextStatus(departure.status),
    })
  } catch (error) {
    console.error('[DEPARTURES ID GET]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du départ' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { status, notes } = body

    const existing = await db.departure.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Départ non trouvé' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}

    if (notes !== undefined) {
      updateData.notes = notes || null
    }

    if (status !== undefined && status !== existing.status) {
      if (!isValidTransition(existing.status, status)) {
        const expected = getNextStatus(existing.status)
        return NextResponse.json(
          {
            error: `Transition invalide. Statut actuel: ${existing.status}. Prochain statut attendu: ${expected || 'Aucun (déjà clôturé)'}`,
          },
          { status: 400 }
        )
      }
      updateData.status = status
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Aucune modification fournie' },
        { status: 400 }
      )
    }

    const departure = await db.departure.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: {
            id: true,
            matricule: true,
            firstName: true,
            lastName: true,
            currentPosition: true,
            status: true,
            hireDate: true,
            department: {
              select: {
                id: true,
                name: true,
                direction: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        action: 'UPDATE',
        entity: 'Departure',
        entityId: id,
        details: {
          changes: updateData,
          previousStatus: existing.status,
          newStatus: departure.status,
        },
      },
    })

    return NextResponse.json({
      id: departure.id,
      employeeId: departure.employeeId,
      matricule: departure.employee?.matricule || '—',
      employeeName: departure.employee
        ? `${departure.employee.firstName} ${departure.employee.lastName}`
        : '—',
      employeeLastName: departure.employee?.lastName || '',
      employeeFirstName: departure.employee?.firstName || '',
      currentPosition: departure.employee?.currentPosition || '—',
      employeeStatus: departure.employee?.status || '—',
      hireDate: departure.employee?.hireDate || null,
      departmentName: departure.employee?.department?.name || '—',
      directionName: departure.employee?.department?.direction?.name || '—',
      reason: departure.reason,
      type: departure.type,
      departureDate: departure.departureDate,
      status: departure.status,
      notes: departure.notes,
      createdAt: departure.createdAt,
      updatedAt: departure.updatedAt,
      workflow: STATUS_WORKFLOW,
      nextStatus: getNextStatus(departure.status),
    })
  } catch (error) {
    console.error('[DEPARTURES ID PUT]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du départ' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const existing = await db.departure.findUnique({
      where: { id },
      select: { id: true, employeeId: true, status: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Départ non trouvé' },
        { status: 404 }
      )
    }

    // Only allow deletion of "Enregistré" departures
    if (existing.status !== 'Enregistré') {
      return NextResponse.json(
        { error: 'Seuls les départs avec le statut "Enregistré" peuvent être supprimés' },
        { status: 400 }
      )
    }

    await db.departure.delete({ where: { id } })

    // Restore employee status to Actif
    await db.employee.update({
      where: { id: existing.employeeId },
      data: { status: 'Actif' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DEPARTURES ID DELETE]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du départ' },
      { status: 500 }
    )
  }
}