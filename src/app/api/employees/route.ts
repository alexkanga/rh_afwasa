import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const directionId = searchParams.get('directionId') || ''
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')
    const groupBy = searchParams.get('groupBy')

    const limit = Math.min(Math.max(parseInt(limitParam || '50', 10), 1), 200)
    const offset = Math.max(parseInt(offsetParam || '0', 10), 0)

    // ── Group by direction (for dashboard charts) ──
    if (groupBy === 'direction') {
      const groups = await db.employee.groupBy({
        by: ['directionId'],
        where: {
          directionId: { not: null },
          ...(status ? { status } : {}),
          ...(search
            ? {
                OR: [
                  { lastName: { contains: search, mode: 'insensitive' } },
                  { firstName: { contains: search, mode: 'insensitive' } },
                  { matricule: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        _count: { id: true },
      })

      // Resolve direction names
      const directionIds = groups.map((g) => g.directionId!)
      const directions = await db.direction.findMany({
        where: { id: { in: directionIds } },
        select: { id: true, name: true },
      })
      const dirMap = new Map(directions.map((d) => [d.id, d.name]))

      const data = groups
        .map((g) => ({
          name: dirMap.get(g.directionId!) || 'Sans direction',
          _count: g._count.id,
        }))
        .sort((a, b) => b._count - a._count)

      return NextResponse.json(data)
    }

    // ── Group by contract type (for dashboard charts) ──
    if (groupBy === 'contractType') {
      const cdiCount = await db.contract.count({
        where: { type: 'CDI', status: 'Actif' },
      })
      const cddCount = await db.contract.count({
        where: { type: 'CDD', status: 'Actif' },
      })

      return NextResponse.json([
        { name: 'CDI', _count: cdiCount },
        { name: 'CDD', _count: cddCount },
      ])
    }

    // ── Standard paginated list ──
    const where: Prisma.EmployeeWhereInput = {
      ...(status ? { status } : {}),
      ...(directionId ? { directionId } : {}),
      ...(search
        ? {
            OR: [
              { lastName: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { matricule: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const [data, total] = await Promise.all([
      db.employee.findMany({
        where,
        select: {
          id: true,
          matricule: true,
          lastName: true,
          firstName: true,
          currentPosition: true,
          status: true,
          hireDate: true,
          direction: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
          contracts: {
            where: { status: 'Actif' },
            select: { type: true, startDate: true, endDate: true },
            orderBy: { startDate: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.employee.count({ where }),
    ])

    // Enrich with computed fields
    const enriched = data.map((emp) => ({
      ...emp,
      directionName: emp.direction?.name || '—',
      contractType: emp.contracts[0]?.type || '—',
    }))

    return NextResponse.json({ data: enriched, total })
  } catch (error) {
    console.error('Employees API error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ── POST create employee ──
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const { directionId, departmentId, contractType, hireDate, ...employeeData } = body

    // Create employee
    const employee = await db.employee.create({
      data: {
        ...employeeData,
        hireDate: hireDate ? new Date(hireDate) : null,
        dateOfBirth: employeeData.dateOfBirth ? new Date(employeeData.dateOfBirth) : null,
        directionId: directionId || null,
        departmentId: departmentId || null,
      },
      include: {
        direction: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    })

    // Create initial contract if type and hire date provided
    if (contractType && hireDate) {
      const endDate = contractType === 'CDD'
        ? new Date(new Date(hireDate).getTime() + 365 * 24 * 60 * 60 * 1000)
        : null

      await db.contract.create({
        data: {
          employeeId: employee.id,
          type: contractType,
          startDate: new Date(hireDate),
          endDate,
          status: 'Actif',
        },
      })
    }

    // Audit log
    await db.auditLog.create({
      data: {
        action: 'CREATE',
        entity: 'Employee',
        entityId: employee.id,
        details: {
          matricule: employee.matricule,
          lastName: employee.lastName,
          firstName: employee.firstName,
        },
      },
    })

    return NextResponse.json(employee, { status: 201 })
  } catch (error: unknown) {
    console.error('Employee create API error:', error)
    const message = error instanceof Error && error.message.includes('Unique')
      ? 'Un employé avec ce matricule existe déjà'
      : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}