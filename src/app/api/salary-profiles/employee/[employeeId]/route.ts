import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { employeeId } = await params

    const profiles = await db.salaryProfile.findMany({
      where: { employeeId },
      orderBy: { effectiveFrom: 'desc' },
    })

    return NextResponse.json(profiles)
  } catch (error) {
    console.error('Salary profiles API error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}