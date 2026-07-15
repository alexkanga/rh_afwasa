import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

// ── GET: Single user with full details ──
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const user = await db.user.findUnique({
      where: { id },
      include: {
        role: { select: { id: true, name: true, description: true, permissions: true } },
        employee: {
          select: {
            id: true,
            matricule: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('User detail API error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ── PUT: Update user ──
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const user = await db.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    const { name, email, roleId, password, isActive, employeeId } = body

    // Validate email uniqueness (excluding current user)
    if (email && email !== user.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: 'Format d\'email invalide' }, { status: 400 })
      }
      const existing = await db.user.findFirst({ where: { email, NOT: { id } } })
      if (existing) {
        return NextResponse.json({ error: 'Un utilisateur avec cet email existe déjà' }, { status: 409 })
      }
    }

    // Validate roleId if provided
    if (roleId && roleId !== user.roleId) {
      const role = await db.role.findUnique({ where: { id: roleId } })
      if (!role) {
        return NextResponse.json({ error: 'Rôle introuvable' }, { status: 400 })
      }
    }

    // Validate employeeId if provided
    if (employeeId && employeeId !== user.employeeId) {
      const employee = await db.employee.findUnique({ where: { id: employeeId } })
      if (!employee) {
        return NextResponse.json({ error: 'Employé introuvable' }, { status: 400 })
      }
      const existingLink = await db.user.findFirst({
        where: { employeeId, NOT: { id } },
      })
      if (existingLink) {
        return NextResponse.json({ error: 'Cet employé est déjà lié à un autre utilisateur' }, { status: 409 })
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (roleId !== undefined) updateData.roleId = roleId
    if (password) updateData.passwordHash = hashPassword(password)
    if (isActive !== undefined) updateData.isActive = isActive
    if (employeeId !== undefined) updateData.employeeId = employeeId || null

    const updated = await db.user.update({
      where: { id },
      data: updateData,
      include: {
        role: { select: { id: true, name: true, description: true } },
        employee: {
          select: { id: true, matricule: true, firstName: true, lastName: true },
        },
      },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        action: 'UPDATE',
        entity: 'User',
        entityId: id,
        details: { email: updated.email, name: updated.name, changedFields: Object.keys(updateData) },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('User update API error:', error)
    const message =
      error instanceof Error && error.message.includes('Unique')
        ? 'Un utilisateur avec cet email ou cet employé existe déjà'
        : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ── DELETE: Deactivate user (soft delete) ──
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const user = await db.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    // Protect Fantomas account from deletion/deactivation
    if (user.email === 'fantomas@afwasa.org') {
      return NextResponse.json(
        { error: 'Le compte Fantôme est géré automatiquement et ne peut pas être désactivé' },
        { status: 403 }
      )
    }

    // Soft delete: set isActive = false
    const deactivated = await db.user.update({
      where: { id },
      data: { isActive: false },
      include: {
        role: { select: { id: true, name: true, description: true } },
      },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        action: 'DELETE',
        entity: 'User',
        entityId: id,
        details: { email: user.email, name: user.name },
      },
    })

    return NextResponse.json(deactivated)
  } catch (error) {
    console.error('User delete API error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}