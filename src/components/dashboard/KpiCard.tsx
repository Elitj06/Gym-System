import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: number
  color?: 'accent' | 'info' | 'warning' | 'danger'
}

const colorMap = {
  accent: { bg: 'bg-gym-accent/10', text: 'text-gym-accent', border: 'border-gym-accent/20' },
  info: { bg: 'bg-gym-info/10', text: 'text-gym-info', border: 'border-gym-info/20' },
  warning: { bg: 'bg-gym-warning/10', text: 'text-gym-warning', border: 'border-gym-warning/20' },
  danger: { bg: 'bg-gym-danger/10', text: 'text-gym-danger', border: 'border-gym-danger/20' },
}

export default function KpiCard({ title, value, subtitle, icon: Icon, trend, color = 'accent' }: KpiCardProps) {
  const colors = colorMap[color]

  return (
    <div className={`bg-gym-card rounded-xl border ${colors.border} p-5 hover:bg-gym-hover transition-all duration-200`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${colors.text}`} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-gym-accent' : 'text-gym-danger'}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gym-text mb-0.5">{value}</p>
      <p className="text-xs text-gym-text-muted">{title}</p>
      {subtitle && <p className="text-[11px] text-gym-text-muted mt-1">{subtitle}</p>}
    </div>
  )
}
