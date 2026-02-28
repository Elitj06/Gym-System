'use client'

import { useState, useEffect } from 'react'
import { Users, Plus, Mail, Phone, Briefcase, Calendar } from 'lucide-react'

type Employee = {
  id: string
  name: string
  email: string
  cpf: string
  phone: string
  role: string
  status: string
}

export default function FuncionariosPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees')
      const data = await res.json()
      if (Array.isArray(data)) {
        setEmployees(data)
      }
    } catch (error) {
      console.error('Erro ao carregar', error)
    } finally {
      setLoading(false)
    }
  }

  const getRoleBadge = (role: string) => {
    const badges: Record<string, { bg: string, text: string, label: string }> = {
      admin: { bg: 'bg-purple-500/20', text: 'text-purple-500', label: 'Administrador' },
      instructor: { bg: 'bg-gym-accent/20', text: 'text-gym-accent', label: 'Instrutor' },
      receptionist: { bg: 'bg-blue-500/20', text: 'text-blue-500', label: 'Recepção' },
      cleaner: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Limpeza' }
    }
    const b = badges[role] || badges.receptionist
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${b.bg} ${b.text}`}>{b.label}</span>
  }

  const getStatusBadge = (status: string) => {
    return status === 'active'
      ? <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-500">Ativo</span>
      : <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-500">Inativo</span>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-gym-secondary p-6 rounded-2xl border border-gym-border">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gym-accent/20 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-gym-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Equipe e Quadro de Funcionários</h1>
            <p className="text-gym-text-secondary text-sm">Gerencie o time de sua academia (Agora Online!)</p>
          </div>
        </div>
        <button className="bg-gym-accent text-black px-4 py-2 rounded-lg font-medium hover:bg-gym-accent/90 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo Colaborador
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gym-text-secondary">Carregando dados da equipe...</div>
      ) : employees.length === 0 ? (
        <div className="bg-gym-secondary border border-gym-border rounded-2xl p-12 text-center text-gym-text-secondary">
          Nenhum funcionário cadastrado no sistema ainda.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map((employee) => (
            <div key={employee.id} className="bg-gym-secondary border border-gym-border rounded-xl p-6 hover:border-gym-accent/50 transition-colors group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gym-dark rounded-full flex items-center justify-center border border-gym-border group-hover:border-gym-accent transition-colors">
                    <span className="text-white font-bold">{employee.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold truncate max-w-[150px]">{employee.name}</h3>
                    <p className="text-xs text-gym-text-secondary mt-1">{getRoleBadge(employee.role)}</p>
                  </div>
                </div>
                {getStatusBadge(employee.status)}
              </div>

              <div className="space-y-3 mt-6 pt-6 border-t border-gym-border text-sm">
                <div className="flex items-center gap-3 text-gym-text-secondary">
                  <Mail className="w-4 h-4 text-gym-accent/70" />
                  <span className="truncate">{employee.email}</span>
                </div>
                <div className="flex items-center gap-3 text-gym-text-secondary">
                  <Phone className="w-4 h-4 text-gym-accent/70" />
                  <span>{employee.phone || 'Não informado'}</span>
                </div>
                <div className="flex items-center gap-3 text-gym-text-secondary">
                  <Briefcase className="w-4 h-4 text-gym-accent/70" />
                  <span>CPF: {employee.cpf}</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gym-border flex justify-end">
                <button className="text-gym-accent hover:text-white transition-colors text-sm font-semibold px-3 py-1 bg-gym-accent/10 rounded-lg">
                  Editar Perfil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
