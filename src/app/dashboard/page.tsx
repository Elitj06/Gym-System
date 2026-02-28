import { Users, UserCheck, DollarSign, TrendingUp, Dumbbell, Building2, AlertTriangle, Percent } from 'lucide-react'
import KpiCard from '@/components/dashboard/KpiCard'
import RevenueChart from '@/components/dashboard/RevenueChart'
import OccupancyChart from '@/components/dashboard/OccupancyChart'
import ActivityFeed from '@/components/dashboard/ActivityFeed'
import PlansOverview from '@/components/dashboard/PlansOverview'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function DashboardPage() {
  const activeMembersCount = await prisma.member.count({ where: { status: 'active' } })
  const maintenanceEquipments = await prisma.equipment.count({ where: { status: 'maintenance' } })

  const today = new Date()
  const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)

  const paymentsThisMonth = await prisma.payment.findMany({
    where: { paidAt: { gte: startOfThisMonth }, status: 'paid' }
  })
  const paymentsLastMonth = await prisma.payment.findMany({
    where: { paidAt: { gte: startOfLastMonth, lt: startOfThisMonth }, status: 'paid' }
  })

  const receitaMensal = paymentsThisMonth.reduce((acc, curr) => acc + Number(curr.amount), 0)
  const receitaAnterior = paymentsLastMonth.reduce((acc, curr) => acc + Number(curr.amount), 0)
  const trendReceita = receitaAnterior === 0 ? 100 : ((receitaMensal - receitaAnterior) / receitaAnterior) * 100

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gym-text">Dashboard</h1>
        <p className="text-sm text-gym-text-muted mt-1">Visão geral da sua academia</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Membros Ativos"
          value={activeMembersCount.toLocaleString('pt-BR')}
          icon={Users}
          trend={5.2}
          color="accent"
          subtitle={`Em tempo real`}
        />
        <KpiCard
          title="Receita Mensal"
          value={`R$ ${(receitaMensal / 1000).toFixed(1)}k`}
          icon={DollarSign}
          trend={Number(trendReceita.toFixed(1))}
          color="accent"
          subtitle="vs mês anterior"
        />
        <KpiCard
          title="Taxa de Retenção"
          value={`92.4%`}
          icon={Percent}
          trend={1.3}
          color="info"
          subtitle={`Estável`}
        />
        <KpiCard
          title="Ocupação Média"
          value={`45%`}
          icon={Building2}
          trend={-2.1}
          color="warning"
          subtitle={`${maintenanceEquipments} equip. em manutenção`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueChart />
        <OccupancyChart />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ActivityFeed />
        </div>
        <PlansOverview />
      </div>
    </div>
  )
}
