'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts'

const BAR_COLORS: Record<string, string> = {
  CDI: '#362981',
  CDD: '#009446',
}

interface ContractBarChartProps {
  data: { name: string; count: number }[]
}

export default function ContractBarChart({ data }: ContractBarChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Aucune donnée
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 13, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          formatter={(value: number) => [`${value} employés`, 'Effectif']}
          contentStyle={{ borderRadius: 8, fontSize: 13, border: '1px solid hsl(var(--border))' }}
          cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={64}>
          {data.map((entry, idx) => (
            <Cell key={idx} fill={BAR_COLORS[entry.name] || '#029CB1'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}