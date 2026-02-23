import { Users } from 'lucide-react'
import ModuleShell from '@/components/ui/ModuleShell'

export default function MembrosPage() {
  return (
    <ModuleShell
      title="Gestão de Membros"
      description="Cadastro, controle e monitoramento de todos os alunos"
      icon={Users}
      phase="Fase 2 - Em breve"
      features={[
        'Cadastro completo de membros',
        'Gestão de planos e pagamentos',
        'Check-in / Check-out',
        'Histórico de frequência',
        'Busca e filtros avançados',
      ]}
    />
  )
}
