import { Users, UserCheck, DollarSign, TrendingUp, Dumbbell, Building2, AlertTriangle, Percent } from 'lucide-react'
import KpiCard from '@/components/dashboard/KpiCard'
import RevenueChart from '@/components/dashboard/RevenueChart'
import OccupancyChart from '@/components/dashboard/OccupancyChart'
import ActivityFeed from '@/components/dashboard/ActivityFeed'
import PlansOverview from '@/components/dashboard/PlansOverview'
import { kpiData } from '@/data/mock'

export default function DashboardPage() {
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
          value={kpiData.membrosAtivos.toLocaleString('pt-BR')}
          icon={Users}
          trend={5.2}
          color="accent"
          subtitle={`${kpiData.novosEsteMes} novos este mês`}
        />
        <KpiCard
          title="Receita Mensal"
          value={`R$ ${(kpiData.receitaMensal / 1000).toFixed(1)}k`}
          icon={DollarSign}
          trend={8.1}
          color="accent"
          subtitle="vs mês anterior"
        />
        <KpiCard
          title="Taxa de Retenção"
          value={`${kpiData.taxaRetencao}%`}
          icon={Percent}
          trend={1.3}
          color="info"
          subtitle={`${kpiData.cancelamentosEsteMes} cancelamentos`}
        />
        <KpiCard
          title="Ocupação Média"
          value={`${kpiData.ocupacaoMedia}%`}
          icon={Building2}
          trend={-2.1}
          color="warning"
          subtitle={`${kpiData.equipamentosManutencao} equip. em manutenção`}
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
