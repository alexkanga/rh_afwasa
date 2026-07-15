import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const contract = await db.contract.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            matricule: true,
            firstName: true,
            lastName: true,
            currentPosition: true,
            department: { select: { name: true } },
            direction: { select: { name: true } },
          },
        },
      },
    })

    if (!contract) {
      return NextResponse.json(
        { error: 'Contrat non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: contract.id,
      employeeId: contract.employeeId,
      matricule: contract.employee?.matricule || '—',
      employeeName: contract.employee
        ? `${contract.employee.firstName} ${contract.employee.lastName}`
        : '—',
      position: contract.employee?.currentPosition || '—',
      departmentName: contract.employee?.department?.name || '—',
      directionName: contract.employee?.direction?.name || '—',
      type: contract.type,
      startDate: contract.startDate,
      endDate: contract.endDate,
      status: contract.status,
      notes: contract.notes,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
    })
  } catch (error) {
    console.error('[CONTRACTS ID GET]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du contrat' },
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
    const { type, startDate, endDate, status, notes } = body

    const existing = await db.contract.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Contrat non trouvé' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (type !== undefined) {
      if (!['CDI', 'CDD'].includes(type)) {
        return NextResponse.json(
          { error: 'Le type doit être CDI ou CDD' },
          { status: 400 }
        )
      }
      updateData.type = type
    }
    if (startDate !== undefined) updateData.startDate = new Date(startDate)
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null
    if (status !== undefined) updateData.status = status
    if (notes !== undefined) updateData.notes = notes

    const contract = await db.contract.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: {
            id: true,
            matricule: true,
            firstName: true,
            lastName: true,
            direction: { select: { name: true } },
          },
        },
      },
    })

    return NextResponse.json({
      id: contract.id,
      employeeId: contract.employeeId,
      matricule: contract.employee?.matricule || '—',
      employeeName: contract.employee
        ? `${contract.employee.firstName} ${contract.employee.lastName}`
        : '—',
      directionName: contract.employee?.direction?.name || '—',
      type: contract.type,
      startDate: contract.startDate,
      endDate: contract.endDate,
      status: contract.status,
      notes: contract.notes,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
    })
  } catch (error) {
    console.error('[CONTRACTS ID PUT]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du contrat' },
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
    const existing = await db.contract.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Contrat non trouvé' },
        { status: 404 }
      )
    }

    await db.contract.update({
      where: { id },
      data: { status: 'Expiré' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[CONTRACTS ID DELETE]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du contrat' },
      { status: 500 }
    )
  }
}