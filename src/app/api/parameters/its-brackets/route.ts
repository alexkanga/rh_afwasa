import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface BracketPayload {
  id?: string
  lowerBound: number
  upperBound: number
  rate: number
  label: string
  order: number
}

// ── PUT: Update ITS brackets ──
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { brackets } = body as { brackets: BracketPayload[] }

    if (!Array.isArray(brackets)) {
      return NextResponse.json({ error: 'Tranches invalides' }, { status: 400 })
    }

    const now = new Date()
    const payloadIds = new Set(brackets.filter(b => b.id).map(b => b.id!))

    // Deactivate brackets not in the payload
    const existingBrackets = await db.taxBracketITS.findMany({
      where: { effectiveTo: null },
    })

    for (const eb of existingBrackets) {
      if (!payloadIds.has(eb.id)) {
        await db.taxBracketITS.update({
          where: { id: eb.id },
          data: { effectiveTo: now },
        })
      }
    }

    // Update or create brackets
    const results = []
    for (const b of brackets) {
      if (b.id) {
        const updated = await db.taxBracketITS.update({
          where: { id: b.id },
          data: {
            lowerBound: b.lowerBound,
            upperBound: b.upperBound,
            rate: b.rate,
            label: b.label,
            order: b.order,
          },
        })
        results.push(updated)
      } else {
        const created = await db.taxBracketITS.create({
          data: {
            lowerBound: b.lowerBound,
            upperBound: b.upperBound,
            rate: b.rate,
            label: b.label,
            order: b.order,
            effectiveFrom: now,
          },
        })
        results.push(created)
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('ITS brackets update error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}