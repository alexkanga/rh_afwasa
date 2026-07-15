import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const directionId = searchParams.get('directionId') || ''

    const departments = await db.department.findMany({
      where: directionId ? { directionId } : undefined,
      include: {
        direction: { select: { id: true, name: true } },
        _count: { select: { employees: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(departments)
  } catch (error) {
    console.error('Departments API error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}