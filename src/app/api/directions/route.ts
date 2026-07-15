import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const directions = await db.direction.findMany({
      include: {
        _count: { select: { employees: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(directions)
  } catch (error) {
    console.error('Directions API error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}