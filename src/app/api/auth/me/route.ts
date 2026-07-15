import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const payload = verifyToken(authHeader.slice(7))
    if (!payload) {
      return NextResponse.json({ error: 'Token invalide ou expiré' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: payload.userId },
      include: { role: true, employee: true },
    })

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    return NextResponse.json({
      userId: user.id,
      email: user.email,
      name: user.name,
      roleName: user.role.name,
      employeeId: user.employeeId,
      employeeName: user.employee ? `${user.employee.lastName} ${user.employee.firstName}` : null,
    })
  } catch (error) {
    console.error('Auth me error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}