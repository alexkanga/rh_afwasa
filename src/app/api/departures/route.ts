import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { DEPARTURE_REASONS } from '@/lib/constants'

const REASON_TO_EMPLOYEE_STATUS: Record<string, string> = {
  'Démission': 'Démissionnaire',
  'Licenciement': 'Licencié',
  'Retraite': 'Retraité',
  'Fin de contrat': 'Fin de contrat',
  'Décès': 'Fin de contrat',
  'Autre': 'Fin de contrat',
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const reason = searchParams.get('reason') || ''
    const status = searchParams.get('status') || ''
    const page = Math.max(parseInt(searchParams.get('page') || '0', 10), 0)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10), 1), 100)

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { employee: { matricule: { contains: search, mode: 'insensitive' } } },
        { employee: { lastName: { contains: search, mode: 'insensitive' } } },
        { employee: { firstName: { contains: search, mode: 'insensitive' } } },
      ]
    }
    if (reason) where.reason = reason
    if (status) where.status = status

    const [departures, total] = await Promise.all([
      db.departure.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              matricule: true,
              firstName: true,
              lastName: true,
              currentPosition: true,
              department: { select: { id: true, name: true, direction: { select: { id: true, name: true } } } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: page * limit,
      }),
      db.departure.count({ where }),
    ])

    const formatted = departures.map((d) => ({
      id: d.id,
      employeeId: d.employeeId,
      matricule: d.employee?.matricule || '—',
      employeeName: d.employee
        ? `${d.employee.firstName} ${d.employee.lastName}`
        : '—',
      employeeLastName: d.employee?.lastName || '',
      employeeFirstName: d.employee?.firstName || '',
      currentPosition: d.employee?.currentPosition || '—',
      departmentName: d.employee?.department?.name || '—',
      directionName: d.employee?.department?.direction?.name || '—',
      reason: d.reason,
      type: d.type,
      departureDate: d.departureDate,
      status: d.status,
      notes: d.notes,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }))

    return NextResponse.json({ data: formatted, total, page, limit })
  } catch (error) {
    console.error('[DEPARTURES GET]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des départs' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { employeeId, reason, type, departureDate, notes } = body

    if (!employeeId || !reason || !type || !departureDate) {
      return NextResponse.json(
        { error: 'Champs requis: employeeId, reason, type, departureDate' },
        { status: 400 }
      )
    }

    if (!DEPARTURE_REASONS.includes(reason)) {
      return NextResponse.json(
        { error: `Raison invalide. Valeurs acceptées: ${DEPARTURE_REASONS.join(', ')}` },
        { status: 400 }
      )
    }

    if (!['Volontaire', 'Involontaire'].includes(type)) {
      return NextResponse.json(
        { error: 'Le type doit être Volontaire ou Involontaire' },
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

    // Check for existing active departure
    const existingDeparture = await db.departure.findFirst({
      where: {
        employeeId,
        status: { in: ['Enregistré', 'En cours'] },
      },
    })
    if (existingDeparture) {
      return NextResponse.json(
        { error: 'Cet employé a déjà un départ en cours de traitement' },
        { status: 400 }
      )
    }

    const departure = await db.departure.create({
      data: {
        employeeId,
        reason,
        type,
        departureDate: new Date(departureDate),
        notes: notes || null,
      },
      include: {
        employee: {
          select: {
            id: true,
            matricule: true,
            firstName: true,
            lastName: true,
            currentPosition: true,
            department: { select: { id: true, name: true, direction: { select: { id: true, name: true } } } },
          },
        },
      },
    })

    // Update employee status based on reason
    const newEmployeeStatus = REASON_TO_EMPLOYEE_STATUS[reason] || 'Fin de contrat'
    await db.employee.update({
      where: { id: employeeId },
      data: { status: newEmployeeStatus },
    })

    // Also deactivate active contracts
    await db.contract.updateMany({
      where: { employeeId, status: 'Actif' },
      data: { status: 'Expiré' },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        action: 'CREATE',
        entity: 'Departure',
        entityId: departure.id,
        details: {
          employeeId,
          reason,
          type,
          departureDate,
          newEmployeeStatus,
        },
      },
    })

    const formatted = {
      id: departure.id,
      employeeId: departure.employeeId,
      matricule: departure.employee?.matricule || '—',
      employeeName: departure.employee
        ? `${departure.employee.firstName} ${departure.employee.lastName}`
        : '—',
      employeeLastName: departure.employee?.lastName || '',
      employeeFirstName: departure.employee?.firstName || '',
      currentPosition: departure.employee?.currentPosition || '—',
      departmentName: departure.employee?.department?.name || '—',
      directionName: departure.employee?.department?.direction?.name || '—',
      reason: departure.reason,
      type: departure.type,
      departureDate: departure.departureDate,
      status: departure.status,
      notes: departure.notes,
      createdAt: departure.createdAt,
      updatedAt: departure.updatedAt,
    }

    return NextResponse.json(formatted, { status: 201 })
  } catch (error) {
    console.error('[DEPARTURES POST]', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du départ' },
      { status: 500 }
    )
  }
}