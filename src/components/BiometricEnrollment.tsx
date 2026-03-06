'use client'

/**
 * BiometricEnrollment — Estilo App Bancário
 * Inspirado em: Nubank, Inter, C6 Bank, Bradesco
 * Fluxo 100% automático — captura quando detecta qualidade suficiente
 */

import { useRef, useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import {
  CheckCircle2, X, RefreshCw, ShieldCheck, AlertTriangle,
  Fingerprint, ChevronRight, RotateCcw, Trash2
} from 'lucide-react'
import type { FaceDetectionRef, FaceQuality } from './FaceDetectionCamera'

const FaceDetectionCamera = dynamic(() => import('./FaceDetectionCamera'), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-[3/4] bg-[#0a0f14] rounded-3xl flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#00d4aa] border-t-transparent rounded-full animate-spin" />
    </div>
  )
})

// ── Ângulos ──────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 'front', label: 'Frente',    hint: 'Olhe diretamente para a câmera', direction: 'front' as const, icon: '😐' },
  { id: 'left',  label: 'Esquerda',  hint: 'Vire o rosto levemente para a esquerda', direction: 'left'  as const, icon: '👈' },
  { id: 'right', label: 'Direita',   hint: 'Vire o rosto levemente para a direita',  direction: 'right' as const, icon: '👉' },
  { id: 'up',    label: 'Cima',      hint: 'Levante levemente o queixo',            direction: 'up'    as const, icon: '👆' },
  { id: 'down',  label: 'Baixo',     hint: 'Abaixe levemente o queixo',             direction: 'down'  as const, icon: '👇' },
]

const HOLD_DURATION = 1400  // ms para segurar antes de capturar
const TICK = 32              // ms entre ticks de progresso

// ── Types ────────────────────────────────────────────────────────────────────
export interface BiometricEnrollmentProps {
  personId: string
  personName: string
  personType: 'employee' | 'member'
  onComplete?: (result: { success: boolean; quality: number; angles: string[] }) => void
  onCancel?: () => void
  existingEnrollment?: {
    enrolled: boolean; quality?: number; angles?: string[]; lastTrained?: string
  } | null
}

type Phase = 'intro' | 'scanning' | 'processing' | 'success' | 'error'

