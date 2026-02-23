import { BarChart3 } from 'lucide-react'
import ModuleShell from '@/components/ui/ModuleShell'

export default function RelatoriosPage() {
  return (
    <ModuleShell
      title="Relatórios"
      description="Relatórios completos e exportáveis de toda a operação"
      icon={BarChart3}
      phase="Fase 8 - Planejado"
      features={[
        'Relatórios de membros e frequência',
        'Relatórios financeiros detalhados',
        'Desempenho de funcionários',
        'Utilização de espaço e equipamentos',
        'Exportação em PDF e Excel',
      ]}
    />
  )
}
