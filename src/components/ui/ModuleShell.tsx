import { LucideIcon, ArrowRight } from 'lucide-react'

interface ModuleShellProps {
  title: string
  description: string
  icon: LucideIcon
  phase: string
  features: string[]
}

export default function ModuleShell({ title, description, icon: Icon, phase, features }: ModuleShellProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gym-text">{title}</h1>
        <p className="text-sm text-gym-text-muted mt-1">{description}</p>
      </div>

      <div className="bg-gym-card rounded-xl border border-gym-border p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gym-accent/10 flex items-center justify-center mx-auto mb-4">
          <Icon className="w-8 h-8 text-gym-accent" />
        </div>
        <h2 className="text-lg font-bold text-gym-text mb-2">{title}</h2>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gym-warning/10 border border-gym-warning/20 mb-4">
          <span className="text-xs font-medium text-gym-warning">{phase}</span>
        </div>
        <p className="text-sm text-gym-text-secondary max-w-md mx-auto mb-6">
          Este módulo está sendo desenvolvido. As seguintes funcionalidades serão implementadas:
        </p>
        <div className="max-w-sm mx-auto space-y-2">
          {features.map((feature, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-gym-bg border border-gym-border text-left"
            >
              <ArrowRight className="w-3.5 h-3.5 text-gym-accent flex-shrink-0" />
              <span className="text-sm text-gym-text-secondary">{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
