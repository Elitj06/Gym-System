'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { receitaMensal } from '@/data/mock'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gym-card border border-gym-border rounded-lg p-3 shadow-xl">
        <p className="text-xs text-gym-text-muted mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
            {p.name}: R$ {p.value.toLocaleString('pt-BR')}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function RevenueChart() {
  return (
    <div className="bg-gym-card rounded-xl border border-gym-border p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-gym-text">Receita vs Despesas</h3>
          <p className="text-xs text-gym-text-muted mt-0.5">Últimos 8 meses</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-gym-accent"></div>
            <span className="text-xs text-gym-text-muted">Receita</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-gym-danger"></div>
            <span className="text-xs text-gym-text-muted">Despesas</span>
          </div>
        </div>
      </div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={receitaMensal}>
            <defs>
              <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00d4aa" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="mes"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#55556a', fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#55556a', fontSize: 11 }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="receita"
              name="Receita"
              stroke="#00d4aa"
              strokeWidth={2}
              fill="url(#colorReceita)"
            />
            <Area
              type="monotone"
              dataKey="despesa"
              name="Despesas"
              stroke="#ef4444"
              strokeWidth={2}
              fill="url(#colorDespesa)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
