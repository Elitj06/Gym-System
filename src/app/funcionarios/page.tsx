"use client"

import { useState, useEffect, useCallback } from "react"
import {
  UserCog, Plus, Search, X, Edit2, Trash2, ChevronRight,
  Phone, Mail, Calendar, Briefcase, CheckCircle2,
  AlertCircle, Loader2, UserPlus, DollarSign,
} from "lucide-react"

type Employee = {
  id: string; name: string; email: string; cpf: string; phone: string
  role: string; salary: number; status: string; hireDate: string; birthDate?: string
}

const ROLES: Record<string, { label: string; color: string; bg: string }> = {
  admin:        { label: "Administrador", color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/20" },
  instructor:   { label: "Instrutor",     color: "text-blue-400",   bg: "bg-blue-400/10 border-blue-400/20" },
  receptionist: { label: "Recepcionista", color: "text-amber-400",  bg: "bg-amber-400/10 border-amber-400/20" },
  personal:     { label: "Personal",      color: "text-emerald-400",bg: "bg-emerald-400/10 border-emerald-400/20" },
  cleaner:      { label: "Servicos Gerais",color: "text-gray-400",  bg: "bg-gray-400/10 border-gray-400/20" },
}

function EmployeeForm({ employee, onSave, onCancel }: {
  employee?: Employee | null; onSave: () => void; onCancel: () => void
}) {
  const isEdit = !!employee
  const [form, setForm] = useState({
    name: employee?.name || "", email: employee?.email || "", cpf: employee?.cpf || "",
    phone: employee?.phone || "", role: employee?.role || "instructor",
    salary: employee?.salary || 0, hireDate: employee?.hireDate?.split("T")[0] || new Date().toISOString().split("T")[0],
    birthDate: employee?.birthDate?.split("T")[0] || "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.cpf || !form.role) {
      setError("Preencha os campos obrigatorios"); return
    }
    setSaving(true); setError("")
    try {
      const url = isEdit ? `/api/employees` : "/api/employees"
      const method = "POST"
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao salvar")
      onSave()
    } catch (e: any) { setError(e.message) }
    setSaving(false)
  }

  const inputCls = "w-full px-3 py-2.5 bg-[#0a0f14] border border-white/10 rounded-xl text-white text-sm placeholder:text-[#55556a] focus:ring-2 focus:ring-[#00d4aa]/50 focus:outline-none"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/8">
          <h2 className="text-white font-bold text-lg">{isEdit ? "Editar Funcionario" : "Novo Funcionario"}</h2>
          <button onClick={onCancel} className="p-2 hover:bg-white/5 rounded-xl text-[#8b949e]"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-400" /><p className="text-red-300 text-sm">{error}</p>
            </div>
          )}
          <div><label className="block text-[#8b949e] text-xs mb-1.5">Nome *</label>
            <input className={inputCls} value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Nome completo" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-[#8b949e] text-xs mb-1.5">Email *</label>
              <input className={inputCls} type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
            <div><label className="block text-[#8b949e] text-xs mb-1.5">CPF *</label>
              <input className={inputCls} value={form.cpf} onChange={e => setForm({...form, cpf: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-[#8b949e] text-xs mb-1.5">Telefone</label>
              <input className={inputCls} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
            <div><label className="block text-[#8b949e] text-xs mb-1.5">Cargo *</label>
              <select className={inputCls} value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-[#8b949e] text-xs mb-1.5">Salario (R$)</label>
              <input className={inputCls} type="number" step="0.01" value={form.salary} onChange={e => setForm({...form, salary: Number(e.target.value)})} /></div>
            <div><label className="block text-[#8b949e] text-xs mb-1.5">Data contratacao</label>
              <input className={inputCls} type="date" value={form.hireDate} onChange={e => setForm({...form, hireDate: e.target.value})} /></div>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-white/8">
          <button onClick={onCancel} className="flex-1 py-3 bg-white/5 border border-white/10 text-[#8b949e] rounded-xl text-sm hover:text-white transition-colors">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-3 bg-gradient-to-r from-[#00d4aa] to-[#0099cc] text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {saving ? "Salvando..." : isEdit ? "Atualizar" : "Cadastrar"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FuncionariosPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Employee | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null)

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch("/api/employees")
      const data = await res.json()
      if (Array.isArray(data)) setEmployees(data)
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  const filtered = employees.filter(e =>
    !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleSaved = () => {
    setShowForm(false); setEditEmployee(null)
    setLoading(true); fetchEmployees()
  }

  return (
    <div className="min-h-screen bg-[#0a0f14] p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-gradient-to-br from-[#00d4aa] to-[#0099cc] rounded-xl shadow-lg shadow-[#00d4aa]/20">
                <UserCog className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
              </div>
              Funcionarios
            </h1>
            <p className="text-[#8b949e] mt-1 text-xs sm:text-sm">Gestao de equipe e colaboradores</p>
          </div>
          <button onClick={() => { setEditEmployee(null); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#00d4aa] to-[#0099cc] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-[#00d4aa]/20">
            <UserPlus className="w-4 h-4" /> <span className="hidden sm:inline">Novo</span>
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", val: employees.length, color: "text-white", icon: UserCog },
            { label: "Instrutores", val: employees.filter(e => e.role === "instructor" || e.role === "personal").length, color: "text-blue-400", icon: Briefcase },
            { label: "Folha mensal", val: `R$ ${employees.reduce((a, e) => a + Number(e.salary || 0), 0).toLocaleString("pt-BR")}`, color: "text-emerald-400", icon: DollarSign },
            { label: "Admins", val: employees.filter(e => e.role === "admin").length, color: "text-purple-400", icon: CheckCircle2 },
          ].map(s => (
            <div key={s.label} className="bg-white/[0.03] border border-white/8 rounded-xl p-3 sm:p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[#8b949e] text-xs">{s.label}</span>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b949e]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar funcionario..."
            className="w-full pl-9 pr-4 py-3 bg-white/[0.03] border border-white/8 rounded-xl text-sm text-white placeholder:text-[#8b949e] focus:ring-2 focus:ring-[#00d4aa]/50 focus:outline-none" />
        </div>

        {/* List */}
        <div className="bg-white/[0.03] border border-white/8 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/8">
            <p className="text-[#8b949e] text-xs font-semibold uppercase tracking-wider">{filtered.length} funcionarios</p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-[#00d4aa] animate-spin" /></div>
          ) : (
            <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
              {filtered.map(emp => {
                const r = ROLES[emp.role] || { label: emp.role, color: "text-gray-400", bg: "bg-gray-400/10 border-gray-400/20" }
                return (
                  <div key={emp.id} onClick={() => setSelected(selected?.id === emp.id ? null : emp)}
                    className={`flex items-center gap-3 p-3 sm:p-4 hover:bg-white/[0.03] cursor-pointer transition-colors ${selected?.id === emp.id ? "bg-[#00d4aa]/5 border-l-2 border-l-[#00d4aa]" : ""}`}>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00d4aa]/20 to-[#0099cc]/10 border border-[#00d4aa]/20 flex items-center justify-center font-bold text-[#00d4aa] text-sm flex-shrink-0">
                      {emp.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white text-sm truncate">{emp.name}</p>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${r.bg} ${r.color} flex-shrink-0`}>{r.label}</span>
                      </div>
                      <p className="text-[#8b949e] text-xs mt-0.5 truncate">{emp.email}</p>
                    </div>
                    <div className="text-right flex-shrink-0 hidden sm:block">
                      <p className="text-emerald-400 text-sm font-semibold">R$ {Number(emp.salary || 0).toLocaleString("pt-BR")}</p>
                      <p className="text-[#8b949e] text-xs">{emp.phone}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#8b949e] flex-shrink-0" />
                  </div>
                )
              })}
              {filtered.length === 0 && (
                <div className="p-10 text-center">
                  <UserCog className="w-10 h-10 text-[#8b949e] mx-auto mb-3" />
                  <p className="text-[#8b949e] text-sm">Nenhum funcionario encontrado</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showForm && <EmployeeForm employee={editEmployee} onSave={handleSaved} onCancel={() => { setShowForm(false); setEditEmployee(null) }} />}
    </div>
  )
}
