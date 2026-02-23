import { Dumbbell } from 'lucide-react'
import ModuleShell from '@/components/ui/ModuleShell'

export default function TreinosPage() {
  return (
    <ModuleShell
      title="Treinos e Exercícios"
      description="Criação e gestão de fichas de treino"
      icon={Dumbbell}
      phase="Fase 4 - Planejado"
      features={[
        'Biblioteca de exercícios',
        'Montagem de fichas de treino',
        'Atribuição a membros',
        'Progressão e periodização',
        'Análise por IA Vision',
      ]}
    />
  )
}
