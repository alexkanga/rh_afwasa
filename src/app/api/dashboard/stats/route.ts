import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const BRAND_COLORS = ['#362981', '#009446', '#029CB1', '#C7FFEE']

export async function GET() {
  try {
    const [
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      cdiCount,
      cddCount,
      totalDepartments,
      totalDirections,
    ] = await Promise.all([
      db.employee.count(),
      db.employee.count({ where: { status: 'Actif' } }),
      db.employee.count({ where: { status: { not: 'Actif' } } }),
      db.contract.count({ where: { type: 'CDI', status: 'Actif' } }),
      db.contract.count({ where: { type: 'CDD', status: 'Actif' } }),
      db.department.count(),
      db.direction.count(),
    ])

    const latestPeriod = await db.payrollPeriod.findFirst({
      orderBy: { createdAt: 'desc' },
    })

    let totalGross = 0
    let totalNet = 0
    let totalCharges = 0
    if (latestPeriod) {
      const aggs = await db.payrollLine.aggregate({
        where: { periodId: latestPeriod.id },
        _sum: { totalGross: true, netPayable: true, totalEmployerCharges: true },
      })
      totalGross = aggs._sum.totalGross || 0
      totalNet = aggs._sum.netPayable || 0
      totalCharges = aggs._sum.totalEmployerCharges || 0
    }

    const sixtyDaysFromNow = new Date()
    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60)
    const expiringContracts = await db.contract.count({
      where: {
        status: 'Actif',
        endDate: { lte: sixtyDaysFromNow, gte: new Date() },
        type: { not: 'CDI' },
      },
    })

    const incompleteProfiles = await db.salaryProfile.count({
      where: { status: 'Actif', baseSalary: 0, sursalary: 0 },
    })

    // --- Chart data ---

    // Employees by direction
    const dirGroups = await db.employee.groupBy({
      by: ['directionId'],
      where: { directionId: { not: null } },
      _count: { id: true },
    })

    const directions = await db.direction.findMany({
      select: { id: true, name: true },
    })
    const dirMap = new Map(directions.map((d) => [d.id, d.name]))

    const byDirection = dirGroups
      .map((g, i) => ({
        name: dirMap.get(g.directionId) || 'Sans direction',
        count: g._count.id,
        color: BRAND_COLORS[i % BRAND_COLORS.length],
      }))
      .sort((a, b) => b.count - a.count)

    // Employees by contract type
    const contractGroups = await db.contract.groupBy({
      by: ['type'],
      _count: { id: true },
    })
    const byContractType = contractGroups.map((g) => ({
      name: g.type,
      count: g._count.id,
    }))

    // Employees by status
    const statusGroups = await db.employee.groupBy({
      by: ['status'],
      _count: { id: true },
    })
    const byStatus = statusGroups.map((g) => ({
      name: g.status,
      count: g._count.id,
    }))

    // Monthly payroll total (sum of active salary profiles)
    const payrollSum = await db.salaryProfile.aggregate({
      where: { status: 'Actif' },
      _sum: { baseSalary: true, sursalary: true, transportAllowance: true },
    })
    const monthlyPayrollTotal =
      (payrollSum._sum.baseSalary || 0) +
      (payrollSum._sum.sursalary || 0) +
      (payrollSum._sum.transportAllowance || 0)

    return NextResponse.json({
      totalEmployees, activeEmployees, inactiveEmployees,
      cdiCount, cddCount, totalDepartments, totalDirections,
      totalGross, totalNet, totalCharges,
      expiringContracts, incompleteProfiles,
      latestPeriod: latestPeriod ? { id: latestPeriod.id, label: latestPeriod.label, status: latestPeriod.status } : null,
      byDirection,
      byContractType,
      byStatus,
      monthlyPayrollTotal,
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}