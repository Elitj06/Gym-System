// Dados simulados para o Gym System
// Em fases futuras, será substituído por banco de dados real

export const kpiData = {
  totalMembros: 847,
  membrosAtivos: 712,
  novosEsteMes: 38,
  cancelamentosEsteMes: 12,
  taxaRetencao: 94.2,
  receitaMensal: 89650,
  despesasMensal: 34200,
  lucroMensal: 55450,
  funcionariosAtivos: 23,
  equipamentosTotal: 156,
  equipamentosManutencao: 4,
  ocupacaoMedia: 67,
}

export const receitaMensal = [
  { mes: 'Jul', receita: 72000, despesa: 31000 },
  { mes: 'Ago', receita: 75400, despesa: 31500 },
  { mes: 'Set', receita: 78200, despesa: 32000 },
  { mes: 'Out', receita: 82100, despesa: 32800 },
  { mes: 'Nov', receita: 85300, despesa: 33500 },
  { mes: 'Dez', receita: 83900, despesa: 33800 },
  { mes: 'Jan', receita: 87200, despesa: 34000 },
  { mes: 'Fev', receita: 89650, despesa: 34200 },
]

export const ocupacaoPorHora = [
  { hora: '06h', ocupacao: 45 },
  { hora: '07h', ocupacao: 72 },
  { hora: '08h', ocupacao: 85 },
  { hora: '09h', ocupacao: 68 },
  { hora: '10h', ocupacao: 52 },
  { hora: '11h', ocupacao: 40 },
  { hora: '12h', ocupacao: 35 },
  { hora: '13h', ocupacao: 30 },
  { hora: '14h', ocupacao: 38 },
  { hora: '15h', ocupacao: 45 },
  { hora: '16h', ocupacao: 58 },
  { hora: '17h', ocupacao: 82 },
  { hora: '18h', ocupacao: 95 },
  { hora: '19h', ocupacao: 90 },
  { hora: '20h', ocupacao: 75 },
  { hora: '21h', ocupacao: 50 },
  { hora: '22h', ocupacao: 25 },
]

export const planosMembros = [
  { nome: 'Mensal', membros: 320, cor: '#00d4aa' },
  { nome: 'Trimestral', membros: 185, cor: '#3b82f6' },
  { nome: 'Semestral', membros: 128, cor: '#f5a623' },
  { nome: 'Anual', membros: 79, cor: '#a855f7' },
]

export const atividadesRecentes = [
  { id: 1, tipo: 'check-in', descricao: 'Carlos Mendes fez check-in', horario: '2 min atrás', status: 'info' },
  { id: 2, tipo: 'pagamento', descricao: 'Ana Silva - Pagamento confirmado', horario: '15 min atrás', status: 'success' },
  { id: 3, tipo: 'alerta', descricao: 'Esteira #12 - Manutenção pendente', horario: '32 min atrás', status: 'warning' },
  { id: 4, tipo: 'novo', descricao: 'Novo membro: Rafael Costa', horario: '1h atrás', status: 'success' },
  { id: 5, tipo: 'cancelamento', descricao: 'Juliana Ramos cancelou plano', horario: '2h atrás', status: 'danger' },
  { id: 6, tipo: 'check-in', descricao: 'Marcos Oliveira fez check-in', horario: '2h atrás', status: 'info' },
  { id: 7, tipo: 'treino', descricao: 'Novo treino criado: Hipertrofia A', horario: '3h atrás', status: 'info' },
  { id: 8, tipo: 'pagamento', descricao: 'Pedro Lima - Pagamento em atraso', horario: '4h atrás', status: 'danger' },
]

export const membrosRecentes = [
  { id: 1, nome: 'Ana Silva', plano: 'Anual', status: 'ativo', desde: '2024-03-15', foto: null },
  { id: 2, nome: 'Carlos Mendes', plano: 'Mensal', status: 'ativo', desde: '2025-01-10', foto: null },
  { id: 3, nome: 'Juliana Ramos', plano: 'Trimestral', status: 'inativo', desde: '2024-08-20', foto: null },
  { id: 4, nome: 'Rafael Costa', plano: 'Mensal', status: 'ativo', desde: '2025-02-18', foto: null },
  { id: 5, nome: 'Mariana Santos', plano: 'Semestral', status: 'ativo', desde: '2024-11-05', foto: null },
]

export const funcionarios = [
  { id: 1, nome: 'Prof. Ricardo Lima', cargo: 'Personal Trainer', turno: 'Manhã', status: 'ativo' },
  { id: 2, nome: 'Prof. Camila Souza', cargo: 'Instrutora', turno: 'Tarde', status: 'ativo' },
  { id: 3, nome: 'João Ferreira', cargo: 'Recepcionista', turno: 'Manhã', status: 'ativo' },
  { id: 4, nome: 'Maria Alves', cargo: 'Nutricionista', turno: 'Integral', status: 'ativo' },
  { id: 5, nome: 'Lucas Martins', cargo: 'Manutenção', turno: 'Manhã', status: 'férias' },
]
