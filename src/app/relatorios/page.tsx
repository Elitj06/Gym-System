'use client'

import { useState, useEffect } from 'react'
import { BarChart3, Download, TrendingUp, Users, DollarSign, Activity, Loader } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts'

export default function RelatoriosPage() {
  const [timeframe, setTimeframe] = useState('6m')
  const [reportData, setReportData] = useState<any>(null)

  useEffect(() => {
    fetch('/api/reports').then(res => res.json()).then(data => setReportData(data))
  }, [])

  // Mock Data for Charts (Mantidos localmente para gráficos que exigem muitas modificações no db como access_logs de presença)
  const revenueData = [
    { name: 'Jan', receita: 45000, despesa: 32000 },
    { name: 'Fev', receita: 52000, despesa: 34000 },
    { name: 'Mar', receita: 48000, despesa: 31000 },
    { name: 'Abr', receita: 61000, despesa: 35000 },
    { name: 'Mai', receita: 59000, despesa: 38000 },
    { name: 'Jun', receita: 72000, despesa: 41000 },
  ]

  const attendanceData = [
    { time: '06h', alunos: 45 },
    { time: '09h', alunos: 20 },
    { time: '12h', alunos: 35 },
    { time: '15h', alunos: 25 },
    { time: '18h', alunos: 85 },
    { time: '21h', alunos: 40 },
  ]

  // Mock local retirado: A distribuição de planos agora virá da API!
  const defaultPlanDistribution = [
    { name: 'Loading...', value: 100, color: '#3b82f6' }
  ]

  const colors = ['#3b82f6', '#f5a623', '#00d4aa', '#ef4444', '#a855f7']

  const activePlanDistribution = reportData?.planDistribution?.map((p: any, i: number) => ({
    ...p,
    color: colors[i % colors.length]
  })) || defaultPlanDistribution

  if (!reportData) return (
    <div className="flex h-[50vh] items-center justify-center text-gym-text-secondary gap-3">
      <Loader className="w-6 h-6 animate-spin" /> Carregando Analytics DB...
    </div>
  )

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gym-secondary p-6 rounded-2xl border border-gym-border gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gym-accent/20 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-gym-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Relatórios e Métricas</h1>
            <p className="text-gym-text-secondary text-sm">Visão analítica do desempenho da sua academia</p>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <select
            className="bg-gym-dark border border-gym-border text-white px-4 py-2 rounded-lg text-sm focus:outline-none focus:border-gym-accent flex-1 md:flex-none"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
          >
            <option value="30d">Últimos 30 Dias</option>
            <option value="3m">Últimos 3 Meses</option>
            <option value="6m">Últimos 6 Meses</option>
            <option value="1y">Este Ano</option>
          </select>
          <button className="bg-gym-surface hover:bg-gym-hover border border-gym-border text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 flex-1 md:flex-none">
            <Download className="w-4 h-4" /> Exportar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Receita Total" value={`R$ ${(reportData.kpis.receitaMensal / 1000).toFixed(1)}k`} trend={`${reportData.kpis.trendReceita}%`} icon={<DollarSign className="w-5 h-5 text-gym-accent" />} color="bg-gym-accent/10" trendDown={Number(reportData.kpis.trendReceita) < 0} />
        <KPICard title="Membros Ativos" value={String(reportData.kpis.activeMembers || 0)} trend="Realtime" icon={<Users className="w-5 h-5 text-blue-500" />} color="bg-blue-500/10" />
        <KPICard title="Taxa de Retenção" value={`${reportData.kpis.taxaRetencao}%`} trend="Estável" icon={<Activity className="w-5 h-5 text-yellow-500" />} color="bg-yellow-500/10" />
        <KPICard title="Equipamentos c/ Defeito" value={String(reportData.kpis.equipamentosManutencao || 0)} trend="-2%" icon={<TrendingUp className="w-5 h-5 text-red-500" />} color="bg-red-500/10" trendDown />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Receitas vs Despesas */}
        <div className="bg-gym-secondary border border-gym-border rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-6">Receitas vs Despesas</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00d4aa" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3d" vertical={false} />
                <XAxis dataKey="name" stroke="#8888a0" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#8888a0" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value / 1000}k`} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#1a1a28', borderColor: '#2a2a3d', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: number) => [`R$ ${value.toLocaleString()}`, undefined]}
                />
                <Area type="monotone" dataKey="receita" name="Receita" stroke="#00d4aa" strokeWidth={3} fillOpacity={1} fill="url(#colorReceita)" />
                <Area type="monotone" dataKey="despesa" name="Despesa" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorDespesa)" />
                <Legend iconType="circle" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribuição de Planos */}
        <div className="bg-gym-secondary border border-gym-border rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-6">Distribuição de Planos</h3>
          <div className="h-[300px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={activePlanDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {activePlanDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#1a1a28', borderColor: '#2a2a3d', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Frequência por Horário */}
        <div className="bg-gym-secondary border border-gym-border rounded-xl p-6 lg:col-span-2">
          <h3 className="text-lg font-bold text-white mb-6">Mapa de Calor: Frequência Média Diária</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3d" vertical={false} />
                <XAxis dataKey="time" stroke="#8888a0" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#8888a0" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip
                  cursor={{ fill: '#222235' }}
                  contentStyle={{ backgroundColor: '#1a1a28', borderColor: '#2a2a3d', borderRadius: '8px', color: '#fff' }}
                  formatter={(value: number) => [`${value} Alunos`, 'Pico']}
                />
                <Bar dataKey="alunos" name="Alunos" fill="#00d4aa" radius={[4, 4, 0, 0]}>
                  {attendanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.alunos > 50 ? '#00d4aa' : entry.alunos > 30 ? '#3b82f6' : '#55556a'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

function KPICard({ title, value, trend, icon, color, trendDown = false }: { title: string, value: string, trend: string, icon: React.ReactNode, color: string, trendDown?: boolean }) {
  return (
    <div className="bg-gym-secondary border border-gym-border rounded-xl p-5 hover:border-gym-hover transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
          {icon}
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${trendDown ? 'text-red-500 bg-red-500/10' : 'text-green-500 bg-green-500/10'}`}>
          {trend}
        </span>
      </div>
      <p className="text-gym-text-secondary text-sm font-medium mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-white">{value}</h3>
    </div>
  )
}
