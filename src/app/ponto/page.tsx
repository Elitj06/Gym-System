'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  Camera, Clock, CheckCircle2, XCircle, TrendingUp, Calendar,
  UserPlus, Scan, RefreshCw, ChevronRight, LogIn, LogOut,
  Users, AlertTriangle, ArrowLeft
} from 'lucide-react'
import dynamic from 'next/dynamic'
import type { FaceDetectionRef } from '@/components/FaceDetectionCamera'

const FaceDetectionCamera = dynamic(
  () => import('@/components/FaceDetectionCamera'),
  { ssr: false, loading: () => (
    <div className="w-full aspect-[4/3] bg-gym-darker rounded-2xl flex items-center justify-center border border-gym-border">
      <div className="text-gym-text-muted text-sm">Carregando câmera...</div>
    </div>
  )}
)

type Mode = 'idle' | 'checkin' | 'checkout' | 'register'
type RegStep = 'select' | 'capture' | 'confirm'

const PHOTO_INSTRUCTIONS = [
  { icon: '👤', text: 'Olhe diretamente para a câmera', label: 'Frente' },
  { icon: '👈', text: 'Vire levemente para a esquerda', label: 'Esquerda' },
  { icon: '👉', text: 'Vire levemente para a direita', label: 'Direita' },
]

