import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ── GET: List all roles with user counts ──
export async function GET() {
  try {
    const roles = await db.role.findMany({
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ data: roles })
  } catch (error) {
    console.error('Roles list API error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}