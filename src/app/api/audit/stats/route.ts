import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET() {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Start of the week (Monday)
    const dayOfWeek = todayStart.getDay()
    const weekStart = new Date(todayStart)
    weekStart.setDate(todayStart.getDate() - ((dayOfWeek + 6) % 7))

    // Start of the month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Last 30 days for chart data
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    const [
      totalCount,
      todayCount,
      weekCount,
      monthCount,
      topUsers,
      topActions,
      dailyCounts,
    ] = await Promise.all([
      db.auditLog.count(),
      db.auditLog.count({ where: { createdAt: { gte: todayStart } } }),
      db.auditLog.count({ where: { createdAt: { gte: weekStart } } }),
      db.auditLog.count({ where: { createdAt: { gte: monthStart } } }),
      db.auditLog.groupBy({
        by: ['userName'],
        where: { userName: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
      db.auditLog.groupBy({
        by: ['action'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
      // Get raw daily data for last 30 days
      db.auditLog.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ])

    // Build daily count map
    const dailyMap = new Map<string, number>()
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo)
      d.setDate(d.getDate() + i)
      const key = d.toISOString().split('T')[0]
      dailyMap.set(key, 0)
    }
    for (const log of dailyCounts) {
      const key = log.createdAt.toISOString().split('T')[0]
      dailyMap.set(key, (dailyMap.get(key) || 0) + 1)
    }

    const actionCountsByDay = Array.from(dailyMap.entries()).map(([date, count]) => ({
      date,
      count,
    }))

    return NextResponse.json({
      totalCount,
      todayCount,
      weekCount,
      monthCount,
      topUsers: topUsers.map((u) => ({
        userName: u.userName,
        count: u._count.id,
      })),
      topActions: topActions.map((a) => ({
        action: a.action,
        count: a._count.id,
      })),
      actionCountsByDay,
    })
  } catch (error) {
    console.error('Audit stats error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}