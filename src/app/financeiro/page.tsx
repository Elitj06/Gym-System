"use client"

import { useState, useEffect, useCallback } from "react"
import {
  DollarSign, TrendingUp, TrendingDown, CreditCard, Search,
  CheckCircle2, Clock, AlertCircle, XCircle, Loader2,
  Calendar, Banknote, ArrowUpRight, ArrowDownRight,
} from "lucide-react"

type Payment = {
  id: string; amount: number; dueDate: string; paidAt?: string
  status: "pending" | "paid" | "overdue" | "cancelled"; method?: string
  member: { name: string; cpf?: string }
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  paid:      { label: "Pago",       color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20", icon: CheckCircle2 },
  pending:   { label: "Pendente",   color: "text-amber-400",   bg: "bg-amber-400/10 border-amber-400/20",   icon: Clock },
  overdue:   { label: "Atrasado",   color: "text-red-400",     bg: "bg-red-400/10 border-red-400/20",       icon: AlertCircle },
  cancelled: { label: "Cancelado",  color: "text-gray-400",    bg: "bg-gray-400/10 border-gray-400/20",     icon: XCircle },
}

export default function FinanceiroPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [stats, setStats] = useState({ totalRevenue: 0, pendingAmount: 0 })

  const fetchPayments = useCallback(async () => {
    try {
      const res = await fetch("/api/payments")
      const data = await res.json()
      if (data.payments) {
        setPayments(data.payments)
        setStats(data.stats || { totalRevenue: 0, pendingAmount: 0 })
      }
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchPayments() }, [fetchPayments])

  const filtered = payments.filter(p => {
    if (filterStatus !== "all" && p.status !== filterStatus) return false
    if (search && !p.member?.name?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const paidTotal = payments.filter(p => p.status === "paid").reduce((a, p) => a + Number(p.amount), 0)
  const pendingTotal = payments.filter(p => p.status === "pending").reduce((a, p) => a + Number(p.amount), 0)
  const overdueTotal = payments.filter(p => p.status === "overdue").reduce((a, p) => a + Number(p.amount), 0)

  const markAsPaid = async (id: string) => {
    try {
      await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: id, action: "markPaid" }),
      })
      fetchPayments()
    } catch {}
  }

  return (
    <div className="min-h-screen bg-[#0a0f14] p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-white flex items-center gap-3">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-[#00d4aa] to-[#0099cc] rounded-xl shadow-lg shadow-[#00d4aa]/20">
              <DollarSign className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
            </div>
            Financeiro
          </h1>
          <p className="text-[#8b949e] mt-1 text-xs sm:text-sm">Controle de pagamentos e receitas</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Receita Total", val: `R$ ${paidTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, color: "text-emerald-400", icon: TrendingUp, sub: `${payments.filter(p => p.status === "paid").length} pagos` },
            { label: "Pendente",      val: `R$ ${pendingTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, color: "text-amber-400", icon: Clock, sub: `${payments.filter(p => p.status === "pending").length} pendentes` },
            { label: "Atrasado",      val: `R$ ${overdueTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, color: "text-red-400", icon: AlertCircle, sub: `${payments.filter(p => p.status === "overdue").length} atrasados` },
            { label: "Total Lancamentos", val: payments.length.toString(), color: "text-white", icon: CreditCard, sub: "registros" },
          ].map(s => (
            <div key={s.label} className="bg-white/[0.03] border border-white/8 rounded-xl p-3 sm:p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[#8b949e] text-xs">{s.label}</span>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className={`text-lg sm:text-2xl font-bold ${s.color}`}>{s.val}</p>
              <p className="text-[#55556a] text-[10px] mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b949e]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por membro..."
              className="w-full pl-9 pr-4 py-3 bg-white/[0.03] border border-white/8 rounded-xl text-sm text-white placeholder:text-[#8b949e] focus:ring-2 focus:ring-[#00d4aa]/50 focus:outline-none" />
          </div>
          <div className="flex gap-1 p-1 bg-white/[0.03] border border-white/8 rounded-xl">
            {[{ key: "all", label: "Todos" }, { key: "paid", label: "Pagos" }, { key: "pending", label: "Pendentes" }, { key: "overdue", label: "Atrasados" }].map(f => (
              <button key={f.key} onClick={() => setFilterStatus(f.key)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${filterStatus === f.key ? "bg-[#00d4aa] text-white" : "text-[#8b949e] hover:text-white hover:bg-white/5"}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Payment list */}
        <div className="bg-white/[0.03] border border-white/8 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/8">
            <p className="text-[#8b949e] text-xs font-semibold uppercase tracking-wider">{filtered.length} lancamentos</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-[#00d4aa] animate-spin" /></div>
          ) : (
            <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
              {filtered.map(p => {
                const st = STATUS_MAP[p.status] || STATUS_MAP.pending
                const Icon = st.icon
                return (
                  <div key={p.id} className="flex items-center gap-3 p-3 sm:p-4 hover:bg-white/[0.02] transition-colors">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${st.bg}`}>
                      <Icon className={`w-4 h-4 ${st.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white text-sm truncate">{p.member?.name || "Membro"}</p>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${st.bg} ${st.color} flex-shrink-0`}>{st.label}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-[#8b949e]">
                        <Calendar className="w-3 h-3" />
                        <span>Venc: {new Date(p.dueDate).toLocaleDateString("pt-BR")}</span>
                        {p.paidAt && (
                          <><span>·</span><span>Pago: {new Date(p.paidAt).toLocaleDateString("pt-BR")}</span></>
                        )}
                        {p.method && <><span>·</span><span>{p.method}</span></>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-bold ${p.status === "paid" ? "text-emerald-400" : p.status === "overdue" ? "text-red-400" : "text-white"}`}>
                        R$ {Number(p.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                      {p.status === "pending" && (
                        <button onClick={() => markAsPaid(p.id)}
                          className="mt-1 px-2 py-0.5 bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 rounded text-[10px] hover:bg-emerald-400/20 transition-colors">
                          Marcar pago
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
              {filtered.length === 0 && (
                <div className="p-10 text-center">
                  <DollarSign className="w-10 h-10 text-[#8b949e] mx-auto mb-3" />
                  <p className="text-[#8b949e] text-sm">Nenhum lancamento encontrado</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