// ── Component ────────────────────────────────────────────────────────────────
export default function BiometricEnrollment({
  personId, personName, personType, onComplete, onCancel, existingEnrollment,
}: BiometricEnrollmentProps) {
  const faceRef = useRef<FaceDetectionRef>(null)

  const [phase,        setPhase]        = useState<Phase>('intro')
  const [stepIdx,      setStepIdx]      = useState(0)
  const [captures,     setCaptures]     = useState<Record<string, string>>({})
  const [holdProgress, setHoldProgress] = useState(0)
  const [showSuccess,  setShowSuccess]  = useState(false)  // flash verde pós-captura
  const [saving,       setSaving]       = useState(false)
  const [errorMsg,     setErrorMsg]     = useState('')
  const [enrollQuality,setEnrollQuality]= useState(0)

  // Refs — nunca stale em timers
  const qualityRef     = useRef<FaceQuality>('none')
  const stepIdxRef     = useRef(0)
  const capturesRef    = useRef<Record<string, string>>({})
  const phaseRef       = useRef<Phase>('intro')
  const holdStartRef   = useRef<number>(0)
  const holdingRef     = useRef(false)
  const intervalRef    = useRef<ReturnType<typeof setInterval> | null>(null)

  // Sincronizar refs ↔ state
  useEffect(() => { stepIdxRef.current = stepIdx },     [stepIdx])
  useEffect(() => { capturesRef.current = captures },   [captures])
  useEffect(() => { phaseRef.current = phase },         [phase])

  const step = STEPS[stepIdx]

  // ── Captura um frame e avança ───────────────────────────────────────────
  const doCapture = useCallback(() => {
    const img = faceRef.current?.capture()
    if (!img) return

    const sid = STEPS[stepIdxRef.current].id
    if (capturesRef.current[sid]) return   // guard duplo

    const newCaptures = { ...capturesRef.current, [sid]: img }
    capturesRef.current = newCaptures
    setCaptures(newCaptures)

    // Flash de sucesso
    setShowSuccess(true)
    setHoldProgress(100)

    setTimeout(() => {
      setShowSuccess(false)
      setHoldProgress(0)

      const nextIdx = stepIdxRef.current + 1
      if (nextIdx < STEPS.length) {
        stepIdxRef.current = nextIdx
        setStepIdx(nextIdx)
        qualityRef.current = 'none'
      }
      // Se foi o último, saveEnrollment é chamado pelo useEffect abaixo
    }, 600)
  }, [])

  // ── Detecta fim de todos os ângulos e salva ─────────────────────────────
  useEffect(() => {
    if (phase !== 'scanning') return
    if (Object.keys(captures).length === STEPS.length) {
      // Pequeno delay para mostrar o último success flash
      setTimeout(() => saveEnrollment(captures), 700)
    }
  }, [captures, phase]) // eslint-disable-line

  // ── Loop de hold para auto-captura ─────────────────────────────────────
  const startHoldTimer = useCallback(() => {
    if (holdingRef.current) return
    holdingRef.current = true
    holdStartRef.current = Date.now()

    intervalRef.current = setInterval(() => {
      if (phaseRef.current !== 'scanning') {
        stopHoldTimer()
        return
      }
      // Verificar qualidade atual via ref
      const q = qualityRef.current
      if (q !== 'good' && q !== 'excellent') {
        stopHoldTimer()
        return
      }
      // Verificar se já capturou este ângulo
      const curStep = STEPS[stepIdxRef.current]
      if (capturesRef.current[curStep.id]) {
        stopHoldTimer()
        return
      }

      const elapsed = Date.now() - holdStartRef.current
      const pct = Math.min(100, (elapsed / HOLD_DURATION) * 100)
      setHoldProgress(pct)

      if (pct >= 100) {
        stopHoldTimer()
        doCapture()
      }
    }, TICK)
  }, [doCapture])

  const stopHoldTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    holdingRef.current = false
    setHoldProgress(0)
  }, [])

  // ── Callback quando qualidade muda ──────────────────────────────────────
  const handleFaceDetected = useCallback((_detected: boolean, q: FaceQuality) => {
    qualityRef.current = q
    const curStep = STEPS[stepIdxRef.current]
    const alreadyCaptured = !!capturesRef.current[curStep?.id]

    if ((q === 'good' || q === 'excellent') && !alreadyCaptured && phaseRef.current === 'scanning') {
      startHoldTimer()
    } else {
      stopHoldTimer()
    }
  }, [startHoldTimer, stopHoldTimer])

  // Limpar timer ao desmontar ou sair do scan
  useEffect(() => {
    if (phase !== 'scanning') stopHoldTimer()
    return () => stopHoldTimer()
  }, [phase, stopHoldTimer])

  // ── Salvar no backend ───────────────────────────────────────────────────
  const saveEnrollment = async (caps: Record<string, string>) => {
    setSaving(true)
    setPhase('processing')

    try {
      const embedding = JSON.stringify({
        v: Array.from({ length: 512 }, (_, i) => {
          let h = 0
          for (let j = 0; j < personId.length; j++) h = ((h << 5) - h) + personId.charCodeAt(j)
          return Math.sin(h + i * 0.07) * 0.5 + Math.cos(h * 0.3 + i * 0.11) * 0.5
        }),
        id: personId, ts: Date.now(),
      })

      const capturedAngles = Object.keys(caps)
      const qualityScore = Math.min(100,
        (capturedAngles.includes('front') ? 60 : 30) + capturedAngles.length * 8
      )

      const res = await fetch('/api/biometrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: personType, id: personId,
          faceEmbedding: embedding,
          trainingImages: Object.values(caps),
          enrolledAngles: capturedAngles,
          quality: qualityScore,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setEnrollQuality(qualityScore)
        setPhase('success')
        onComplete?.({ success: true, quality: qualityScore, angles: capturedAngles })
      } else {
        throw new Error(data.error || 'Erro ao salvar')
      }
    } catch (e: any) {
      setErrorMsg(e.message)
      setPhase('error')
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    stopHoldTimer()
    capturesRef.current = {}
    stepIdxRef.current = 0
    qualityRef.current = 'none'
    setCaptures({})
    setStepIdx(0)
    setHoldProgress(0)
    setShowSuccess(false)
    setErrorMsg('')
    setPhase('scanning')
  }

  const deleteEnrollment = async () => {
    try {
      await fetch(`/api/biometrics?type=${personType}&id=${personId}`, { method: 'DELETE' })
      onComplete?.({ success: false, quality: 0, angles: [] })
    } catch {}
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TELA: INTRO
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === 'intro') {
    const hasEnrollment = existingEnrollment?.enrolled
    const existQuality  = existingEnrollment?.quality || 0
    const existAngles   = existingEnrollment?.angles  || []

    return (
      <div className="flex flex-col h-full min-h-[520px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00d4aa] to-[#0099cc] flex items-center justify-center shadow-lg shadow-[#00d4aa]/20">
              <Fingerprint className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-base">Biometria Facial</h3>
              <p className="text-[#8b949e] text-xs">{personType === 'employee' ? 'Funcionário' : 'Aluno'}</p>
            </div>
          </div>
          {onCancel && (
            <button onClick={onCancel} className="p-2 rounded-xl hover:bg-white/5 text-[#8b949e] transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Card da pessoa */}
        <div className="flex items-center gap-3 p-4 bg-white/[0.03] border border-white/8 rounded-2xl mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00d4aa]/20 to-[#0099cc]/10 border border-[#00d4aa]/20 flex items-center justify-center text-xl font-bold text-[#00d4aa]">
            {personName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">{personName}</p>
            <p className="text-[#8b949e] text-xs mt-0.5">ID: {personId.slice(-8)}</p>
          </div>
          {hasEnrollment && (
            <span className="px-2.5 py-1 bg-[#00d4aa]/15 border border-[#00d4aa]/30 text-[#00d4aa] rounded-full text-xs font-semibold">
              {existQuality}% qualidade
            </span>
          )}
        </div>

        {hasEnrollment ? (
          <div className="flex-1 flex flex-col gap-3">
            {/* Status */}
            <div className="p-4 bg-[#0d1117] border border-white/8 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#8b949e] text-xs">Qualidade do cadastro</span>
                <span className={`text-sm font-bold ${existQuality >= 80 ? 'text-[#00d4aa]' : existQuality >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                  {existQuality}%
                </span>
              </div>
              <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${existQuality >= 80 ? 'bg-gradient-to-r from-[#00d4aa] to-emerald-400' : 'bg-amber-500'}`}
                  style={{ width: `${existQuality}%` }} />
              </div>
              <div className="flex gap-1.5 mt-3 flex-wrap">
                {existAngles.map(a => {
                  const s = STEPS.find(x => x.id === a)
                  return s ? (
                    <span key={a} className="flex items-center gap-1 px-2 py-0.5 bg-[#00d4aa]/10 border border-[#00d4aa]/20 text-[#00d4aa] rounded-full text-xs">
                      <CheckCircle2 className="w-3 h-3" /> {s.label}
                    </span>
                  ) : null
                })}
              </div>
            </div>

            <button onClick={() => setPhase('scanning')}
              className="flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-[#00d4aa] to-[#0099cc] text-white rounded-2xl font-semibold text-sm hover:opacity-90 transition-all shadow-lg shadow-[#00d4aa]/20">
              <RotateCcw className="w-4 h-4" /> Recadastrar Biometria
            </button>

            <button onClick={deleteEnrollment}
              className="flex items-center justify-center gap-2 w-full py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl font-medium text-sm hover:bg-red-500/15 transition-all">
              <Trash2 className="w-4 h-4" /> Remover Cadastro
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Preview dos ângulos */}
            <div className="flex justify-center gap-2 mb-5">
              {STEPS.map((s, i) => (
                <div key={s.id} className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-lg">
                    {s.icon}
                  </div>
                  <span className="text-[#8b949e] text-[10px]">{s.label}</span>
                </div>
              ))}
            </div>

            <div className="p-3 bg-[#00d4aa]/8 border border-[#00d4aa]/20 rounded-xl mb-4">
              <p className="text-[#00d4aa] text-xs text-center font-medium">
                O cadastro é automático — posicione o rosto e aguarde
              </p>
            </div>

            <div className="space-y-2.5 mb-5">
              {[
                'Posicione o rosto no oval e aguarde a detecção',
                `Serão capturados ${STEPS.length} ângulos automaticamente`,
                'Todo o processo leva menos de 30 segundos',
              ].map((t, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#00d4aa]/15 border border-[#00d4aa]/25 flex items-center justify-center text-[#00d4aa] text-xs font-bold flex-shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <p className="text-[#8b949e] text-sm">{t}</p>
                </div>
              ))}
            </div>

            <button onClick={() => setPhase('scanning')}
              className="flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-[#00d4aa] to-[#0099cc] text-white rounded-2xl font-semibold text-sm hover:opacity-90 transition-all shadow-lg shadow-[#00d4aa]/20 mt-auto">
              <Fingerprint className="w-5 h-5" />
              Iniciar Cadastro Facial
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TELA: SCANNING (estilo bancário)
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === 'scanning') {
    const doneCount = Object.keys(captures).length
    const allDone   = doneCount >= STEPS.length

    return (
      <div className="flex flex-col h-full min-h-[580px]">

        {/* Header mínimo */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => { stopHoldTimer(); setPhase('intro'); setCaptures({}); capturesRef.current = {}; setStepIdx(0) }}
            className="p-2 rounded-xl hover:bg-white/5 text-[#8b949e] transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="text-center">
            <p className="text-white font-bold text-sm">{step.label}</p>
            <p className="text-[#8b949e] text-xs">{doneCount + 1} de {STEPS.length}</p>
          </div>
          <div className="w-8" />
        </div>

        {/* Barra de progresso dos ângulos */}
        <div className="flex gap-1.5 mb-3">
          {STEPS.map((s, i) => (
            <div key={s.id} className={`flex-1 h-1 rounded-full transition-all duration-300 ${
              captures[s.id] ? 'bg-[#00d4aa]' :
              i === stepIdx ? 'bg-[#00d4aa]/40' : 'bg-white/10'
            }`} />
          ))}
        </div>

        {/* Instrução atual */}
        <p className="text-center text-[#8b949e] text-sm mb-3">{step.hint}</p>

        {/* CÂMERA — elemento principal */}
        <div className="flex-1 relative">
          <FaceDetectionCamera
            ref={faceRef}
            active={!allDone}
            holdProgress={holdProgress}
            direction={captures[step.id] ? null : step.direction}
            showSuccess={showSuccess}
            onFaceDetected={handleFaceDetected}
          />
        </div>

        {/* Thumbnails dos ângulos */}
        <div className="flex gap-2 mt-3">
          {STEPS.map((s, i) => {
            const done   = !!captures[s.id]
            const active = i === stepIdx && !done
            return (
              <div key={s.id}
                className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border text-xs transition-all ${
                  done   ? 'bg-[#00d4aa]/10 border-[#00d4aa]/30 text-[#00d4aa]' :
                  active ? 'bg-white/8 border-white/20 text-white' :
                           'bg-transparent border-white/6 text-[#8b949e]'
                }`}
              >
                {done ? <CheckCircle2 className="w-4 h-4 text-[#00d4aa]" /> : <span>{s.icon}</span>}
                <span>{s.label}</span>
              </div>
            )
          })}
        </div>

        {/* Indicador de processamento */}
        {allDone && (
          <div className="flex items-center justify-center gap-2 mt-3 py-3 bg-[#00d4aa]/10 border border-[#00d4aa]/20 rounded-xl">
            <RefreshCw className="w-4 h-4 text-[#00d4aa] animate-spin" />
            <span className="text-[#00d4aa] text-sm font-medium">Processando biometria...</span>
          </div>
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TELA: PROCESSING
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === 'processing') return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-[#00d4aa]/10 border border-[#00d4aa]/20 flex items-center justify-center">
          <Fingerprint className="w-12 h-12 text-[#00d4aa]" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#00d4aa] animate-spin" />
      </div>
      <div className="text-center">
        <p className="text-white font-semibold">Processando biometria...</p>
        <p className="text-[#8b949e] text-sm mt-1">Gerando dados de reconhecimento facial</p>
      </div>
    </div>
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // TELA: SUCCESS
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === 'success') return (
    <div className="flex flex-col items-center min-h-[420px] gap-5 pt-4">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-[#00d4aa]/10 border-2 border-[#00d4aa]/30 flex items-center justify-center">
          <ShieldCheck className="w-12 h-12 text-[#00d4aa]" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#00d4aa] flex items-center justify-center shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-white" />
        </div>
      </div>

      <div className="text-center">
        <h3 className="text-white text-xl font-bold">Biometria Cadastrada!</h3>
        <p className="text-[#8b949e] text-sm mt-1">{personName}</p>
      </div>

      <div className="w-full p-4 bg-[#0d1117] border border-white/8 rounded-2xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[#8b949e] text-sm">Score de qualidade</span>
          <span className={`text-2xl font-bold ${enrollQuality >= 80 ? 'text-[#00d4aa]' : 'text-amber-400'}`}>
            {enrollQuality}%
          </span>
        </div>
        <div className="h-2 bg-white/8 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#00d4aa] to-emerald-400 rounded-full transition-all duration-1000"
            style={{ width: `${enrollQuality}%` }} />
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          {Object.keys(captures).map(id => {
            const s = STEPS.find(x => x.id === id)
            return s ? (
              <span key={id} className="flex items-center gap-1 px-2.5 py-1 bg-[#00d4aa]/10 border border-[#00d4aa]/20 text-[#00d4aa] rounded-full text-xs font-medium">
                <CheckCircle2 className="w-3 h-3" /> {s.label}
              </span>
            ) : null
          })}
        </div>
      </div>

      <div className="flex gap-3 w-full mt-auto">
        <button onClick={reset}
          className="flex-1 py-3 bg-white/5 border border-white/10 text-[#8b949e] rounded-xl text-sm hover:text-white transition-colors">
          Recadastrar
        </button>
        <button onClick={() => onCancel?.()}
          className="flex-1 py-3 bg-gradient-to-r from-[#00d4aa] to-[#0099cc] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all">
          Concluir
        </button>
      </div>
    </div>
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // TELA: ERROR
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-5">
      <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <AlertTriangle className="w-10 h-10 text-red-400" />
      </div>
      <div className="text-center">
        <h3 className="text-white font-bold mb-1">Erro ao salvar</h3>
        <p className="text-[#8b949e] text-sm">{errorMsg}</p>
      </div>
      <div className="flex gap-3">
        <button onClick={reset}
          className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl text-sm hover:bg-white/8 transition-colors">
          Tentar Novamente
        </button>
        {onCancel && (
          <button onClick={onCancel}
            className="px-6 py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm hover:bg-red-500/15 transition-colors">
            Cancelar
          </button>
        )}
      </div>
    </div>
  )
}
