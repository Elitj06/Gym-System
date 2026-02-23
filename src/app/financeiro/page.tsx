import { DollarSign } from 'lucide-react'
import ModuleShell from '@/components/ui/ModuleShell'

export default function FinanceiroPage() {
  return (
    <ModuleShell
      title="Gestão Financeira"
      description="Receitas, despesas e controle financeiro completo"
      icon={DollarSign}
      phase="Fase 5 - Planejado"
      features={[
        'Controle de receitas e despesas',
        'Gestão de cobranças e inadimplência',
        'Fluxo de caixa',
        'Relatórios financeiros',
        'Projeções e metas',
      ]}
    />
  )
}
