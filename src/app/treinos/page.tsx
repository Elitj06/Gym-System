'use client'

import { useState, useEffect } from 'react'
import { Dumbbell, Plus, Clock, Users, MapPin, CalendarDays } from 'lucide-react'

type Schedule = {
  id: string
  name: string
  description?: string
  dayOfWeek: number
  startTime: string
  endTime: string
  maxCapacity: number
  location: string
  instructor: { name: string }
}

export default function TreinosPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSchedules()
  }, [])

  const fetchSchedules = async () => {
    try {
      const res = await fetch('/api/schedules')
      const data = await res.json()
      if (Array.isArray(data)) {
        setSchedules(data)
      }
    } catch (error) {
      console.error('Erro ao carregar cronograma', error)
    } finally {
      setLoading(false)
    }
  }

  const daysOfWeek = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-gym-secondary p-6 rounded-2xl border border-gym-border">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gym-accent/20 rounded-xl flex items-center justify-center">
            <Dumbbell className="w-6 h-6 text-gym-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Treinos e Cronogramas</h1>
            <p className="text-gym-text-secondary text-sm">Organize as aulas e capacidades (Agora Online!)</p>
          </div>
        </div>
        <button className="bg-gym-accent text-black px-4 py-2 rounded-lg font-medium hover:bg-gym-accent/90 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nova Aula
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gym-text-secondary">Carregando quadro de aulas...</div>
      ) : schedules.length === 0 ? (
        <div className="bg-gym-secondary border border-gym-border rounded-2xl p-12 text-center text-gym-text-secondary">
          Nenhuma aula ou treino programado no momento.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schedules.map((schedule) => (
            <div key={schedule.id} className="bg-gym-secondary border border-gym-border rounded-xl p-6 hover:border-gym-accent/50 transition-colors relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-gym-accent opacity-50 group-hover:opacity-100 transition-opacity"></div>

              <div className="flex justify-between items-start mb-4 pl-2">
                <div>
                  <div className="flex items-center gap-2 text-gym-accent text-xs font-semibold mb-2">
                    <CalendarDays className="w-4 h-4" />
                    {daysOfWeek[schedule.dayOfWeek].toUpperCase()}
                  </div>
                  <h3 className="text-xl font-bold text-white">{schedule.name}</h3>
                  <p className="text-sm text-gym-text-secondary mt-1">Instrutor(a): {schedule.instructor.name}</p>
                </div>
              </div>

              <div className="space-y-3 mt-6 pt-4 border-t border-gym-border text-sm pl-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-gym-text-secondary">
                    <Clock className="w-4 h-4 text-gym-accent" />
                    <span>{schedule.startTime} - {schedule.endTime}</span>
                  </div>
                  <span className="px-2 py-1 bg-gym-dark rounded text-xs text-gym-text-secondary border border-gym-border/50">
                    {schedule.location}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-gym-text-secondary">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span>Capacidade Máxima: <b>{schedule.maxCapacity}</b> alunos</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gym-border flex justify-end">
                <button className="text-gym-accent hover:text-white transition-colors text-sm font-semibold">Editar Horário</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