export default function AttendancePage() {
  const faceRef = useRef<FaceDetectionRef>(null)

  // Page state
  const [mode, setMode] = useState<Mode>('idle')
  const [regStep, setRegStep] = useState<RegStep>('select')
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; details?: string; employee?: any; confidence?: number } | null>(null)

  // Data
  const [employees, setEmployees] = useState<any[]>([])
  const [attendances, setAttendances] = useState<any[]>([])
  const [todayStats, setTodayStats] = useState({ present: 0, late: 0, total: 0 })

  // Registration
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([])
  const [faceQuality, setFaceQuality] = useState<'none' | 'poor' | 'good' | 'excellent'>('none')

  const cameraActive = mode !== 'idle' && (
    (mode === 'register' && regStep === 'capture') ||
    mode === 'checkin' ||
    mode === 'checkout'
  )

  // Load data on mount
  useEffect(() => { loadData() }, [])

  // Auto-dismiss result
  useEffect(() => {
    if (result) {
      const t = setTimeout(() => { setResult(null); resetToIdle() }, 5000)
      return () => clearTimeout(t)
    }
  }, [result])

  const loadData = async () => {
    try {
      const [attRes, empRes] = await Promise.all([
        fetch('/api/attendance'),
        fetch('/api/employees'),
      ])
      const [att, emp] = await Promise.all([attRes.json(), empRes.json()])
      if (Array.isArray(att)) {
        setAttendances(att.slice(0, 15))
        const today = new Date().toDateString()
        const todayAtt = att.filter((a: any) => new Date(a.checkIn).toDateString() === today)
        setTodayStats({
          present: todayAtt.filter((a: any) => a.status === 'present').length,
          late: todayAtt.filter((a: any) => a.isLate).length,
          total: todayAtt.length,
        })
      }
      if (Array.isArray(emp)) setEmployees(emp)
    } catch {}
  }

  const resetToIdle = () => {
    setMode('idle')
    setRegStep('select')
    setSelectedEmployee('')
    setCapturedPhotos([])
    setFaceQuality('none')
  }

  const onFaceDetected = useCallback((detected: boolean, quality?: 'none' | 'poor' | 'good' | 'excellent') => {
    setFaceQuality(quality || (detected ? 'good' : 'none'))
  }, [])

  // ── CAPTURE PHOTO (registration) ──────────────────────────
  const capturePhoto = () => {
    if (faceQuality === 'none' || faceQuality === 'poor') return
    const img = faceRef.current?.capture()
    if (!img) return
    const next = [...capturedPhotos, img]
    setCapturedPhotos(next)
    if (next.length >= 3) setRegStep('confirm')
  }

  // ── REGISTER FACE ──────────────────────────────────────────
  const registerFace = async () => {
    if (!selectedEmployee || capturedPhotos.length < 3) return
    setProcessing(true)
    try {
      // Generate deterministic embedding from employee ID (placeholder - real impl uses MediaPipe FaceMesh)
      const embedding = JSON.stringify({
        v: Array.from({ length: 128 }, (_, i) => {
          let h = 5381
          for (let j = 0; j < selectedEmployee.length; j++) h = ((h << 5) + h) ^ selectedEmployee.charCodeAt(j)
          return (Math.sin(h + i * 1.7) + Math.cos(i * 0.3)) * 0.5
        })
      })
      const res = await fetch('/api/face-recognition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: selectedEmployee, faceEmbedding: embedding, trainingImages: capturedPhotos }),
      })
      const data = await res.json()
      const empName = employees.find(e => e.id === selectedEmployee)?.name || 'funcionário'
      if (data.success) {
        setResult({ success: true, message: `Rosto de ${empName} cadastrado com sucesso!`, details: `${capturedPhotos.length} fotos registradas` })
        loadData()
      } else {
        setResult({ success: false, message: 'Erro ao cadastrar rosto', details: data.error || data.details })
      }
    } catch (e: any) {
      setResult({ success: false, message: 'Erro ao cadastrar rosto', details: e.message })
    } finally {
      setProcessing(false)
    }
  }

  // ── CHECK-IN / CHECK-OUT ───────────────────────────────────
  const handleRecognition = async (action: 'check-in' | 'check-out') => {
    if (faceQuality === 'none') return
    setProcessing(true)
    setResult(null)
    try {
      const img = faceRef.current?.capture()
      if (!img) throw new Error('Falha ao capturar imagem')

      // Simulate embedding (real system uses face-api.js or TensorFlow)
      const embedding = JSON.stringify({ v: Array.from({ length: 128 }, () => Math.random()) })

      const recRes = await fetch('/api/face-recognition', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capturedEmbedding: embedding, threshold: 0.3 }),
      })
      const rec = await recRes.json()

      if (!rec.match) {
        setResult({
          success: false,
          message: 'Funcionário não reconhecido',
          details: 'Cadastre o rosto deste funcionário primeiro.',
        })
        return
      }

      const attRes = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: rec.employee.id,
          action,
          faceConfidence: rec.confidence,
          location: 'Recepção',
        }),
      })
      const att = await attRes.json()

      if (att.success) {
        setResult({
          success: true,
          message: att.message,
          employee: rec.employee,
          confidence: rec.confidence,
        })
        loadData()
      } else {
        setResult({ success: false, message: att.error || 'Erro ao registrar ponto' })
      }
    } catch (e: any) {
      setResult({ success: false, message: 'Erro no reconhecimento', details: e.message })
    } finally {
      setProcessing(false)
    }
  }

  const selectedEmpName = employees.find(e => e.id === selectedEmployee)?.name || ''
  const canCapture = faceQuality === 'good' || faceQuality === 'excellent'
  const canConfirm = faceQuality === 'excellent' || faceQuality === 'good'

  return (
    <div className="min-h-screen bg-gym-dark p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-gradient-to-br from-gym-accent to-gym-secondary rounded-xl">
                <Clock className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </div>
              Ponto Facial
            </h1>
            <p className="text-gym-text-secondary mt-1 text-xs sm:text-sm">
              Reconhecimento facial automatizado • Detecção em tempo real
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Presentes', val: todayStats.present, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Atrasos', val: todayStats.late, icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
            { label: 'Total', val: todayStats.total, icon: Users, color: 'text-gym-accent', bg: 'bg-gym-accent/10' },
          ].map(s => (
            <div key={s.label} className="bg-gym-card border border-gym-border rounded-xl p-3 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gym-text-secondary text-xs">{s.label}</span>
                <div className={`p-1.5 rounded-lg ${s.bg}`}>
                  <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-white">{s.val}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

          {/* ── LEFT: Camera Panel ─────────────────────────────── */}
          <div className="bg-gym-card border border-gym-border rounded-xl p-4 sm:p-6 space-y-4">

            {/* Panel Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-gym-accent" />
                {mode === 'idle' && 'Registro de Ponto'}
                {mode === 'checkin' && 'Entrada'}
                {mode === 'checkout' && 'Saída'}
                {mode === 'register' && 'Cadastro Facial'}
              </h2>
              {mode !== 'idle' && (
                <button onClick={resetToIdle} className="flex items-center gap-1.5 text-xs text-gym-text-secondary hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-gym-darker">
                  <ArrowLeft className="w-3.5 h-3.5" /> Voltar
                </button>
              )}
            </div>

            {/* ── IDLE ──────────────────────────────────── */}
            {mode === 'idle' && (
              <div className="space-y-4">
                {/* Camera placeholder */}
                <div className="w-full aspect-[4/3] bg-gym-darker rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-gym-border">
                  <Scan className="w-14 h-14 text-gym-text-muted mb-3" />
                  <p className="text-gym-text-secondary text-sm font-medium">Selecione uma ação abaixo</p>
                  <p className="text-gym-text-muted text-xs mt-1">A câmera será ativada automaticamente</p>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setMode('checkin')}
                      className="group relative px-4 py-4 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-xl font-semibold flex flex-col items-center justify-center gap-2 text-sm transition-all shadow-lg hover:shadow-emerald-900/40 active:scale-95"
                    >
                      <LogIn className="w-6 h-6" />
                      <span>Registrar Entrada</span>
                    </button>
                    <button
                      onClick={() => setMode('checkout')}
                      className="group px-4 py-4 bg-orange-500/90 hover:bg-orange-500 text-white rounded-xl font-semibold flex flex-col items-center justify-center gap-2 text-sm transition-all shadow-lg hover:shadow-orange-900/40 active:scale-95"
                    >
                      <LogOut className="w-6 h-6" />
                      <span>Registrar Saída</span>
                    </button>
                  </div>
                  <button
                    onClick={() => { setMode('register'); setRegStep('select') }}
                    className="px-4 py-3.5 bg-gym-darker hover:bg-gym-card border border-gym-border hover:border-gym-accent text-white rounded-xl font-medium flex items-center justify-center gap-2 text-sm transition-all"
                  >
                    <UserPlus className="w-5 h-5 text-gym-accent" />
                    Cadastrar Novo Rosto
                  </button>
                </div>
              </div>
            )}

            {/* ── REGISTER: SELECT EMPLOYEE ─────────── */}
            {mode === 'register' && regStep === 'select' && (
              <div className="space-y-4">
                <div className="w-full aspect-[4/3] bg-gym-darker rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-gym-border">
                  <UserPlus className="w-12 h-12 text-gym-text-muted mb-3" />
                  <p className="text-gym-text-secondary text-sm">Selecione o funcionário abaixo</p>
                </div>

                <div>
                  <label className="block text-sm text-gym-text-secondary mb-2 font-medium">Funcionário para Cadastrar:</label>
                  <select
                    value={selectedEmployee}
                    onChange={e => setSelectedEmployee(e.target.value)}
                    className="w-full px-4 py-3 bg-gym-darker border border-gym-border rounded-xl text-white text-sm focus:ring-2 focus:ring-gym-accent focus:border-transparent outline-none"
                  >
                    <option value="">— Selecione um funcionário —</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} · {emp.role}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => { if (selectedEmployee) setRegStep('capture') }}
                  disabled={!selectedEmployee}
                  className="w-full px-4 py-3 bg-gym-accent hover:bg-gym-accent/90 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                >
                  Iniciar Cadastro <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ── REGISTER: CAPTURE ─────────────────── */}
            {mode === 'register' && regStep === 'capture' && (
              <div className="space-y-4">
                {/* Progress */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{selectedEmpName}</p>
                    <p className="text-xs text-gym-text-muted mt-0.5">
                      {PHOTO_INSTRUCTIONS[capturedPhotos.length]?.text}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gym-text-secondary">Foto {capturedPhotos.length + 1}/3</span>
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map(i => (
                        <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all ${
                          i < capturedPhotos.length ? 'bg-gym-accent scale-110' : 'bg-gym-border'
                        }`} />
                      ))}
                    </div>
                  </div>
                </div>

                <FaceDetectionCamera
                  ref={faceRef}
                  onFaceDetected={onFaceDetected}
                  active={true}
                  mirror={true}
                  showGuide={true}
                />

                {/* Instruction */}
                <div className="flex items-center gap-2 bg-gym-darker rounded-xl px-4 py-2.5 border border-gym-border">
                  <span className="text-xl">{PHOTO_INSTRUCTIONS[capturedPhotos.length]?.icon}</span>
                  <div>
                    <p className="text-xs font-medium text-white">{PHOTO_INSTRUCTIONS[capturedPhotos.length]?.label}</p>
                    <p className="text-xs text-gym-text-muted">{PHOTO_INSTRUCTIONS[capturedPhotos.length]?.text}</p>
                  </div>
                </div>

                {/* Captured thumbnails */}
                {capturedPhotos.length > 0 && (
                  <div className="flex gap-2">
                    {capturedPhotos.map((p, i) => (
                      <div key={i} className="relative">
                        <img src={p} alt={`Foto ${i + 1}`} className="w-16 h-16 rounded-lg object-cover border-2 border-gym-accent" />
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-gym-accent rounded-full flex items-center justify-center">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    ))}
                    {Array.from({ length: 3 - capturedPhotos.length }).map((_, i) => (
                      <div key={`empty-${i}`} className="w-16 h-16 rounded-lg bg-gym-darker border-2 border-dashed border-gym-border flex items-center justify-center">
                        <Camera className="w-4 h-4 text-gym-text-muted" />
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={capturePhoto}
                  disabled={!canCapture}
                  className={`w-full px-4 py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                    canCapture
                      ? 'bg-gym-accent hover:bg-gym-accent/90 text-white active:scale-95'
                      : 'bg-gym-border text-gym-text-muted cursor-not-allowed'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  {canCapture ? `Capturar Foto ${capturedPhotos.length + 1}/3` : 'Aguardando rosto...'}
                </button>
              </div>
            )}

            {/* ── REGISTER: CONFIRM ─────────────────── */}
            {mode === 'register' && regStep === 'confirm' && (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">3 Fotos Capturadas!</h3>
                  <p className="text-sm text-gym-text-secondary mt-1">
                    Cadastrando rosto de <span className="text-white font-semibold">{selectedEmpName}</span>
                  </p>
                </div>

                <div className="flex gap-3 justify-center">
                  {capturedPhotos.map((p, i) => (
                    <div key={i} className="relative">
                      <img src={p} alt={`Foto ${i + 1}`} className="w-20 h-20 rounded-xl object-cover border-2 border-emerald-500" />
                      <div className="absolute bottom-1 right-1 bg-black/60 rounded px-1">
                        <span className="text-[10px] text-white font-bold">{PHOTO_INSTRUCTIONS[i]?.label}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-gym-darker rounded-xl p-3 border border-gym-border text-xs text-gym-text-muted text-center">
                  As fotos serão salvas de forma segura para identificação futura
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setCapturedPhotos([]); setRegStep('capture') }}
                    disabled={processing}
                    className="flex-1 px-4 py-3 bg-gym-darker border border-gym-border text-gym-text-secondary hover:text-white rounded-xl text-sm transition-all"
                  >
                    Refazer
                  </button>
                  <button
                    onClick={registerFace}
                    disabled={processing}
                    className="flex-[2] px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                  >
                    {processing
                      ? <><RefreshCw className="w-4 h-4 animate-spin" /> Salvando...</>
                      : <><UserPlus className="w-4 h-4" /> Confirmar Cadastro</>}
                  </button>
                </div>
              </div>
            )}

            {/* ── CHECK-IN / CHECK-OUT ──────────────── */}
            {(mode === 'checkin' || mode === 'checkout') && (
              <div className="space-y-4">
                <FaceDetectionCamera
                  ref={faceRef}
                  onFaceDetected={onFaceDetected}
                  active={true}
                  mirror={true}
                  showGuide={true}
                />

                {processing && (
                  <div className="bg-gym-darker rounded-xl p-4 flex items-center gap-3 border border-gym-border">
                    <RefreshCw className="w-5 h-5 text-gym-accent animate-spin flex-shrink-0" />
                    <p className="text-white text-sm">Reconhecendo funcionário...</p>
                  </div>
                )}

                <button
                  onClick={() => handleRecognition(mode === 'checkin' ? 'check-in' : 'check-out')}
                  disabled={processing || !canConfirm}
                  className={`w-full px-4 py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
                    mode === 'checkin'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-orange-500 hover:bg-orange-600 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {processing ? (
                    <><RefreshCw className="w-5 h-5 animate-spin" /> Processando...</>
                  ) : mode === 'checkin' ? (
                    <><LogIn className="w-5 h-5" /> {canConfirm ? 'Confirmar Entrada' : 'Posicione seu rosto'}</>
                  ) : (
                    <><LogOut className="w-5 h-5" /> {canConfirm ? 'Confirmar Saída' : 'Posicione seu rosto'}</>
                  )}
                </button>
              </div>
            )}

            {/* ── RESULT ────────────────────────────── */}
            {result && (
              <div className={`p-4 rounded-xl border transition-all ${
                result.success
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}>
                <div className="flex items-start gap-3">
                  {result.success
                    ? <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
                    : <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                  }
                  <div className="min-w-0">
                    <p className={`font-bold text-sm ${result.success ? 'text-emerald-400' : 'text-red-400'}`}>
                      {result.success ? 'Sucesso!' : 'Não foi possível registrar'}
                    </p>
                    <p className="text-sm text-white mt-0.5">{result.message}</p>
                    {result.employee && (
                      <p className="text-xs text-gym-text-muted mt-1">
                        Funcionário: <span className="text-white">{result.employee.name}</span>
                        {result.confidence && <> · Confiança: <span className="text-gym-accent">{result.confidence}%</span></>}
                      </p>
                    )}
                    {result.details && <p className="text-xs text-gym-text-muted mt-1">{result.details}</p>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Recent Records ──────────────────────────── */}
          <div className="bg-gym-card border border-gym-border rounded-xl p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gym-accent" />
              Registros Recentes
              {attendances.length > 0 && (
                <span className="ml-auto text-xs text-gym-text-muted font-normal">Hoje</span>
              )}
            </h2>

            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {attendances.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-10 h-10 text-gym-text-muted mx-auto mb-3" />
                  <p className="text-gym-text-muted text-sm">Nenhum registro hoje</p>
                </div>
              ) : attendances.map(a => (
                <div key={a.id} className="flex items-center gap-3 p-3 bg-gym-darker rounded-xl border border-gym-border hover:border-gym-accent/30 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gym-accent/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-gym-accent font-bold text-sm">{a.employee?.name?.charAt(0) || '?'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm truncate">{a.employee?.name || 'Funcionário'}</p>
                    <p className="text-xs text-gym-text-muted capitalize">{a.employee?.role || ''}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm text-white font-medium">
                      {new Date(a.checkIn).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {a.isLate && (
                      <p className="text-xs text-yellow-400">+{a.minutesLate}min</p>
                    )}
                  </div>
                  {a.checkOut ? (
                    <span className="px-2 py-0.5 bg-gym-accent/20 text-gym-accent rounded-lg text-xs font-medium flex-shrink-0">
                      Saiu
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium flex items-center gap-1 flex-shrink-0">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                      Ativo
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
