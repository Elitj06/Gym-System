'use client'

import { useState, useRef, useCallback } from 'react'
import { Camera, Clock, CheckCircle2, XCircle, TrendingUp, Calendar } from 'lucide-react'
import Webcam from 'react-webcam'

export default function AttendancePage() {
  const webcamRef = useRef<Webcam>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [recentAttendances, setRecentAttendances] = useState<any[]>([])
  const [todayStats, setTodayStats] = useState({
    present: 0,
    late: 0,
    total: 0
  })

  // Carregar registros recentes ao montar
  useState(() => {
    loadRecentAttendances()
  })

  const loadRecentAttendances = async () => {
    try {
      const response = await fetch('/api/attendance')
      const data = await response.json()
      setRecentAttendances(data.slice(0, 10))

      // Calcular stats de hoje
      const today = new Date().toDateString()
      const todayAttendances = data.filter((a: any) => 
        new Date(a.checkIn).toDateString() === today
      )
      setTodayStats({
        present: todayAttendances.filter((a: any) => a.status === 'present').length,
        late: todayAttendances.filter((a: any) => a.isLate).length,
        total: todayAttendances.length,
      })
    } catch (error) {
      console.error('Erro ao carregar attendances:', error)
    }
  }

  // Simular captura e reconhecimento facial
  const handleFaceRecognition = async (action: 'check-in' | 'check-out') => {
    setIsProcessing(true)
    setResult(null)

    try {
      // Capturar imagem da webcam
      const imageSrc = webcamRef.current?.getScreenshot()
      
      if (!imageSrc) {
        throw new Error('Não foi possível capturar imagem')
      }

      // Simular embedding facial (em produção, usar face-api.js)
      const fakeEmbedding = JSON.stringify({
        v: Array.from({ length: 32 }, () => Math.random())
      })

      // Verificar reconhecimento facial
      const recognitionResponse = await fetch('/api/face-recognition', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capturedEmbedding: fakeEmbedding,
          threshold: 0.6,
        })
      })

      const recognition = await recognitionResponse.json()

      if (!recognition.match) {
        setResult({
          success: false,
          message: 'Funcionário não reconhecido',
          details: 'Aproxime mais o rosto da câmera ou cadastre suas fotos no sistema'
        })
        return
      }

      // Registrar ponto
      const attendanceResponse = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: recognition.employee.id,
          action,
          faceConfidence: recognition.confidence,
          faceImageUrl: imageSrc,
          location: 'Recepção',
        })
      })

      const attendance = await attendanceResponse.json()

      if (attendance.success) {
        setResult({
          success: true,
          message: attendance.message,
          employee: recognition.employee,
          confidence: recognition.confidence,
          action,
        })
        loadRecentAttendances() // Recarregar lista
      } else {
        setResult({
          success: false,
          message: attendance.error,
        })
      }

    } catch (error: any) {
      setResult({
        success: false,
        message: 'Erro ao processar reconhecimento facial',
        details: error.message
      })
    } finally {
      setIsProcessing(false)
      setIsCameraActive(false)
    }
  }

  return (
    <div className="min-h-screen bg-gym-dark p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-gym-accent to-gym-secondary rounded-xl">
              <Clock className="w-8 h-8 text-white" />
            </div>
            Controle de Ponto - Reconhecimento Facial
          </h1>
          <p className="text-gym-text-secondary mt-2">
            Sistema automatizado de registro de ponto com IA • Sem cartão ou senha
          </p>
        </div>

        {/* Stats de Hoje */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gym-card border border-gym-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gym-text-secondary text-sm">Presentes Hoje</span>
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-3xl font-bold text-white">{todayStats.present}</p>
          </div>

          <div className="bg-gym-card border border-gym-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gym-text-secondary text-sm">Atrasos</span>
              <XCircle className="w-5 h-5 text-yellow-400" />
            </div>
            <p className="text-3xl font-bold text-white">{todayStats.late}</p>
          </div>

          <div className="bg-gym-card border border-gym-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gym-text-secondary text-sm">Total de Registros</span>
              <Calendar className="w-5 h-5 text-gym-accent" />
            </div>
            <p className="text-3xl font-bold text-white">{todayStats.total}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Câmera de Reconhecimento */}
          <div className="bg-gym-card border border-gym-border rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Camera className="w-6 h-6 text-gym-accent" />
              Reconhecimento Facial
            </h2>

            {!isCameraActive ? (
              <div className="space-y-4">
                <div className="aspect-video bg-gym-darker rounded-lg flex items-center justify-center">
                  <div className="text-center p-8">
                    <Camera className="w-16 h-16 text-gym-text-muted mx-auto mb-4" />
                    <p className="text-gym-text-secondary mb-4">
                      Posicione seu rosto na frente da câmera
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setIsCameraActive(true)}
                    className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Registrar Entrada
                  </button>
                  <button
                    onClick={() => setIsCameraActive(true)}
                    className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-5 h-5" />
                    Registrar Saída
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="aspect-video bg-gym-darker rounded-lg overflow-hidden relative">
                  <Webcam
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    className="w-full h-full object-cover"
                    mirrored
                  />
                  
                  {isProcessing && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gym-accent mx-auto mb-4"></div>
                        <p className="text-white font-medium">Processando...</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleFaceRecognition('check-in')}
                    disabled={isProcessing}
                    className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirmar Entrada
                  </button>
                  <button
                    onClick={() => handleFaceRecognition('check-out')}
                    disabled={isProcessing}
                    className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirmar Saída
                  </button>
                </div>

                <button
                  onClick={() => {
                    setIsCameraActive(false)
                    setResult(null)
                  }}
                  className="w-full px-4 py-2 bg-gym-darker text-gym-text-secondary rounded-lg hover:bg-gym-darker/70 transition-colors text-sm"
                >
                  Cancelar
                </button>
              </div>
            )}

            {/* Resultado */}
            {result && (
              <div className={`mt-4 p-4 rounded-lg border ${
                result.success
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}>
                <div className="flex items-start gap-3">
                  {result.success ? (
                    <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <h4 className={`font-semibold mb-1 ${
                      result.success ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {result.success ? '✓ Sucesso!' : '✗ Falha'}
                    </h4>
                    <p className="text-sm text-gym-text-secondary mb-2">
                      {result.message}
                    </p>
                    {result.employee && (
                      <div className="text-xs text-gym-text-muted">
                        <p>Funcionário: <span className="text-white">{result.employee.name}</span></p>
                        <p>Confiança: <span className="text-gym-accent">{result.confidence}%</span></p>
                      </div>
                    )}
                    {result.details && (
                      <p className="text-xs text-gym-text-muted mt-1">{result.details}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Registros Recentes */}
          <div className="bg-gym-card border border-gym-border rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-gym-accent" />
              Registros Recentes
            </h2>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {recentAttendances.length === 0 ? (
                <p className="text-center text-gym-text-muted py-8">
                  Nenhum registro encontrado
                </p>
              ) : (
                recentAttendances.map((attendance) => (
                  <div
                    key={attendance.id}
                    className="flex items-center gap-4 p-4 bg-gym-darker rounded-lg border border-gym-border hover:border-gym-accent/30 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gym-accent/20 flex items-center justify-center">
                        <span className="text-gym-accent font-bold text-lg">
                          {attendance.employee.name.charAt(0)}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1">
                      <p className="font-medium text-white">{attendance.employee.name}</p>
                      <p className="text-xs text-gym-text-muted">{attendance.employee.role}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-white">
                        {new Date(attendance.checkIn).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      {attendance.isLate && (
                        <span className="text-xs text-yellow-400">
                          +{attendance.minutesLate}min
                        </span>
                      )}
                      {attendance.checkOut && (
                        <p className="text-xs text-gym-text-muted">
                          Saída: {new Date(attendance.checkOut).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      )}
                    </div>

                    <div className="flex-shrink-0">
                      {attendance.checkOut ? (
                        <div className="px-2 py-1 bg-gym-accent/20 text-gym-accent rounded text-xs">
                          Completo
                        </div>
                      ) : (
                        <div className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                          Ativo
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Informações do Sistema */}
        <div className="bg-gradient-to-r from-gym-accent/10 to-gym-secondary/10 border border-gym-accent/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">🔒 Segurança e Privacidade</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gym-text-secondary">
            <div>
              <p className="font-semibold text-gym-accent mb-1">Criptografia End-to-End</p>
              <p>Dados biométricos armazenados com criptografia AES-256</p>
            </div>
            <div>
              <p className="font-semibold text-gym-accent mb-1">Conformidade LGPD</p>
              <p>Sistema em conformidade com Lei Geral de Proteção de Dados</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
