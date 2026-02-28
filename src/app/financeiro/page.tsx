'use client'

import { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, TrendingDown, Plus, CreditCard, Banknote, Search, Calendar, History } from 'lucide-react'
import ModuleShell from '@/components/ui/ModuleShell'

type Payment = {
  id: string
  amount: number
  dueDate: string
  paidAt?: string
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  method?: string
  member: { name: string }
}

export default function FinanceiroPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalRevenue: 0, pendingAmount: 0 })

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    try {
      const res = await fetch('/api/payments')
      const data = await res.json()
      if (data.payments) {
        setPayments(data.payments)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Erro ao carregar', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string, text: string, label: string }> = {
      paid: { bg: 'bg-green-500/20', text: 'text-green-500', label: 'Pago' },
      pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-500', label: 'Pendente' },
      overdue: { bg: 'bg-red-500/20', text: 'text-red-500', label: 'Atrasado' },
      cancelled: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Cancelado' }
    }
    const b = badges[status] || badges.pending
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${b.bg} ${b.text}`}>{b.label}</span>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-gym-secondary p-6 rounded-2xl border border-gym-border">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gym-accent/20 rounded-xl flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-gym-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Novo Módulo Financeiro</h1>
            <p className="text-gym-text-secondary text-sm">Controle de receitas e recebimentos da academia (Agora Online!)</p>
          </div>
        </div>
        <button className="bg-gym-accent text-black px-4 py-2 rounded-lg font-medium hover:bg-gym-accent/90 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nova Cobrança
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gym-secondary border border-gym-border rounded-xl p-6 relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gym-text-secondary text-sm font-medium">Receita Projetada</p>
              <h3 className="text-3xl font-bold text-white mt-1">R$ {stats.totalRevenue.toFixed(2)}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
          </div>
        </div>
        <div className="bg-gym-secondary border border-gym-border rounded-xl p-6 relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gym-text-secondary text-sm font-medium">A Receber</p>
              <h3 className="text-3xl font-bold text-white mt-1">R$ {stats.pendingAmount.toFixed(2)}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <History className="w-5 h-5 text-yellow-500" />
            </div>
          </div>
        </div>
        <div className="bg-gym-secondary border border-gym-border rounded-xl p-6 relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gym-text-secondary text-sm font-medium">Total de Faturas</p>
              <h3 className="text-3xl font-bold text-white mt-1">{payments.length}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-blue-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Pagamentos */}
      <div className="bg-gym-secondary border border-gym-border rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-gym-border flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Transações Recentes</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gym-text-secondary">Carregando dados financeiros...</div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center text-gym-text-secondary">Nenhuma transação encontrada no banco de dados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gym-dark/50 text-gym-text-secondary text-xs uppercase tracking-wider">
                  <th className="p-4 font-medium max-w-[200px]">Membro</th>
                  <th className="p-4 font-medium">Valor</th>
                  <th className="p-4 font-medium">Vencimento</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gym-border">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gym-dark/30 transition-colors">
                    <td className="p-4 font-medium text-white truncate max-w-[200px]">{payment.member.name}</td>
                    <td className="p-4 text-gym-text-secondary font-mono">
                      R$ {Number(payment.amount).toFixed(2)}
                    </td>
                    <td className="p-4 text-gym-text-secondary">
                      {new Date(payment.dueDate).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="p-4">
                      <button className="text-gym-accent hover:text-white transition-colors text-xs font-semibold">Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
