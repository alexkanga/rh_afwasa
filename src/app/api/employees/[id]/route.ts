import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ── GET single employee with full details ──
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const employee = await db.employee.findUnique({
      where: { id },
      include: {
        direction: { select: { id: true, name: true } },
        department: { select: { id: true, name: true, directionId: true } },
        contracts: {
          orderBy: { startDate: 'desc' },
        },
        salaryProfiles: {
          orderBy: { effectiveFrom: 'desc' },
        },
      },
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employé non trouvé' }, { status: 404 })
    }

    return NextResponse.json(employee)
  } catch (error) {
    console.error('Employee detail API error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ── PUT update employee ──
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const employee = await db.employee.findUnique({ where: { id } })
    if (!employee) {
      return NextResponse.json({ error: 'Employé non trouvé' }, { status: 404 })
    }

    // Separate relational fields from scalar fields
    const { directionId, departmentId, ...scalarData } = body

    const updated = await db.employee.update({
      where: { id },
      data: {
        ...scalarData,
        ...(directionId ? { directionId } : {}),
        ...(departmentId ? { departmentId } : {}),
      },
      include: {
        direction: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Employee update API error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ── DELETE (soft delete) ──
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const employee = await db.employee.findUnique({ where: { id } })
    if (!employee) {
      return NextResponse.json({ error: 'Employé non trouvé' }, { status: 404 })
    }

    // Soft delete: set status to 'Supprimé'
    await db.employee.update({
      where: { id },
      data: { status: 'Supprimé' },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        action: 'DELETE',
        entity: 'Employee',
        entityId: id,
        details: {
          matricule: employee.matricule,
          lastName: employee.lastName,
          firstName: employee.firstName,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Employee delete API error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}