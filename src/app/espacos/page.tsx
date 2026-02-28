'use client'

import { useState, useEffect } from 'react'
import { Building2, MapPin, Wrench, AlertTriangle, CheckCircle2, Server, PowerOff, Battery, PenTool } from 'lucide-react'

// Dados de áreas e equipamentos da academia
export default function EspacosPage() {
  const [activeTab, setActiveTab] = useState<'areas' | 'equipamentos'>('areas')
  const [equipments, setEquipments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (activeTab === 'equipamentos' && equipments.length === 0) {
      setLoading(true)
      fetch('/api/equipments')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setEquipments(data)
        })
        .finally(() => setLoading(false))
    }
  }, [activeTab])

  const areas = [
    { id: 1, name: 'Musculação Livre', capacity: 45, current: 32, status: 'normal' },
    { id: 2, name: 'Cardio', capacity: 30, current: 28, status: 'warning' },
    { id: 3, name: 'Crossfit Box', capacity: 20, current: 5, status: 'normal' },
    { id: 4, name: 'Sala de Dança', capacity: 25, current: 0, status: 'empty' },
    { id: 5, name: 'Vestiários', capacity: 50, current: 12, status: 'normal' }
  ]

  const getOccupancyColor = (current: number, capacity: number) => {
    const ratio = current / capacity
    if (ratio > 0.8) return 'text-red-500 bg-red-500/10 border-red-500/20'
    if (ratio > 0.5) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
    if (ratio === 0) return 'text-gray-400 bg-gray-500/10 border-gray-500/20'
    return 'text-green-500 bg-green-500/10 border-green-500/20'
  }

  const getOccupancyWidth = (current: number, capacity: number) => {
    return `${Math.min((current / capacity) * 100, 100)}%`
  }

  const getOccupancyBg = (current: number, capacity: number) => {
    const ratio = current / capacity
    if (ratio > 0.8) return 'bg-red-500'
    if (ratio > 0.5) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case 'maintenance': return <PowerOff className="w-5 h-5 text-red-500" />
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      default: return <Server className="w-5 h-5 text-gray-500" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gym-secondary p-6 rounded-2xl border border-gym-border gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gym-accent/20 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-gym-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Espaços e Equipamentos</h1>
            <p className="text-gym-text-secondary text-sm">Controle de lotação e gestão de manutenção patrimonial</p>
          </div>
        </div>

        <div className="flex bg-gym-dark p-1 rounded-lg border border-gym-border w-full md:w-auto">
          <button
            onClick={() => setActiveTab('areas')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'areas' ? 'bg-gym-surface text-white shadow-sm' : 'text-gym-text-secondary hover:text-white'}`}
          >
            Áreas (Lotação)
          </button>
          <button
            onClick={() => setActiveTab('equipamentos')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'equipamentos' ? 'bg-gym-surface text-white shadow-sm' : 'text-gym-text-secondary hover:text-white'}`}
          >
            Equipamentos
          </button>
        </div>
      </div>

      {activeTab === 'areas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-300">
          {areas.map(area => (
            <div key={area.id} className="bg-gym-secondary border border-gym-border rounded-xl p-6 hover:border-gym-accent/50 transition-colors">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gym-accent" /> {area.name}
                </h3>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getOccupancyColor(area.current, area.capacity)}`}>
                  {area.current} / {area.capacity}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gym-text-secondary">
                  <span>Ocupação Atual</span>
                  <span>{Math.round((area.current / area.capacity) * 100)}%</span>
                </div>
                <div className="w-full bg-gym-dark rounded-full h-2.5 border border-gym-border overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${getOccupancyBg(area.current, area.capacity)}`}
                    style={{ width: getOccupancyWidth(area.current, area.capacity) }}
                  ></div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gym-border">
                <button className="text-sm text-gym-accent hover:text-white transition-colors w-full text-center">
                  Ver Câmera ao Vivo
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'equipamentos' && (
        <div className="bg-gym-secondary border border-gym-border rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="p-4 border-b border-gym-border flex justify-between items-center bg-gym-dark/50">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-gym-text-secondary" /> Inventário de Máquinas
            </h3>
            <button className="bg-gym-surface hover:bg-gym-hover border border-gym-border text-white px-3 py-1.5 rounded text-sm transition-colors flex items-center gap-2">
              <PenTool className="w-4 h-4" /> Registrar Manutenção
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gym-dark/30 text-gym-text-secondary text-xs uppercase tracking-wider border-b border-gym-border">
                  <th className="p-4 font-medium">Equipamento</th>
                  <th className="p-4 font-medium">Área</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Últ. Manutenção</th>
                  <th className="p-4 font-medium">Próx. Revisão</th>
                  <th className="p-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gym-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gym-text-secondary">Carregando inventário...</td>
                  </tr>
                ) : equipments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gym-text-secondary">Nenhum equipamento cadastrado.</td>
                  </tr>
                ) : equipments.map(eq => (
                  <tr key={eq.id} className="hover:bg-gym-dark/30 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-white">{eq.name}</div>
                      <div className="text-xs text-gym-text-secondary font-mono mt-0.5">{eq.id}</div>
                    </td>
                    <td className="p-4 text-gym-text-secondary">{eq.area}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(eq.status)}
                        <span className={`text-xs font-medium capitalize 
                          ${eq.status === 'active' ? 'text-green-500' :
                            eq.status === 'warning' ? 'text-yellow-500' : 'text-red-500'}`}>
                          {eq.status === 'active' ? 'Operante' : eq.status === 'warning' ? 'Atenção' : 'Manutenção'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-gym-text-secondary">{eq.lastMaint}</td>
                    <td className="p-4 font-medium text-white">{eq.nextMaint}</td>
                    <td className="p-4 text-right">
                      <button className="text-gym-text-secondary hover:text-gym-accent transition-colors p-2 rounded-lg hover:bg-gym-accent/10">
                        <Wrench className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
