'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface DirectionPieChartProps {
  data: { name: string; count: number; color: string }[]
}

export default function DirectionPieChart({ data }: DirectionPieChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Aucune donnée
      </div>
    )
  }

  const total = data.reduce((s, d) => s + d.count, 0)

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={85}
          paddingAngle={3}
          dataKey="count"
          stroke="none"
        >
          {data.map((entry, idx) => (
            <Cell key={idx} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, name: string) => [`${value} (${((value / total) * 100).toFixed(0)}%)`, name]}
          contentStyle={{ borderRadius: 8, fontSize: 13, border: '1px solid hsl(var(--border))' }}
        />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          iconSize={10}
          formatter={(value: string) => <span className="text-xs">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}