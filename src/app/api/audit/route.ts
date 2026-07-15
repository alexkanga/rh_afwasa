import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 200)
    const action = searchParams.get('action') || ''
    const entity = searchParams.get('entity') || ''
    const userId = searchParams.get('userId') || ''
    const search = searchParams.get('search') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''

    const where: Prisma.AuditLogWhereInput = {}

    if (action) where.action = action
    if (entity) where.entity = entity
    if (userId) where.userId = userId
    if (search) {
      where.OR = [
        { userName: { contains: search, mode: 'insensitive' } },
        { userEmail: { contains: search, mode: 'insensitive' } },
        { entity: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (dateFrom) {
      where.createdAt = { ...((where.createdAt as Prisma.DateTimeNullableFilter) || {}), gte: new Date(dateFrom) }
    }
    if (dateTo) {
      const toDate = new Date(dateTo)
      toDate.setHours(23, 59, 59, 999)
      where.createdAt = { ...((where.createdAt as Prisma.DateTimeNullableFilter) || {}), lte: toDate }
    }

    const [data, total, distinctActions, distinctEntities] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.auditLog.count({ where }),
      db.auditLog.findMany({
        select: { action: true },
        distinct: ['action'],
        orderBy: { action: 'asc' },
      }),
      db.auditLog.findMany({
        select: { entity: true },
        distinct: ['entity'],
        orderBy: { entity: 'asc' },
      }),
    ])

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      actions: distinctActions.map((a) => a.action),
      entities: distinctEntities.map((e) => e.entity),
    })
  } catch (error) {
    console.error('Audit logs error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}