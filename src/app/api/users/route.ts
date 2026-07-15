import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { Prisma } from '@prisma/client'

// ── GET: List users with role info, last login, and employee relation ──
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const roleId = searchParams.get('roleId') || ''
    const isActive = searchParams.get('isActive') || ''
    const pageParam = searchParams.get('page') || '1'
    const limitParam = searchParams.get('limit') || '20'

    const page = Math.max(parseInt(pageParam, 10), 1)
    const limit = Math.min(Math.max(parseInt(limitParam, 10), 1), 100)
    const skip = (page - 1) * limit

    // Build where clause
    const where: Prisma.UserWhereInput = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(roleId ? { roleId } : {}),
      ...(isActive !== '' ? { isActive: isActive === 'true' } : {}),
    }

    const [data, total, roles] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          employeeId: true,
          role: {
            select: { id: true, name: true, description: true },
          },
          employee: {
            select: {
              id: true,
              matricule: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      db.user.count({ where }),
      db.role.findMany({
        select: { id: true, name: true, description: true, permissions: true, createdAt: true, updatedAt: true },
        orderBy: { name: 'asc' },
      }),
    ])

    return NextResponse.json({ data, total, page, limit, roles })
  } catch (error) {
    console.error('Users list API error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ── POST: Create new user ──
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, name, roleId, employeeId } = body

    // Validate required fields
    if (!email || !password || !name || !roleId) {
      return NextResponse.json(
        { error: 'Email, mot de passe, nom et rôle sont requis' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Format d\'email invalide' }, { status: 400 })
    }

    // Validate email uniqueness
    const existingUser = await db.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: 'Un utilisateur avec cet email existe déjà' }, { status: 409 })
    }

    // Validate roleId exists
    const role = await db.role.findUnique({ where: { id: roleId } })
    if (!role) {
      return NextResponse.json({ error: 'Rôle introuvable' }, { status: 400 })
    }

    // Validate employeeId if provided
    if (employeeId) {
      const employee = await db.employee.findUnique({ where: { id: employeeId } })
      if (!employee) {
        return NextResponse.json({ error: 'Employé introuvable' }, { status: 400 })
      }
      // Check if employee is already linked to another user
      const existingLink = await db.user.findFirst({ where: { employeeId } })
      if (existingLink) {
        return NextResponse.json({ error: 'Cet employé est déjà lié à un autre utilisateur' }, { status: 409 })
      }
    }

    // Create user
    const user = await db.user.create({
      data: {
        email,
        passwordHash: hashPassword(password),
        name,
        roleId,
        employeeId: employeeId || null,
      },
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
        action: 'CREATE',
        entity: 'User',
        entityId: user.id,
        details: { email: user.email, name: user.name, roleName: user.role.name },
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('User create API error:', error)
    const message =
      error instanceof Error && error.message.includes('Unique')
        ? 'Un utilisateur avec cet email ou cet employé existe déjà'
        : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}