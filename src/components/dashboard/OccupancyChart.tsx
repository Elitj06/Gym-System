'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ocupacaoPorHora } from '@/data/mock'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gym-card border border-gym-border rounded-lg p-3 shadow-xl">
        <p className="text-xs text-gym-text-muted">{label}</p>
        <p className="text-sm font-semibold text-gym-accent">{payload[0].value}% ocupação</p>
      </div>
    )
  }
  return null
}

export default function OccupancyChart() {
  return (
    <div className="bg-gym-card rounded-xl border border-gym-border p-5">
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-gym-text">Ocupação por Horário</h3>
        <p className="text-xs text-gym-text-muted mt-0.5">Média de hoje</p>
      </div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={ocupacaoPorHora}>
            <XAxis
              dataKey="hora"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#55556a', fontSize: 10 }}
              interval={1}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#55556a', fontSize: 11 }}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="ocupacao" radius={[3, 3, 0, 0]}>
              {ocupacaoPorHora.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.ocupacao >= 80 ? '#ef4444' : entry.ocupacao >= 60 ? '#f5a623' : '#00d4aa'}
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
