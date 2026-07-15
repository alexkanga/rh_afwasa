import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const employees = await db.employee.findMany({
      where: {
        status: 'Actif',
        departures: {
          none: {
            status: { in: ['Enregistré', 'En cours'] },
          },
        },
      },
      select: {
        id: true,
        matricule: true,
        lastName: true,
        firstName: true,
        currentPosition: true,
        department: {
          select: {
            name: true,
            direction: { select: { name: true } },
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })

    const formatted = employees.map((e) => ({
      id: e.id,
      matricule: e.matricule,
      lastName: e.lastName,
      firstName: e.firstName,
      currentPosition: e.currentPosition || '—',
      departmentName: e.department?.name || '—',
      directionName: e.department?.direction?.name || '—',
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error('[EMPLOYEES ACTIVE GET]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des employés actifs' },
      { status: 500 }
    )
  }
}