'use client'

import { useState, useEffect } from 'react'
import { Fingerprint, Users, Briefcase, Search, CheckCircle2, XCircle, Shield, RefreshCw, ChevronRight, X } from 'lucide-react'
import dynamic from 'next/dynamic'

const BiometricEnrollment = dynamic(() => import('@/components/BiometricEnrollment'), { ssr: false })

type Tab = 'employees' | 'members'

type Person = {
  id: string
  name: string
  role?: string
  email: string
  status: string
  enrolled?: boolean
  enrollQuality?: number
  enrollAngles?: string[]
  lastTrained?: string
}

// ── Mock data ──────────────────────────────────────────────────────────────
const MOCK_EMPLOYEES: Person[] = [
  { id: 'emp1', name: 'Carlos Silva',     role: 'Instrutor',      email: 'carlos@gym.com', status: 'active' },
  { id: 'emp2', name: 'Ana Costa',        role: 'Recepcionista',  email: 'ana@gym.com',    status: 'active' },
  { id: 'emp3', name: 'Pedro Almeida',    role: 'Instrutor',      email: 'pedro@gym.com',  status: 'active' },
  { id: 'emp4', name: 'Maria Santos',     role: 'Administradora', email: 'maria@gym.com',  status: 'active' },
  { id: 'emp5', name: 'Lucas Oliveira',   role: 'Personal',       email: 'lucas@gym.com',  status: 'active' },
]

const MOCK_MEMBERS: Person[] = [
  { id: 'mem1', name: 'Juliana Ferreira', email: 'juli@email.com',  status: 'active' },
  { id: 'mem2', name: 'Roberto Lima',     email: 'rob@email.com',   status: 'active' },
  { id: 'mem3', name: 'Fernanda Souza',   email: 'fer@email.com',   status: 'active' },
  { id: 'mem4', name: 'Marcos Vieira',    email: 'marcos@email.com',status: 'active' },
  { id: 'mem5', name: 'Patricia Nunes',   email: 'pat@email.com',   status: 'active' },
  { id: 'mem6', name: 'Diego Martins',    email: 'diego@email.com', status: 'active' },
  { id: 'mem7', name: 'Camila Rocha',     email: 'cami@email.com',  status: 'active' },
  { id: 'mem8', name: 'Thiago Barbosa',   email: 'thiago@email.com',status: 'active' },
]

