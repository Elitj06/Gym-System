import { Brain } from 'lucide-react'
import ModuleShell from '@/components/ui/ModuleShell'

export default function IAPage() {
  return (
    <ModuleShell
      title="IA Vision"
      description="Inteligência artificial para análise de imagens e exercícios"
      icon={Brain}
      phase="Fase 7 - Planejado"
      features={[
        'Análise de postura em exercícios',
        'Identificação de equipamentos',
        'Contagem de repetições',
        'Sugestões de correção',
        'Relatórios de evolução visual',
      ]}
    />
  )
}
