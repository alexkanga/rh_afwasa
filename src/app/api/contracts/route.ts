import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || ''
    const status = searchParams.get('status') || ''
    const page = parseInt(searchParams.get('page') || '0', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { employee: { matricule: { contains: search, mode: 'insensitive' } } },
        { employee: { lastName: { contains: search, mode: 'insensitive' } } },
        { employee: { firstName: { contains: search, mode: 'insensitive' } } },
      ]
    }
    if (type) where.type = type
    if (status) where.status = status

    const [contracts, total] = await Promise.all([
      db.contract.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              matricule: true,
              firstName: true,
              lastName: true,
              direction: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: page * limit,
      }),
      db.contract.count({ where }),
    ])

    const formatted = contracts.map((c) => ({
      id: c.id,
      employeeId: c.employeeId,
      matricule: c.employee?.matricule || '—',
      employeeName: c.employee
        ? `${c.employee.firstName} ${c.employee.lastName}`
        : '—',
      directionName: c.employee?.direction?.name || '—',
      type: c.type,
      startDate: c.startDate,
      endDate: c.endDate,
      status: c.status,
      notes: c.notes,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }))

    return NextResponse.json({ data: formatted, total })
  } catch (error) {
    console.error('[CONTRACTS GET]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des contrats' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { employeeId, type, startDate, endDate, notes } = body

    if (!employeeId || !type || !startDate) {
      return NextResponse.json(
        { error: 'Champs requis: employeeId, type, startDate' },
        { status: 400 }
      )
    }

    if (!['CDI', 'CDD'].includes(type)) {
      return NextResponse.json(
        { error: 'Le type doit être CDI ou CDD' },
        { status: 400 }
      )
    }

    const employee = await db.employee.findUnique({
      where: { id: employeeId },
    })
    if (!employee) {
      return NextResponse.json(
        { error: 'Employé non trouvé' },
        { status: 404 }
      )
    }

    const contract = await db.contract.create({
      data: {
        employeeId,
        type,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        notes: notes || null,
      },
      include: {
        employee: {
          select: {
            id: true,
            matricule: true,
            firstName: true,
            lastName: true,
            direction: { select: { name: true } },
          },
        },
      },
    })

    const formatted = {
      id: contract.id,
      employeeId: contract.employeeId,
      matricule: contract.employee?.matricule || '—',
      employeeName: contract.employee
        ? `${contract.employee.firstName} ${contract.employee.lastName}`
        : '—',
      directionName: contract.employee?.direction?.name || '—',
      type: contract.type,
      startDate: contract.startDate,
      endDate: contract.endDate,
      status: contract.status,
      notes: contract.notes,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
    }

    return NextResponse.json(formatted, { status: 201 })
  } catch (error) {
    console.error('[CONTRACTS POST]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du contrat' },
      { status: 500 }
    )
  }
}