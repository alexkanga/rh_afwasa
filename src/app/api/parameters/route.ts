import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { DEFAULT_PARAMS, DEFAULT_ITS_BRACKETS, DEFAULT_RICF_SCALE } from '@/lib/constants'

// ── GET: All active payroll parameters, ITS brackets, and RICF scale ──
export async function GET() {
  try {
    const [dbParams, dbItsBrackets, dbRicfScale] = await Promise.all([
      db.payrollParameter.findMany({ where: { status: 'Actif' } }),
      db.taxBracketITS.findMany({ orderBy: { order: 'asc' } }),
      db.ricfScale.findMany(),
    ])

    // Build params map — use DB values, fall back to defaults
    const defaultMap: Record<string, { value: number; unit: string; description: string; source: string }> = {}
    Object.assign(defaultMap, DEFAULT_PARAMS)

    const params: Record<string, { value: number; unit: string; description: string; source: string }> = {}
    for (const p of dbParams) {
      params[p.code] = {
        value: p.value,
        unit: p.unit || '',
        description: p.description || '',
        source: p.source || '',
      }
    }

    // Fill in any missing defaults
    for (const [code, def] of Object.entries(defaultMap)) {
      if (!params[code]) {
        params[code] = { ...def, _source: 'default' }
      }
    }

    // ITS brackets — use DB or defaults
    const itsBrackets = dbItsBrackets.length > 0
      ? dbItsBrackets.map(b => ({
          id: b.id,
          lowerBound: b.lowerBound,
          upperBound: b.upperBound,
          rate: b.rate,
          label: b.label,
          order: b.order,
        }))
      : DEFAULT_ITS_BRACKETS.map((b, i) => ({
          lowerBound: b.lowerBound,
          upperBound: b.upperBound,
          rate: b.rate,
          label: b.label,
          order: i + 1,
        }))

    // RICF scale — use DB or defaults
    const ricfScale = dbRicfScale.length > 0
      ? dbRicfScale.map(r => ({
          id: r.id,
          igrParts: r.igrParts,
          monthlyAmount: r.monthlyAmount,
        }))
      : DEFAULT_RICF_SCALE.map(r => ({
          igrParts: r.igrParts,
          monthlyAmount: r.monthlyAmount,
        }))

    return NextResponse.json({
      params,
      itsBrackets,
      ricfScale,
    })
  } catch (error) {
    console.error('Parameters API error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}