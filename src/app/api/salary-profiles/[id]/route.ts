import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ── GET: Single profile with employee info + version history ──
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const profile = await db.salaryProfile.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            matricule: true,
            lastName: true,
            firstName: true,
            currentPosition: true,
            direction: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
          },
        },
        payrollLines: {
          select: { id: true },
          take: 1,
        },
      },
    })

    if (!profile) {
      return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 })
    }

    // Fetch all versions for this employee (version history)
    const versions = await db.salaryProfile.findMany({
      where: { employeeId: profile.employeeId },
      select: {
        id: true,
        version: true,
        effectiveFrom: true,
        effectiveTo: true,
        baseSalary: true,
        sursalary: true,
        status: true,
      },
      orderBy: { version: 'desc' },
    })

    return NextResponse.json({ ...profile, versionHistory: versions })
  } catch (error) {
    console.error('Salary profile detail API error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ── PUT: Update profile fields ──
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const existing = await db.salaryProfile.findUnique({
      where: { id },
      include: {
        payrollLines: { select: { id: true } },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 })
    }

    // Check if baseSalary or sursalary changed and there are linked payroll lines
    const salaryChanged =
      (body.baseSalary !== undefined && body.baseSalary !== existing.baseSalary) ||
      (body.sursalary !== undefined && body.sursalary !== existing.sursalary)

    if (salaryChanged && existing.payrollLines.length > 0) {
      // Archive each affected payroll line before updating
      for (const line of existing.payrollLines) {
        await db.payslipArchive.create({
          data: {
            payrollLineId: line.id,
            employeeId: existing.employeeId,
            trigger: 'PROFILE_UPDATE',
            delta: {
              baseSalary: {
                old: existing.baseSalary,
                new: body.baseSalary ?? existing.baseSalary,
              },
              sursalary: {
                old: existing.sursalary,
                new: body.sursalary ?? existing.sursalary,
              },
            },
            snapshot: {
              profileVersion: existing.version,
              effectiveFrom: existing.effectiveFrom.toISOString(),
              previousBaseSalary: existing.baseSalary,
              previousSursalary: existing.sursalary,
            },
            version: 1,
          },
        })
      }
    }

    // Build update data (only include provided fields)
    const updateData: Record<string, unknown> = {}
    const allowedFields = [
      'baseSalary', 'sursalary', 'igrParts', 'cmuEmployeeCount',
      'cmuEmployerCount', 'transportAllowance', 'taxablePrimes',
      'taxableBenefits', 'nonTaxableAllowances', 'atRate',
      'specificCnpsBase', 'comment',
    ] as const

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    // Allow null for optional fields
    if ('atRate' in body && body.atRate === null) updateData.atRate = null
    if ('specificCnpsBase' in body && body.specificCnpsBase === null) updateData.specificCnpsBase = null

    const updated = await db.salaryProfile.update({
      where: { id },
      data: updateData,
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
        action: 'UPDATE',
        entity: 'SalaryProfile',
        entityId: id,
        details: {
          employeeId: existing.employeeId,
          version: existing.version,
          changedFields: Object.keys(updateData),
          archivedLines: salaryChanged ? existing.payrollLines.length : 0,
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Salary profile update API error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ── DELETE: Soft delete ──
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.salaryProfile.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 })
    }

    await db.salaryProfile.update({
      where: { id },
      data: { status: 'Supprimé' },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        action: 'DELETE',
        entity: 'SalaryProfile',
        entityId: id,
        details: {
          employeeId: existing.employeeId,
          version: existing.version,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Salary profile delete API error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}