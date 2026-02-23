import { planosMembros } from '@/data/mock'

export default function PlansOverview() {
  const total = planosMembros.reduce((sum, p) => sum + p.membros, 0)

  return (
    <div className="bg-gym-card rounded-xl border border-gym-border p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gym-text">Distribuição de Planos</h3>
        <p className="text-xs text-gym-text-muted mt-0.5">{total} membros ativos</p>
      </div>
      <div className="space-y-3">
        {planosMembros.map((plano) => {
          const pct = ((plano.membros / total) * 100).toFixed(0)
          return (
            <div key={plano.nome}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: plano.cor }}></div>
                  <span className="text-sm text-gym-text">{plano.nome}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gym-text">{plano.membros}</span>
                  <span className="text-xs text-gym-text-muted">({pct}%)</span>
                </div>
              </div>
              <div className="h-1.5 bg-gym-bg rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: plano.cor }}
                ></div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
