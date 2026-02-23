import { atividadesRecentes } from '@/data/mock'
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react'

const statusConfig = {
  success: { icon: CheckCircle, color: 'text-gym-accent', bg: 'bg-gym-accent/10' },
  warning: { icon: AlertTriangle, color: 'text-gym-warning', bg: 'bg-gym-warning/10' },
  danger: { icon: XCircle, color: 'text-gym-danger', bg: 'bg-gym-danger/10' },
  info: { icon: Info, color: 'text-gym-info', bg: 'bg-gym-info/10' },
}

export default function ActivityFeed() {
  return (
    <div className="bg-gym-card rounded-xl border border-gym-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gym-text">Atividades Recentes</h3>
        <button className="text-xs text-gym-accent hover:text-gym-accent-hover transition-colors">
          Ver todas
        </button>
      </div>
      <div className="space-y-1">
        {atividadesRecentes.map((atividade) => {
          const config = statusConfig[atividade.status as keyof typeof statusConfig]
          const Icon = config.icon
          return (
            <div
              key={atividade.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gym-hover transition-all"
            >
              <div className={`w-7 h-7 rounded-md ${config.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-3.5 h-3.5 ${config.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gym-text truncate">{atividade.descricao}</p>
              </div>
              <span className="text-[11px] text-gym-text-muted flex-shrink-0">{atividade.horario}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
