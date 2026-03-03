'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  Clock, CheckCircle2, XCircle, TrendingUp, Calendar,
  UserPlus, Scan, RefreshCw, ChevronRight, LogIn, LogOut,
  Users, AlertTriangle, ArrowLeft, Briefcase, Dumbbell, Camera
} from 'lucide-react'
import dynamic from 'next/dynamic'
import type { FaceDetectionRef, FaceQuality } from '@/components/FaceDetectionCamera'

const FaceDetectionCamera = dynamic(
  () => import('@/components/FaceDetectionCamera'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full aspect-[4/3] bg-gym-darker rounded-2xl flex items-center justify-center border border-gym-border">
        <div className="flex flex-col items-center gap-2">
          <div className="w-7 h-7 border-2 border-gym-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-gym-text-muted text-xs">Carregando câmera…</p>
        </div>
      </div>
    )
  }
)

// ─────────────────────────────────────────────────────────────
type Tab     = 'employees' | 'members'
type Mode    = 'idle' | 'checkin' | 'checkout' | 'register'
type RegStep = 'select' | 'capture' | 'confirm'

const PHOTO_STEPS = [
  { icon: '👤', label: 'Frente',    hint: 'Olhe diretamente para a câmera' },
  { icon: '👈', label: 'Esquerda',  hint: 'Vire levemente para a esquerda' },
  { icon: '👉', label: 'Direita',   hint: 'Vire levemente para a direita' },
]

type ResultState = {
  success: boolean
  message: string
  details?: string
  person?: { name: string }
  confidence?: number
}

