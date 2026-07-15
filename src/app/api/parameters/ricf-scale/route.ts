import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RicfPayload {
  id?: string
  igrParts: number
  monthlyAmount: number
}

// ── PUT: Update RICF scale ──
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { entries } = body as { entries: RicfPayload[] }

    if (!Array.isArray(entries)) {
      return NextResponse.json({ error: 'Entrées invalides' }, { status: 400 })
    }

    const now = new Date()
    const payloadIds = new Set(entries.filter(e => e.id).map(e => e.id!))

    // Deactivate entries not in the payload
    const existingEntries = await db.ricfScale.findMany({
      where: { effectiveTo: null },
    })

    for (const ee of existingEntries) {
      if (!payloadIds.has(ee.id)) {
        await db.ricfScale.update({
          where: { id: ee.id },
          data: { effectiveTo: now },
        })
      }
    }

    // Update or create entries
    const results = []
    for (const e of entries) {
      if (e.id) {
        const updated = await db.ricfScale.update({
          where: { id: e.id },
          data: {
            igrParts: e.igrParts,
            monthlyAmount: e.monthlyAmount,
          },
        })
        results.push(updated)
      } else {
        const created = await db.ricfScale.create({
          data: {
            igrParts: e.igrParts,
            monthlyAmount: e.monthlyAmount,
            effectiveFrom: now,
          },
        })
        results.push(created)
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('RICF scale update error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}