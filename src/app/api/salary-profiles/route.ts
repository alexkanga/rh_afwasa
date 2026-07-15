import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// ── GET: List salary profiles with employee info ──
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '100', 10), 1), 200)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0)

    const where: Prisma.SalaryProfileWhereInput = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            employee: {
              OR: [
                { lastName: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { matricule: { contains: search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    }

    const [data, total] = await Promise.all([
      db.salaryProfile.findMany({
        where,
        select: {
          id: true,
          employeeId: true,
          baseSalary: true,
          sursalary: true,
          igrParts: true,
          cmuEmployeeCount: true,
          cmuEmployerCount: true,
          transportAllowance: true,
          taxablePrimes: true,
          taxableBenefits: true,
          nonTaxableAllowances: true,
          atRate: true,
          specificCnpsBase: true,
          effectiveFrom: true,
          effectiveTo: true,
          status: true,
          version: true,
          comment: true,
          createdAt: true,
          employee: {
            select: {
              matricule: true,
              lastName: true,
              firstName: true,
              direction: { select: { name: true } },
            },
          },
        },
        orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        skip: offset,
      }),
      db.salaryProfile.count({ where }),
    ])

    const enriched = data.map((sp) => ({
      ...sp,
      employeeName: `${sp.employee.lastName} ${sp.employee.firstName}`,
      directionName: sp.employee.direction?.name || '—',
    }))

    return NextResponse.json({ data: enriched, total })
  } catch (error) {
    console.error('Salary profiles list API error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ── POST: Create salary profile (with versioning) ──
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { employeeId, effectiveFrom, ...fields } = body

    if (!employeeId || !effectiveFrom) {
      return NextResponse.json(
        { error: 'employeeId et effectiveFrom sont requis' },
        { status: 400 }
      )
    }

    // Check employee exists
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      select: { id: true },
    })
    if (!employee) {
      return NextResponse.json({ error: 'Employé non trouvé' }, { status: 404 })
    }

    const newEffectiveFrom = new Date(effectiveFrom)

    // Find the current active profile for this employee
    const activeProfile = await db.salaryProfile.findFirst({
      where: {
        employeeId,
        status: 'Actif',
      },
      orderBy: { version: 'desc' },
    })

    let nextVersion = 1

    // If there's an active profile, close it and increment version
    if (activeProfile) {
      nextVersion = activeProfile.version + 1
      const closeDate = new Date(newEffectiveFrom)
      closeDate.setDate(closeDate.getDate() - 1)

      await db.salaryProfile.update({
        where: { id: activeProfile.id },
        data: {
          effectiveTo: closeDate,
          status: 'Inactif',
        },
      })
    } else {
      // No active profile — find max version ever for this employee
      const maxVersion = await db.salaryProfile.aggregate({
        where: { employeeId },
        _max: { version: true },
      })
      nextVersion = (maxVersion._max.version || 0) + 1
    }

    // Create the new salary profile
    const profile = await db.salaryProfile.create({
      data: {
        employeeId,
        effectiveFrom: newEffectiveFrom,
        baseSalary: fields.baseSalary ?? 0,
        sursalary: fields.sursalary ?? 0,
        igrParts: fields.igrParts ?? 1,
        cmuEmployeeCount: fields.cmuEmployeeCount ?? 1,
        cmuEmployerCount: fields.cmuEmployerCount ?? 1,
        transportAllowance: fields.transportAllowance ?? 0,
        taxablePrimes: fields.taxablePrimes ?? 0,
        taxableBenefits: fields.taxableBenefits ?? 0,
        nonTaxableAllowances: fields.nonTaxableAllowances ?? 0,
        atRate: fields.atRate ?? null,
        specificCnpsBase: fields.specificCnpsBase ?? null,
        comment: fields.comment ?? null,
        status: 'Actif',
        version: nextVersion,
      },
      include: {
        employee: {
          select: {
            matricule: true,
            lastName: true,
            firstName: true,
            direction: { select: { name: true } },
          },
        },
      },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        action: 'CREATE',
        entity: 'SalaryProfile',
        entityId: profile.id,
        details: {
          employeeId,
          version: nextVersion,
          effectiveFrom: newEffectiveFrom.toISOString(),
          baseSalary: fields.baseSalary,
        },
      },
    })

    return NextResponse.json(profile, { status: 201 })
  } catch (error) {
    console.error('Salary profile create API error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}