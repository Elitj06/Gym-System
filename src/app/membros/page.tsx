"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Users, Plus, Search, X, Edit2, Trash2, ChevronRight,
  Phone, Mail, Calendar, CreditCard, CheckCircle2, XCircle,
  AlertCircle, Loader2, Filter, UserPlus, Eye,
} from "lucide-react"

type Plan = { id: string; name: string; price: number; duration: number }
type Member = {
  id: string; name: string; email: string; cpf: string; phone: string
  birthDate: string; gender: string; status: string; photoUrl?: string
  planId: string; paymentDay: number; nextPayment?: string
  enrollmentDate: string; address?: string; city?: string; state?: string; zipCode?: string
  plan?: Plan
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  active:   { label: "Ativo",     color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
  inactive: { label: "Inativo",   color: "text-gray-400",    bg: "bg-gray-400/10 border-gray-400/20" },
  overdue:  { label: "Inadimplente", color: "text-red-400", bg: "bg-red-400/10 border-red-400/20" },
  frozen:   { label: "Congelado", color: "text-blue-400",    bg: "bg-blue-400/10 border-blue-400/20" },
}

// ── New/Edit Form ──────────────────────────────────────────────────────
function MemberForm({ member, plans, onSave, onCancel }: {
  member?: Member | null; plans: Plan[]; onSave: () => void; onCancel: () => void
}) {
  const isEdit = !!member
  const [form, setForm] = useState({
    name: member?.name || "", email: member?.email || "", cpf: member?.cpf || "",
    phone: member?.phone || "", birthDate: member?.birthDate?.split("T")[0] || "",
    gender: member?.gender || "M", planId: member?.planId || (plans[0]?.id || ""),
    paymentDay: member?.paymentDay || 5, status: member?.status || "active",
    address: member?.address || "", city: member?.city || "",
    state: member?.state || "", zipCode: member?.zipCode || "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.cpf || !form.phone || !form.birthDate || !form.planId) {
      setError("Preencha todos os campos obrigatorios"); return
    }
    setSaving(true); setError("")
    try {
      const url = isEdit ? `/api/members/${member.id}` : "/api/members"
      const method = isEdit ? "PATCH" : "POST"
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao salvar")
      onSave()
    } catch (e: any) {
      setError(e.message)
    }
    setSaving(false)
  }

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-[#8b949e] text-xs mb-1.5">{label}</label>
      {children}
    </div>
  )
  const inputCls = "w-full px-3 py-2.5 bg-[#0a0f14] border border-white/10 rounded-xl text-white text-sm placeholder:text-[#55556a] focus:ring-2 focus:ring-[#00d4aa]/50 focus:border-[#00d4aa]/50 focus:outline-none"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/8">
          <h2 className="text-white font-bold text-lg">{isEdit ? "Editar Membro" : "Novo Membro"}</h2>
          <button onClick={onCancel} className="p-2 hover:bg-white/5 rounded-xl text-[#8b949e]"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <Field label="Nome completo *">
            <input className={inputCls} value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Nome do aluno" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Email *">
              <input className={inputCls} type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="email@exemplo.com" />
            </Field>
            <Field label="CPF *">
              <input className={inputCls} value={form.cpf} onChange={e => setForm({...form, cpf: e.target.value})} placeholder="000.000.000-00" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Telefone *">
              <input className={inputCls} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="(00) 00000-0000" />
            </Field>
            <Field label="Data de nascimento *">
              <input className={inputCls} type="date" value={form.birthDate} onChange={e => setForm({...form, birthDate: e.target.value})} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Genero">
              <select className={inputCls} value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
                <option value="Outro">Outro</option>
              </select>
            </Field>
            <Field label="Plano *">
              <select className={inputCls} value={form.planId} onChange={e => setForm({...form, planId: e.target.value})}>
                {plans.map(p => <option key={p.id} value={p.id}>{p.name} - R${Number(p.price).toFixed(2)}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Dia de pagamento">
              <input className={inputCls} type="number" min={1} max={28} value={form.paymentDay} onChange={e => setForm({...form, paymentDay: Number(e.target.value)})} />
            </Field>
            {isEdit && (
              <Field label="Status">
                <select className={inputCls} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </Field>
            )}
          </div>

          <Field label="Endereco">
            <input className={inputCls} value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Rua, numero" />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Cidade">
              <input className={inputCls} value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
            </Field>
            <Field label="Estado">
              <input className={inputCls} value={form.state} onChange={e => setForm({...form, state: e.target.value})} maxLength={2} />
            </Field>
            <Field label="CEP">
              <input className={inputCls} value={form.zipCode} onChange={e => setForm({...form, zipCode: e.target.value})} />
            </Field>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-white/8">
          <button onClick={onCancel} className="flex-1 py-3 bg-white/5 border border-white/10 text-[#8b949e] rounded-xl text-sm hover:text-white transition-colors">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-3 bg-gradient-to-r from-[#00d4aa] to-[#0099cc] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {saving ? "Salvando..." : isEdit ? "Atualizar" : "Cadastrar"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Member Detail Panel ───────────────────────────────────────────────
function MemberDetail({ member, onEdit, onDelete, onClose }: {
  member: Member; onEdit: () => void; onDelete: () => void; onClose: () => void
}) {
  const st = STATUS_MAP[member.status] || STATUS_MAP.active

  return (
    <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-5 h-fit">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold">Detalhes</h3>
        <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg text-[#8b949e]"><X className="w-4 h-4" /></button>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00d4aa]/20 to-[#0099cc]/10 border border-[#00d4aa]/20 flex items-center justify-center text-2xl font-bold text-[#00d4aa]">
          {member.name.charAt(0)}
        </div>
        <div>
          <p className="text-white font-semibold">{member.name}</p>
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${st.bg} ${st.color}`}>
            {st.label}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {[
          { icon: Mail, label: "Email", value: member.email },
          { icon: Phone, label: "Telefone", value: member.phone },
          { icon: CreditCard, label: "CPF", value: member.cpf },
          { icon: Calendar, label: "Nascimento", value: member.birthDate ? new Date(member.birthDate).toLocaleDateString("pt-BR") : "-" },
          { icon: CheckCircle2, label: "Plano", value: member.plan?.name || "-" },
          { icon: CreditCard, label: "Valor", value: member.plan ? `R$ ${Number(member.plan.price).toFixed(2)}` : "-" },
          { icon: Calendar, label: "Dia pgto", value: `Dia ${member.paymentDay}` },
          { icon: Calendar, label: "Matricula", value: new Date(member.enrollmentDate).toLocaleDateString("pt-BR") },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
            <item.icon className="w-4 h-4 text-[#8b949e] flex-shrink-0" />
            <span className="text-[#8b949e] text-xs w-20 flex-shrink-0">{item.label}</span>
            <span className="text-white text-sm truncate">{item.value}</span>
          </div>
        ))}
      </div>

      {member.address && (
        <div className="mt-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
          <p className="text-[#8b949e] text-xs mb-1">Endereco</p>
          <p className="text-white text-sm">{member.address}{member.city ? `, ${member.city}` : ""}{member.state ? ` - ${member.state}` : ""}</p>
        </div>
      )}

      <div className="flex gap-2 mt-5">
        <button onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#00d4aa]/10 border border-[#00d4aa]/20 text-[#00d4aa] rounded-xl text-sm hover:bg-[#00d4aa]/15 transition-colors">
          <Edit2 className="w-3.5 h-3.5" /> Editar
        </button>
        <button onClick={onDelete}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm hover:bg-red-500/15 transition-colors">
          <Trash2 className="w-3.5 h-3.5" /> Excluir
        </button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function MembrosPage() {
  const [members, setMembers]   = useState<Member[]>([])
  const [plans, setPlans]       = useState<Plan[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [selected, setSelected] = useState<Member | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editMember, setEditMember] = useState<Member | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (filterStatus !== "all") params.set("status", filterStatus)
      const res = await fetch(`/api/members?${params}`)
      const data = await res.json()
      if (Array.isArray(data)) setMembers(data)
    } catch {} finally { setLoading(false) }
  }, [search, filterStatus])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  useEffect(() => {
    fetch("/api/plans").then(r => r.json()).then(d => {
      if (Array.isArray(d)) setPlans(d)
    }).catch(() => {})
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este membro?")) return
    setDeleting(id)
    try {
      await fetch(`/api/members/${id}`, { method: "DELETE" })
      setMembers(prev => prev.filter(m => m.id !== id))
      if (selected?.id === id) setSelected(null)
    } catch {}
    setDeleting(null)
  }

  const handleSaved = () => {
    setShowForm(false); setEditMember(null); setSelected(null)
    setLoading(true); fetchMembers()
  }

  const stats = {
    total: members.length,
    active: members.filter(m => m.status === "active").length,
    overdue: members.filter(m => m.status === "overdue").length,
    inactive: members.filter(m => m.status === "inactive" || m.status === "frozen").length,
  }

  return (
    <div className="min-h-screen bg-[#0a0f14] p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-gradient-to-br from-[#00d4aa] to-[#0099cc] rounded-xl shadow-lg shadow-[#00d4aa]/20">
                <Users className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
              </div>
              Gestao de Membros
            </h1>
            <p className="text-[#8b949e] mt-1 text-xs sm:text-sm">Cadastro, controle e monitoramento de alunos</p>
          </div>
          <button onClick={() => { setEditMember(null); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#00d4aa] to-[#0099cc] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-[#00d4aa]/20">
            <UserPlus className="w-4 h-4" /> <span className="hidden sm:inline">Novo Membro</span>
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total",       val: stats.total,    color: "text-white",       icon: Users },
            { label: "Ativos",      val: stats.active,   color: "text-emerald-400", icon: CheckCircle2 },
            { label: "Inadimplentes", val: stats.overdue, color: "text-red-400",     icon: AlertCircle },
            { label: "Inativos",    val: stats.inactive, color: "text-gray-400",    icon: XCircle },
          ].map(s => (
            <div key={s.label} className="bg-white/[0.03] border border-white/8 rounded-xl p-3 sm:p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[#8b949e] text-xs">{s.label}</span>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b949e]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, email ou CPF..."
              className="w-full pl-9 pr-4 py-3 bg-white/[0.03] border border-white/8 rounded-xl text-sm text-white placeholder:text-[#8b949e] focus:ring-2 focus:ring-[#00d4aa]/50 focus:outline-none" />
          </div>
          <div className="flex gap-1 p-1 bg-white/[0.03] border border-white/8 rounded-xl">
            {[{ key: "all", label: "Todos" }, { key: "active", label: "Ativos" }, { key: "overdue", label: "Inadimpl." }, { key: "inactive", label: "Inativos" }].map(f => (
              <button key={f.key} onClick={() => setFilterStatus(f.key)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${filterStatus === f.key ? "bg-[#00d4aa] text-white" : "text-[#8b949e] hover:text-white hover:bg-white/5"}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main layout */}
        <div className={`grid gap-4 ${selected ? "grid-cols-1 lg:grid-cols-[1fr,340px]" : "grid-cols-1"}`}>
          {/* Member list */}
          <div className="bg-white/[0.03] border border-white/8 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/8 flex items-center justify-between">
              <p className="text-[#8b949e] text-xs font-semibold uppercase tracking-wider">{members.length} membros</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-[#00d4aa] animate-spin" />
              </div>
            ) : (
              <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                {members.map(m => {
                  const st = STATUS_MAP[m.status] || STATUS_MAP.active
                  const isSel = selected?.id === m.id
                  return (
                    <div key={m.id} onClick={() => setSelected(m)}
                      className={`flex items-center gap-3 p-3 sm:p-4 hover:bg-white/[0.03] cursor-pointer transition-colors group ${isSel ? "bg-[#00d4aa]/5 border-l-2 border-l-[#00d4aa]" : ""}`}>
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00d4aa]/20 to-[#0099cc]/10 border border-[#00d4aa]/20 flex items-center justify-center font-bold text-[#00d4aa] text-sm flex-shrink-0">
                        {m.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white text-sm truncate">{m.name}</p>
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${st.bg} ${st.color} flex-shrink-0`}>{st.label}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-[#8b949e]">
                          <span className="truncate">{m.plan?.name || "Sem plano"}</span>
                          <span>·</span>
                          <span>{m.email}</span>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isSel ? "text-[#00d4aa]" : "text-[#8b949e] group-hover:text-white"}`} />
                    </div>
                  )
                })}
                {members.length === 0 && !loading && (
                  <div className="p-10 text-center">
                    <Users className="w-10 h-10 text-[#8b949e] mx-auto mb-3" />
                    <p className="text-[#8b949e] text-sm">Nenhum membro encontrado</p>
                    <button onClick={() => { setEditMember(null); setShowForm(true) }}
                      className="mt-3 px-4 py-2 bg-[#00d4aa]/10 border border-[#00d4aa]/20 text-[#00d4aa] rounded-lg text-xs">
                      Cadastrar primeiro membro
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <MemberDetail
              member={selected}
              onEdit={() => { setEditMember(selected); setShowForm(true) }}
              onDelete={() => handleDelete(selected.id)}
              onClose={() => setSelected(null)}
            />
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <MemberForm
          member={editMember}
          plans={plans}
          onSave={handleSaved}
          onCancel={() => { setShowForm(false); setEditMember(null) }}
        />
      )}
    </div>
  )
}
