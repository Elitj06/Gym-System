'use client'

import { useState, useEffect } from 'react'
import { Trophy, TrendingUp, Clock, Star, Users, Award } from 'lucide-react'

export default function EmployeeRankingPage() {
  const [scores, setScores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadScores()
  }, [])

  const loadScores = async () => {
    try {
      const response = await fetch('/api/employee-scores')
      const data = await response.json()
      setScores(data)
    } catch (error) {
      console.error('Erro ao carregar scores:', error)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400'
    if (score >= 70) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-500/20 border-green-500/30'
    if (score >= 70) return 'bg-yellow-500/20 border-yellow-500/30'
    return 'bg-red-500/20 border-red-500/30'
  }

  const getRankIcon = (index: number) => {
    if (index === 0) return '🥇'
    if (index === 1) return '🥈'
    if (index === 2) return '🥉'
    return `#${index + 1}`
  }

  return (
    <div className="min-h-screen bg-gym-dark p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-gym-accent to-gym-secondary rounded-xl">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            Ranking de Desempenho
          </h1>
          <p className="text-gym-text-secondary mt-2">
            Pontuação baseada em Pontualidade (40%), Atendimento (30%) e Horas Trabalhadas (30%)
          </p>
        </div>

        {/* Top 3 Pódio */}
        {!loading && scores.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {/* 2º Lugar */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center mb-3">
                  <span className="text-4xl">🥈</span>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-gray-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                  2
                </div>
              </div>
              <h3 className="font-semibold text-white text-center">{scores[1].employee.name}</h3>
              <p className="text-sm text-gym-text-muted text-center">{scores[1].employee.role}</p>
              <p className="text-2xl font-bold text-gray-400 mt-2">{scores[1].overallScore.toFixed(1)}</p>
            </div>

            {/* 1º Lugar */}
            <div className="flex flex-col items-center -mt-4">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center mb-3 shadow-lg shadow-yellow-500/50">
                  <span className="text-5xl">🥇</span>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-white rounded-full w-10 h-10 flex items-center justify-center text-lg font-bold">
                  1
                </div>
              </div>
              <h3 className="font-bold text-white text-center text-lg">{scores[0].employee.name}</h3>
              <p className="text-sm text-gym-text-muted text-center">{scores[0].employee.role}</p>
              <p className="text-3xl font-bold text-yellow-400 mt-2">{scores[0].overallScore.toFixed(1)}</p>
            </div>

            {/* 3º Lugar */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-600 to-orange-800 flex items-center justify-center mb-3">
                  <span className="text-4xl">🥉</span>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-orange-700 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                  3
                </div>
              </div>
              <h3 className="font-semibold text-white text-center">{scores[2].employee.name}</h3>
              <p className="text-sm text-gym-text-muted text-center">{scores[2].employee.role}</p>
              <p className="text-2xl font-bold text-orange-400 mt-2">{scores[2].overallScore.toFixed(1)}</p>
            </div>
          </div>
        )}

        {/* Lista Completa */}
        <div className="bg-gym-card border border-gym-border rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <Award className="w-6 h-6 text-gym-accent" />
            Ranking Completo
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gym-accent"></div>
            </div>
          ) : scores.length === 0 ? (
            <p className="text-center text-gym-text-muted py-8">
              Nenhum funcionário encontrado
            </p>
          ) : (
            <div className="space-y-4">
              {scores.map((employeeScore, index) => (
                <div
                  key={employeeScore.id}
                  className={`p-5 rounded-lg border transition-all hover:scale-[1.02] ${
                    index < 3
                      ? 'bg-gradient-to-r from-gym-accent/10 to-gym-secondary/10 border-gym-accent/30'
                      : 'bg-gym-darker border-gym-border'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Posição */}
                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                        index < 3 ? 'bg-gym-accent/20' : 'bg-gym-darker'
                      }`}>
                        {getRankIcon(index)}
                      </div>
                    </div>

                    {/* Info do Funcionário */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-white text-lg">
                          {employeeScore.employee.name}
                        </h3>
                        <span className="px-2 py-0.5 bg-gym-darker rounded text-xs text-gym-text-muted">
                          {employeeScore.employee.role}
                        </span>
                      </div>

                      {/* Scores Individuais */}
                      <div className="grid grid-cols-3 gap-4">
                        {/* Pontualidade */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-4 h-4 text-gym-text-muted" />
                            <span className="text-xs text-gym-text-secondary">Pontualidade</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gym-darker rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-gym-accent to-gym-secondary transition-all"
                                style={{ width: `${employeeScore.punctualityScore}%` }}
                              />
                            </div>
                            <span className={`text-sm font-semibold ${getScoreColor(employeeScore.punctualityScore)}`}>
                              {employeeScore.punctualityScore.toFixed(0)}
                            </span>
                          </div>
                        </div>

                        {/* Atendimento */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Star className="w-4 h-4 text-gym-text-muted" />
                            <span className="text-xs text-gym-text-secondary">Atendimento</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gym-darker rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-gym-accent to-gym-secondary transition-all"
                                style={{ width: `${employeeScore.customerServiceScore}%` }}
                              />
                            </div>
                            <span className={`text-sm font-semibold ${getScoreColor(employeeScore.customerServiceScore)}`}>
                              {employeeScore.customerServiceScore.toFixed(0)}
                            </span>
                          </div>
                        </div>

                        {/* Horas */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="w-4 h-4 text-gym-text-muted" />
                            <span className="text-xs text-gym-text-secondary">Horas</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gym-darker rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-gym-accent to-gym-secondary transition-all"
                                style={{ width: `${employeeScore.hoursScore}%` }}
                              />
                            </div>
                            <span className={`text-sm font-semibold ${getScoreColor(employeeScore.hoursScore)}`}>
                              {employeeScore.hoursScore.toFixed(0)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Estatísticas */}
                      <div className="flex items-center gap-6 mt-3 text-xs text-gym-text-muted">
                        <span>{employeeScore.totalDaysWorked} dias trabalhados</span>
                        <span>{employeeScore.totalLateArrivals} atrasos</span>
                        <span>{employeeScore.totalHoursWorked.toFixed(0)}h totais</span>
                      </div>
                    </div>

                    {/* Score Final */}
                    <div className="flex-shrink-0 text-right">
                      <div className={`px-4 py-2 rounded-lg border ${getScoreBgColor(employeeScore.overallScore)}`}>
                        <div className="text-xs text-gym-text-secondary mb-1">Score Geral</div>
                        <div className={`text-3xl font-bold ${getScoreColor(employeeScore.overallScore)}`}>
                          {employeeScore.overallScore.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Informações sobre o Sistema de Pontuação */}
        <div className="bg-gradient-to-r from-gym-accent/10 to-gym-secondary/10 border border-gym-accent/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">📊 Sistema de Pontuação</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gym-accent font-semibold mb-1">Pontualidade (40%)</p>
              <p className="text-gym-text-secondary">
                Baseado em atrasos e faltas. Cada atraso reduz 2 pontos.
              </p>
            </div>
            <div>
              <p className="text-gym-accent font-semibold mb-1">Atendimento (30%)</p>
              <p className="text-gym-text-secondary">
                Avaliação de clientes e supervisores sobre qualidade do atendimento.
              </p>
            </div>
            <div>
              <p className="text-gym-accent font-semibold mb-1">Horas Trabalhadas (30%)</p>
              <p className="text-gym-text-secondary">
                Relação entre horas trabalhadas vs. esperadas (8h/dia padrão).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