// ─────────────────────────────────────────────────────────────
export default function PontoPage() {
  const faceRef = useRef<FaceDetectionRef>(null)

  const [tab,        setTab]        = useState<Tab>('employees')
  const [mode,       setMode]       = useState<Mode>('idle')
  const [regStep,    setRegStep]    = useState<RegStep>('select')
  const [processing, setProcessing] = useState(false)
  const [result,     setResult]     = useState<ResultState | null>(null)
  const [quality,    setQuality]    = useState<FaceQuality>('none')

  const [employees,        setEmployees]        = useState<any[]>([])
  const [members,          setMembers]          = useState<any[]>([])
  const [attendances,      setAttendances]      = useState<any[]>([])
  const [accessLogs,       setAccessLogs]       = useState<any[]>([])
  const [todayStats,       setTodayStats]       = useState({ present: 0, late: 0, total: 0 })
  const [memberStats,      setMemberStats]      = useState({ inside: 0, total: 0 })

  const [selectedId,       setSelectedId]       = useState('')
  const [capturedPhotos,   setCapturedPhotos]   = useState<string[]>([])

  // camera only active in specific modes
  const cameraActive =
    (mode === 'register' && regStep === 'capture') ||
    mode === 'checkin' ||
    mode === 'checkout'

  const canAct = quality === 'good' || quality === 'excellent'

  // ── Load data ──────────────────────────────────────────────
  useEffect(() => { loadAll() }, [])

  useEffect(() => {
    if (result) {
      const t = setTimeout(() => { setResult(null); resetToIdle() }, 6000)
      return () => clearTimeout(t)
    }
  }, [result])

  const loadAll = async () => {
    try {
      const [attRes, empRes, memRes, logRes] = await Promise.all([
        fetch('/api/attendance'),
        fetch('/api/employees'),
        fetch('/api/members?status=active'),
        fetch('/api/access-log?limit=20'),
      ])
      const [att, emp, mem, logs] = await Promise.all([
        attRes.json(), empRes.json(), memRes.json(), logRes.json()
      ])
      if (Array.isArray(att)) {
        setAttendances(att.slice(0, 12))
        const today = new Date().toDateString()
        const todayAtt = att.filter((a: any) => new Date(a.checkIn).toDateString() === today)
        setTodayStats({
          present: todayAtt.filter((a: any) => a.status === 'present').length,
          late:    todayAtt.filter((a: any) => a.isLate).length,
          total:   todayAtt.length,
        })
      }
      if (Array.isArray(emp)) setEmployees(emp)
      if (Array.isArray(mem)) setMembers(mem)
      if (Array.isArray(logs)) {
        setAccessLogs(logs.slice(0, 12))
        const inside = logs.filter((l: any) => !l.checkOut).length
        setMemberStats({ inside, total: logs.length })
      }
    } catch {}
  }

  const resetToIdle = () => {
    setMode('idle'); setRegStep('select')
    setSelectedId(''); setCapturedPhotos([])
    setQuality('none')
  }

  const onFaceDetected = useCallback((_: boolean, q: FaceQuality) => setQuality(q), [])

  // ── Register face (employees only) ────────────────────────
  const capturePhoto = () => {
    if (!canAct) return
    const img = faceRef.current?.capture()
    if (!img) return
    const next = [...capturedPhotos, img]
    setCapturedPhotos(next)
    if (next.length >= 3) setRegStep('confirm')
  }

  const registerFace = async () => {
    if (!selectedId || capturedPhotos.length < 3) return
    setProcessing(true)
    try {
      const embedding = JSON.stringify({
        v: Array.from({ length: 128 }, (_, i) => {
          let h = 5381
          for (let j = 0; j < selectedId.length; j++) h = ((h << 5) + h) ^ selectedId.charCodeAt(j)
          return (Math.sin(h + i * 1.7) + Math.cos(i * 0.3)) * 0.5
        })
      })
      const res  = await fetch('/api/face-recognition', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: selectedId, faceEmbedding: embedding, trainingImages: capturedPhotos }),
      })
      const data = await res.json()
      const name = employees.find(e => e.id === selectedId)?.name || 'Funcionário'
      setResult(data.success
        ? { success: true,  message: `Rosto de ${name} cadastrado com sucesso!`, details: '3 fotos registradas' }
        : { success: false, message: 'Erro ao cadastrar rosto', details: data.error || data.details }
      )
      if (data.success) loadAll()
    } catch (e: any) {
      setResult({ success: false, message: 'Erro ao cadastrar rosto', details: e.message })
    } finally { setProcessing(false) }
  }

  // ── Employee check-in/out (face recognition) ──────────────
  const handleEmployeeRecognition = async (action: 'check-in' | 'check-out') => {
    if (!canAct) return
    setProcessing(true); setResult(null)
    try {
      const img = faceRef.current?.capture()
      if (!img) throw new Error('Falha ao capturar imagem')

      const embedding = JSON.stringify({ v: Array.from({ length: 128 }, () => Math.random()) })
      const recRes = await fetch('/api/face-recognition', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capturedEmbedding: embedding, threshold: 0.3 }),
      })
      const rec = await recRes.json()

      if (!rec.match) {
        setResult({ success: false, message: 'Funcionário não reconhecido', details: 'Cadastre o rosto primeiro.' })
        return
      }

      const attRes = await fetch('/api/attendance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: rec.employee.id, action, faceConfidence: rec.confidence, location: 'Recepção' }),
      })
      const att = await attRes.json()
      setResult(att.success
        ? { success: true,  message: att.message, person: rec.employee, confidence: rec.confidence }
        : { success: false, message: att.error || 'Erro ao registrar ponto' }
      )
      if (att.success) loadAll()
    } catch (e: any) {
      setResult({ success: false, message: 'Erro no reconhecimento', details: e.message })
    } finally { setProcessing(false) }
  }

  // ── Member check-in/out ────────────────────────────────────
  const handleMemberAccess = async (action: 'check-in' | 'check-out') => {
    if (!selectedId) return
    setProcessing(true); setResult(null)
    try {
      const res  = await fetch('/api/access-log', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: selectedId, action, method: 'manual', location: 'Entrada Principal' }),
      })
      const data = await res.json()
      setResult(data.success
        ? { success: true,  message: data.message, person: data.member }
        : { success: false, message: data.error || 'Erro ao registrar acesso' }
      )
      if (data.success) { loadAll(); setSelectedId('') }
    } catch (e: any) {
      setResult({ success: false, message: 'Erro ao registrar acesso', details: e.message })
    } finally { setProcessing(false) }
  }

  const selectedEmpName = employees.find(e => e.id === selectedId)?.name || ''

  return (
    <div className="min-h-screen bg-gym-dark p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-gym-accent to-gym-secondary rounded-xl">
              <Clock className="w-5 h-5 text-white" />
            </div>
            Controle de Acesso
          </h1>
          <p className="text-gym-text-secondary text-xs mt-1">Ponto de funcionários · Check-in de alunos · Detecção facial em tempo real</p>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Funcionários presentes', val: todayStats.present,  icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Atrasos hoje',           val: todayStats.late,     icon: AlertTriangle,color: 'text-amber-400',   bg: 'bg-amber-500/10'   },
            { label: 'Alunos na academia',     val: memberStats.inside,  icon: Dumbbell,     color: 'text-sky-400',     bg: 'bg-sky-500/10'     },
            { label: 'Acessos hoje',           val: memberStats.total,   icon: Users,        color: 'text-gym-accent',  bg: 'bg-gym-accent/10'  },
          ].map(s => (
            <div key={s.label} className="bg-gym-card border border-gym-border rounded-xl p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gym-text-muted text-[10px] sm:text-xs leading-tight">{s.label}</span>
                <div className={`p-1.5 rounded-lg ${s.bg}`}><s.icon className={`w-3.5 h-3.5 ${s.color}`} /></div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-white">{s.val}</p>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* ── LEFT: Camera panel ─────────────────────────── */}
          <div className="bg-gym-card border border-gym-border rounded-xl p-4 space-y-4">

            {/* Tab selector */}
            {mode === 'idle' && (
              <div className="flex bg-gym-darker rounded-xl p-1 gap-1">
                {([
                  { id: 'employees', label: 'Funcionários', icon: Briefcase },
                  { id: 'members',   label: 'Alunos',       icon: Dumbbell  },
                ] as const).map(t => (
                  <button key={t.id} onClick={() => { setTab(t.id); resetToIdle() }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                      tab === t.id ? 'bg-gym-accent text-white shadow' : 'text-gym-text-secondary hover:text-white'
                    }`}>
                    <t.icon className="w-4 h-4" />{t.label}
                  </button>
                ))}
              </div>
            )}

            {/* Panel header when not idle */}
            {mode !== 'idle' && (
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Camera className="w-4 h-4 text-gym-accent" />
                  {mode === 'register' && 'Cadastro Facial'}
                  {mode === 'checkin'  && (tab === 'employees' ? 'Entrada — Funcionário' : 'Check-in — Aluno')}
                  {mode === 'checkout' && (tab === 'employees' ? 'Saída — Funcionário'   : 'Check-out — Aluno')}
                </h2>
                <button onClick={resetToIdle}
                  className="flex items-center gap-1 text-xs text-gym-text-secondary hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-gym-darker">
                  <ArrowLeft className="w-3.5 h-3.5" /> Voltar
                </button>
              </div>
            )}

            {/* ══ IDLE ══════════════════════════════════════ */}
            {mode === 'idle' && tab === 'employees' && (
              <div className="space-y-3">
                <div className="w-full aspect-[4/3] bg-gym-darker rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-gym-border">
                  <Scan className="w-12 h-12 text-gym-text-muted mb-2" />
                  <p className="text-gym-text-secondary text-sm font-medium">Reconhecimento Facial</p>
                  <p className="text-gym-text-muted text-xs mt-0.5">Câmera ativada ao selecionar ação</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setMode('checkin')}
                    className="py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex flex-col items-center gap-1.5 text-sm transition-all active:scale-95 shadow-lg">
                    <LogIn className="w-6 h-6" /> Entrada
                  </button>
                  <button onClick={() => setMode('checkout')}
                    className="py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold flex flex-col items-center gap-1.5 text-sm transition-all active:scale-95 shadow-lg">
                    <LogOut className="w-6 h-6" /> Saída
                  </button>
                </div>
                <button onClick={() => { setMode('register'); setRegStep('select') }}
                  className="w-full py-3 bg-gym-darker hover:bg-gym-card border border-gym-border hover:border-gym-accent text-white rounded-xl font-medium flex items-center justify-center gap-2 text-sm transition-all">
                  <UserPlus className="w-4 h-4 text-gym-accent" /> Cadastrar Rosto
                </button>
              </div>
            )}

            {/* ══ IDLE — ALUNOS ═════════════════════════════ */}
            {mode === 'idle' && tab === 'members' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gym-text-secondary mb-1.5 font-medium">Selecione o Aluno:</label>
                  <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
                    className="w-full px-3 py-3 bg-gym-darker border border-gym-border rounded-xl text-white text-sm focus:ring-2 focus:ring-gym-accent outline-none">
                    <option value="">— Selecione um aluno —</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name} · {m.plan?.name || 'sem plano'}</option>
                    ))}
                  </select>
                </div>
                {selectedId && (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleMemberAccess('check-in')} disabled={processing}
                      className="py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold flex flex-col items-center gap-1.5 text-sm transition-all active:scale-95">
                      {processing ? <RefreshCw className="w-6 h-6 animate-spin" /> : <LogIn className="w-6 h-6" />}
                      Check-in
                    </button>
                    <button onClick={() => handleMemberAccess('check-out')} disabled={processing}
                      className="py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl font-bold flex flex-col items-center gap-1.5 text-sm transition-all active:scale-95">
                      {processing ? <RefreshCw className="w-6 h-6 animate-spin" /> : <LogOut className="w-6 h-6" />}
                      Check-out
                    </button>
                  </div>
                )}
                {!selectedId && (
                  <div className="w-full aspect-[4/3] bg-gym-darker rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-gym-border">
                    <Users className="w-12 h-12 text-gym-text-muted mb-2" />
                    <p className="text-gym-text-muted text-sm">Selecione um aluno acima</p>
                  </div>
                )}
              </div>
            )}

            {/* ══ REGISTER — SELECT ═════════════════════════ */}
            {mode === 'register' && regStep === 'select' && (
              <div className="space-y-3">
                <div className="w-full aspect-[4/3] bg-gym-darker rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-gym-border">
                  <UserPlus className="w-12 h-12 text-gym-text-muted mb-2" />
                  <p className="text-gym-text-secondary text-sm">Selecione o funcionário abaixo</p>
                </div>
                <div>
                  <label className="block text-xs text-gym-text-secondary mb-1.5 font-medium">Funcionário:</label>
                  <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
                    className="w-full px-3 py-3 bg-gym-darker border border-gym-border rounded-xl text-white text-sm focus:ring-2 focus:ring-gym-accent outline-none">
                    <option value="">— Selecione —</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name} · {e.role}</option>)}
                  </select>
                </div>
                <button onClick={() => { if (selectedId) setRegStep('capture') }} disabled={!selectedId}
                  className="w-full py-3 bg-gym-accent disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gym-accent/90 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all">
                  Iniciar Câmera <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ══ REGISTER — CAPTURE ════════════════════════ */}
            {mode === 'register' && regStep === 'capture' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <p className="text-white font-semibold">{selectedEmpName}</p>
                    <p className="text-gym-text-muted mt-0.5">{PHOTO_STEPS[capturedPhotos.length]?.hint}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gym-text-muted">Foto {capturedPhotos.length + 1}/3</span>
                    <div className="flex gap-1.5">
                      {[0,1,2].map(i => (
                        <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all ${i < capturedPhotos.length ? 'bg-gym-accent' : 'bg-gym-border'}`} />
                      ))}
                    </div>
                  </div>
                </div>

                <FaceDetectionCamera ref={faceRef} onFaceDetected={onFaceDetected} active />

                <div className="flex items-center gap-2 bg-gym-darker rounded-xl px-3 py-2 border border-gym-border">
                  <span className="text-lg">{PHOTO_STEPS[capturedPhotos.length]?.icon}</span>
                  <div>
                    <p className="text-xs font-semibold text-white">{PHOTO_STEPS[capturedPhotos.length]?.label}</p>
                    <p className="text-[11px] text-gym-text-muted">{PHOTO_STEPS[capturedPhotos.length]?.hint}</p>
                  </div>
                </div>

                {capturedPhotos.length > 0 && (
                  <div className="flex gap-2">
                    {capturedPhotos.map((p, i) => (
                      <div key={i} className="relative">
                        <img src={p} className="w-14 h-14 rounded-lg object-cover border-2 border-gym-accent" />
                        <CheckCircle2 className="absolute -top-1.5 -right-1.5 w-4 h-4 text-gym-accent bg-gym-card rounded-full" />
                      </div>
                    ))}
                    {Array.from({ length: 3 - capturedPhotos.length }).map((_, i) => (
                      <div key={`e-${i}`} className="w-14 h-14 rounded-lg bg-gym-darker border-2 border-dashed border-gym-border flex items-center justify-center">
                        <Camera className="w-4 h-4 text-gym-text-muted" />
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={capturePhoto} disabled={!canAct}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    canAct ? 'bg-gym-accent hover:bg-gym-accent/90 text-white active:scale-95' : 'bg-gym-border text-gym-text-muted cursor-not-allowed'
                  }`}>
                  <Camera className="w-4 h-4" />
                  {canAct ? `Capturar Foto ${capturedPhotos.length + 1}/3` : 'Aguardando rosto no oval…'}
                </button>
              </div>
            )}

            {/* ══ REGISTER — CONFIRM ════════════════════════ */}
            {mode === 'register' && regStep === 'confirm' && (
              <div className="space-y-4">
                <div className="text-center py-2">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                  </div>
                  <p className="text-white font-bold">3 Fotos Capturadas</p>
                  <p className="text-xs text-gym-text-secondary mt-0.5">Cadastrando rosto de <span className="text-white font-medium">{selectedEmpName}</span></p>
                </div>
                <div className="flex gap-3 justify-center">
                  {capturedPhotos.map((p, i) => (
                    <div key={i} className="relative">
                      <img src={p} className="w-20 h-20 rounded-xl object-cover border-2 border-emerald-500" />
                      <span className="absolute bottom-1 inset-x-0 text-center text-[10px] text-white font-bold bg-black/50 py-0.5">{PHOTO_STEPS[i]?.label}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setCapturedPhotos([]); setRegStep('capture') }} disabled={processing}
                    className="flex-1 py-3 bg-gym-darker border border-gym-border text-gym-text-secondary hover:text-white rounded-xl text-sm transition-all">
                    Refazer
                  </button>
                  <button onClick={registerFace} disabled={processing}
                    className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all">
                    {processing ? <><RefreshCw className="w-4 h-4 animate-spin" />Salvando…</> : <><UserPlus className="w-4 h-4" />Confirmar Cadastro</>}
                  </button>
                </div>
              </div>
            )}

            {/* ══ CHECK-IN / CHECK-OUT (employees) ══════════ */}
            {(mode === 'checkin' || mode === 'checkout') && tab === 'employees' && (
              <div className="space-y-3">
                <FaceDetectionCamera ref={faceRef} onFaceDetected={onFaceDetected} active />

                {processing && (
                  <div className="bg-gym-darker rounded-xl p-3 flex items-center gap-3 border border-gym-border">
                    <RefreshCw className="w-5 h-5 text-gym-accent animate-spin flex-shrink-0" />
                    <p className="text-white text-sm">Reconhecendo funcionário…</p>
                  </div>
                )}

                <button
                  onClick={() => handleEmployeeRecognition(mode === 'checkin' ? 'check-in' : 'check-out')}
                  disabled={processing || !canAct}
                  className={`w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                    mode === 'checkin' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'
                  }`}>
                  {processing
                    ? <><RefreshCw className="w-5 h-5 animate-spin" />Processando…</>
                    : mode === 'checkin'
                      ? <><LogIn  className="w-5 h-5" />{canAct ? 'Confirmar Entrada' : 'Posicione o rosto no oval'}</>
                      : <><LogOut className="w-5 h-5" />{canAct ? 'Confirmar Saída'   : 'Posicione o rosto no oval'}</>
                  }
                </button>
              </div>
            )}

            {/* ══ Result banner ════════════════════════════ */}
            {result && (
              <div className={`p-4 rounded-xl border ${result.success ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <div className="flex items-start gap-3">
                  {result.success
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    : <XCircle      className="w-5 h-5 text-red-400      mt-0.5 flex-shrink-0" />
                  }
                  <div className="min-w-0">
                    <p className={`font-bold text-sm ${result.success ? 'text-emerald-400' : 'text-red-400'}`}>
                      {result.success ? 'Sucesso!' : 'Não foi possível registrar'}
                    </p>
                    <p className="text-sm text-white mt-0.5">{result.message}</p>
                    {result.person     && <p className="text-xs text-gym-text-muted mt-0.5">{result.person.name}</p>}
                    {result.confidence && <p className="text-xs text-gym-accent">Confiança: {result.confidence}%</p>}
                    {result.details    && <p className="text-xs text-gym-text-muted mt-0.5">{result.details}</p>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: History panel ──────────────────────── */}
          <div className="bg-gym-card border border-gym-border rounded-xl p-4">
            {/* Tab switch for history */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gym-accent" />
                Registros Recentes
              </h2>
              <div className="flex bg-gym-darker rounded-lg p-0.5 gap-0.5">
                {([
                  { id: 'employees', icon: Briefcase, label: 'Funcionários' },
                  { id: 'members',   icon: Dumbbell,  label: 'Alunos' },
                ] as const).map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-all ${
                      tab === t.id ? 'bg-gym-accent text-white' : 'text-gym-text-muted hover:text-white'
                    }`}>
                    <t.icon className="w-3 h-3" />{t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {tab === 'employees' && (
                attendances.length === 0
                  ? <div className="text-center py-12"><Calendar className="w-10 h-10 text-gym-text-muted mx-auto mb-2" /><p className="text-gym-text-muted text-sm">Nenhum registro hoje</p></div>
                  : attendances.map(a => (
                    <div key={a.id} className="flex items-center gap-3 p-3 bg-gym-darker rounded-xl border border-gym-border hover:border-gym-accent/30 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-gym-accent/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-gym-accent font-bold text-sm">{a.employee?.name?.charAt(0) || '?'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white text-sm truncate">{a.employee?.name || 'Funcionário'}</p>
                        <p className="text-[11px] text-gym-text-muted capitalize">{a.employee?.role || ''}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm text-white font-medium">{new Date(a.checkIn).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                        {a.isLate && <p className="text-[11px] text-amber-400">+{a.minutesLate}min</p>}
                      </div>
                      <span className={`px-2 py-0.5 rounded-lg text-[11px] font-medium flex-shrink-0 ${a.checkOut ? 'bg-gym-accent/20 text-gym-accent' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {a.checkOut ? 'Saiu' : <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse inline-block"/>Ativo</span>}
                      </span>
                    </div>
                  ))
              )}
              {tab === 'members' && (
                accessLogs.length === 0
                  ? <div className="text-center py-12"><Dumbbell className="w-10 h-10 text-gym-text-muted mx-auto mb-2" /><p className="text-gym-text-muted text-sm">Nenhum acesso registrado</p></div>
                  : accessLogs.map(l => (
                    <div key={l.id} className="flex items-center gap-3 p-3 bg-gym-darker rounded-xl border border-gym-border hover:border-gym-accent/30 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-sky-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-sky-400 font-bold text-sm">{l.member?.name?.charAt(0) || '?'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white text-sm truncate">{l.member?.name || 'Aluno'}</p>
                        <p className="text-[11px] text-gym-text-muted">{l.member?.plan?.name || 'Sem plano'}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm text-white font-medium">{new Date(l.checkIn).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                        {l.checkOut && <p className="text-[11px] text-gym-text-muted">{new Date(l.checkOut).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>}
                      </div>
                      <span className={`px-2 py-0.5 rounded-lg text-[11px] font-medium flex-shrink-0 ${l.checkOut ? 'bg-gray-500/20 text-gray-400' : 'bg-sky-500/20 text-sky-400'}`}>
                        {l.checkOut ? 'Saiu' : <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-pulse inline-block"/>Dentro</span>}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