export default function BiometriaPage() {
  const [tab,        setTab]        = useState<Tab>('employees')
  const [employees,  setEmployees]  = useState<Person[]>(MOCK_EMPLOYEES)
  const [members,    setMembers]    = useState<Person[]>(MOCK_MEMBERS)
  const [search,     setSearch]     = useState('')
  const [selected,   setSelected]   = useState<Person | null>(null)
  const [showPanel,  setShowPanel]  = useState(false)
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())

  const list = tab === 'employees' ? employees : members

  const filtered = list.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase())
  )

  const enrolledCount = list.filter(p => p.enrolled).length

  // Fetch enrollment status for visible persons
  useEffect(() => {
    const fetchStatuses = async () => {
      const type = tab === 'employees' ? 'employee' : 'member'
      const targets = tab === 'employees' ? employees : members

      for (const person of targets) {
        if (person.enrolled !== undefined) continue
        setLoadingIds(prev => { const s = new Set(prev); s.add(person.id); return s })
        try {
          const res = await fetch(`/api/biometrics?type=${type}&id=${person.id}`)
          const data = await res.json()
          const updater = (prev: Person[]) => prev.map(p =>
            p.id === person.id ? {
              ...p,
              enrolled: data.enrolled || false,
              enrollQuality: data.face?.quality || 0,
              enrollAngles: data.face?.enrolledAngles || [],
              lastTrained: data.face?.lastTrainedAt,
            } : p
          )
          if (tab === 'employees') setEmployees(updater)
          else setMembers(updater)
        } catch {
          const updater = (prev: Person[]) => prev.map(p => p.id === person.id ? { ...p, enrolled: false } : p)
          if (tab === 'employees') setEmployees(updater)
          else setMembers(updater)
        }
        setLoadingIds(prev => { const next = new Set(prev); next.delete(person.id); return next })
      }
    }

    fetchStatuses()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const openEnrollment = (person: Person) => {
    setSelected(person)
    setShowPanel(true)
  }

  const handleEnrollComplete = (result: { success: boolean; quality: number; angles: string[] }) => {
    if (!selected) return
    const updater = (prev: Person[]) => prev.map(p =>
      p.id === selected.id ? {
        ...p,
        enrolled: result.quality > 0,
        enrollQuality: result.quality,
        enrollAngles: result.angles,
        lastTrained: new Date().toISOString(),
      } : p
    )
    if (tab === 'employees') setEmployees(updater)
    else setMembers(updater)
    setShowPanel(false)
    setSelected(null)
  }

  return (
    <div className="min-h-screen bg-[#0a0f14] p-3 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-gradient-to-br from-[#00d4aa] to-[#0099cc] rounded-xl shadow-lg shadow-[#00d4aa]/20">
                <Fingerprint className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
              </div>
              Biometria Facial
            </h1>
            <p className="text-[#8b949e] mt-1 text-xs sm:text-sm">
              Cadastro e gerenciamento de biometria para IA e relatórios individuais
            </p>
          </div>

          {/* Stats badge */}
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#00d4aa]/10 border border-[#00d4aa]/20 rounded-xl">
            <Shield className="w-4 h-4 text-[#00d4aa]" />
            <span className="text-[#00d4aa] text-sm font-semibold">
              {enrolledCount}/{list.length} cadastrados
            </span>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total',       val: list.length,                          color: 'text-white',      icon: Users },
            { label: 'Cadastrados', val: enrolledCount,                         color: 'text-[#00d4aa]',  icon: CheckCircle2 },
            { label: 'Pendentes',   val: list.length - enrolledCount,           color: 'text-amber-400',  icon: XCircle },
            { label: 'Cobertura',   val: `${list.length ? Math.round(enrolledCount/list.length*100) : 0}%`, color: 'text-blue-400', icon: Shield },
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

        {/* Tab + Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1 p-1 bg-white/[0.03] border border-white/8 rounded-xl">
            {([['employees', 'Funcionários', Briefcase], ['members', 'Alunos', Users]] as [Tab, string, any][]).map(([t, label, Icon]) => (
              <button
                key={t}
                onClick={() => { setTab(t); setSearch('') }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  tab === t
                    ? 'bg-[#00d4aa] text-white shadow-lg shadow-[#00d4aa]/20'
                    : 'text-[#8b949e] hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${tab === t ? 'bg-white/20' : 'bg-white/8'}`}>
                  {t === 'employees' ? employees.length : members.length}
                </span>
              </button>
            ))}
          </div>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b949e]" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou email..."
              className="w-full pl-9 pr-4 py-3 bg-white/[0.03] border border-white/8 rounded-xl text-sm text-white placeholder:text-[#8b949e] focus:ring-2 focus:ring-[#00d4aa]/50 focus:border-[#00d4aa]/50 focus:outline-none"
            />
          </div>
        </div>

        {/* Main layout */}
        <div className={`grid gap-4 transition-all ${showPanel ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>

          {/* Person list */}
          <div className="bg-white/[0.03] border border-white/8 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/8">
              <p className="text-[#8b949e] text-xs font-semibold uppercase tracking-wider">
                {filtered.length} {tab === 'employees' ? 'funcionários' : 'alunos'}
              </p>
            </div>
            <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
              {filtered.map(person => {
                const loading = loadingIds.has(person.id)
                const isSelected = selected?.id === person.id && showPanel
                return (
                  <div
                    key={person.id}
                    onClick={() => openEnrollment(person)}
                    className={`flex items-center gap-3 p-3 sm:p-4 hover:bg-white/[0.03] cursor-pointer transition-colors group ${
                      isSelected ? 'bg-[#00d4aa]/5 border-l-2 border-l-[#00d4aa]' : ''
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#00d4aa]/20 to-[#0099cc]/10 border border-[#00d4aa]/20 flex items-center justify-center font-bold text-[#00d4aa] text-sm flex-shrink-0">
                        {person.name.charAt(0)}
                      </div>
                      {/* Enrollment indicator */}
                      {!loading && person.enrolled !== undefined && (
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0a0f14] flex items-center justify-center ${
                          person.enrolled ? 'bg-[#00d4aa]' : 'bg-[#2d333b]'
                        }`}>
                          {person.enrolled
                            ? <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                            : <XCircle className="w-2.5 h-2.5 text-[#8b949e]" />
                          }
                        </div>
                      )}
                      {loading && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#00d4aa]/20 border-2 border-[#0a0f14] flex items-center justify-center">
                          <RefreshCw className="w-2.5 h-2.5 text-[#00d4aa] animate-spin" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white text-sm truncate">{person.name}</p>
                        {person.enrolled && (
                          <span className="px-1.5 py-0.5 bg-[#00d4aa]/15 text-[#00d4aa] rounded-full text-xs font-medium flex-shrink-0">
                            {person.enrollQuality || 0}%
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {person.role && <span className="text-[#8b949e] text-xs">{person.role}</span>}
                        {person.role && <span className="text-[#8b949e] text-xs">·</span>}
                        <span className={`text-xs ${person.enrolled ? 'text-[#00d4aa]' : 'text-amber-400'}`}>
                          {loading ? 'Verificando...' : person.enrolled ? 'Biometria ativa' : 'Sem biometria'}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-colors ${isSelected ? 'text-[#00d4aa]' : 'text-[#8b949e] group-hover:text-white'}`} />
                  </div>
                )
              })}

              {filtered.length === 0 && (
                <div className="p-10 text-center">
                  <Fingerprint className="w-10 h-10 text-[#8b949e] mx-auto mb-3" />
                  <p className="text-[#8b949e] text-sm">Nenhum resultado encontrado</p>
                </div>
              )}
            </div>
          </div>

          {/* Enrollment panel */}
          {showPanel && selected && (
            <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-5 sm:p-6">
              <BiometricEnrollment
                personId={selected.id}
                personName={selected.name}
                personType={tab === 'employees' ? 'employee' : 'member'}
                onComplete={handleEnrollComplete}
                onCancel={() => { setShowPanel(false); setSelected(null) }}
                existingEnrollment={
                  selected.enrolled !== undefined
                    ? {
                        enrolled: selected.enrolled,
                        quality:  selected.enrollQuality,
                        angles:   selected.enrollAngles,
                        lastTrained: selected.lastTrained,
                      }
                    : null
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
