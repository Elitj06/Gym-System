import { UserCog } from 'lucide-react'
import ModuleShell from '@/components/ui/ModuleShell'

export default function FuncionariosPage() {
  return (
    <ModuleShell
      title="Gestão de Funcionários"
      description="Controle de equipe, turnos e desempenho"
      icon={UserCog}
      phase="Fase 3 - Planejado"
      features={[
        'Cadastro de funcionários',
        'Controle de turnos e escalas',
        'Registro de ponto',
        'Avaliação de desempenho',
        'Gestão de permissões',
      ]}
    />
  )
}
