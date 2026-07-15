import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ── PUT: Update a single payroll parameter value ──
// Supports lookup by ID or by code (passed as route param)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { value, description } = body as { value: number; description?: string }

    if (value === undefined || value === null) {
      return NextResponse.json({ error: 'La valeur est requise' }, { status: 400 })
    }

    // Try finding by ID first, then by code
    let existing = await db.payrollParameter.findUnique({
      where: { id },
    })

    if (!existing) {
      existing = await db.payrollParameter.findFirst({
        where: { code: id, status: 'Actif' },
      })
    }

    if (!existing) {
      return NextResponse.json({ error: 'Paramètre introuvable' }, { status: 404 })
    }

    const now = new Date()

    // Close the old record
    await db.payrollParameter.update({
      where: { id: existing.id },
      data: { effectiveTo: now, status: 'Inactif' },
    })

    // Create a new versioned record
    const updated = await db.payrollParameter.create({
      data: {
        code: existing.code,
        value,
        unit: existing.unit,
        description: description ?? existing.description,
        source: existing.source,
        effectiveFrom: now,
        status: 'Actif',
        version: existing.version + 1,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Parameter update error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}