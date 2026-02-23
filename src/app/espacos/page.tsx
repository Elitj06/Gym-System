import { Building2 } from 'lucide-react'
import ModuleShell from '@/components/ui/ModuleShell'

export default function EspacosPage() {
  return (
    <ModuleShell
      title="Espaços e Equipamentos"
      description="Gestão do espaço físico e manutenção de equipamentos"
      icon={Building2}
      phase="Fase 6 - Planejado"
      features={[
        'Mapa de áreas da academia',
        'Inventário de equipamentos',
        'Agendamento de manutenção',
        'Controle de lotação por área',
        'Histórico de manutenções',
      ]}
    />
  )
}
