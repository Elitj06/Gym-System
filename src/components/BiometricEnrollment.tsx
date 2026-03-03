'use client'

/**
 * BiometricEnrollment
 *
 * Fluxo de cadastro facial de nível enterprise, inspirado em:
 * - Apple Face ID (oval animada, feedback de progresso)
 * - IDEMIA / FacePhi (múltiplos ângulos, score de qualidade)
 * - Clear / TSA PreCheck (guia passo a passo intuitivo)
 *
 * Suporta: funcionários (type='employee') e alunos (type='member')
 */

import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import dynamic from 'next/dynamic'
import { CheckCircle2, X, RefreshCw, ShieldCheck, AlertTriangle, Fingerprint, ChevronRight, RotateCcw, Trash2 } from 'lucide-react'
import type { FaceDetectionRef, FaceQuality } from './FaceDetectionCamera'

const FaceDetectionCamera = dynamic(() => import('./FaceDetectionCamera'), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-[4/3] bg-[#0a0f14] rounded-2xl flex items-center justify-center border border-white/10">
      <div className="w-6 h-6 border-2 border-[#00d4aa] border-t-transparent rounded-full animate-spin" />
    </div>
  )
})

// ── Angle definitions ────────────────────────────────────────────────────────
const ANGLES = [
  {
    id: 'front',
    label: 'Frente',
    hint: 'Olhe diretamente para a câmera com expressão neutra',
    icon: '👁',
    arrowAngle: null,
    weight: 0.4,  // contribuição para o score final
  },
  {
    id: 'left',
    label: 'Esquerda',
    hint: 'Vire o rosto levemente para a esquerda (15-30°)',
    icon: '👈',
    arrowAngle: -30,
    weight: 0.15,
  },
  {
    id: 'right',
    label: 'Direita',
    hint: 'Vire o rosto levemente para a direita (15-30°)',
    icon: '👉',
    arrowAngle: 30,
    weight: 0.15,
  },
  {
    id: 'up',
    label: 'Cima',
    hint: 'Incline levemente o queixo para cima',
    icon: '👆',
    arrowAngle: -90,
    weight: 0.15,
  },
  {
    id: 'down',
    label: 'Baixo',
    hint: 'Incline levemente o queixo para baixo',
    icon: '👇',
    arrowAngle: 90,
    weight: 0.15,
  },
]

// ── Types ────────────────────────────────────────────────────────────────────
export interface BiometricEnrollmentProps {
  personId: string
  personName: string
  personType: 'employee' | 'member'
  onComplete?: (result: { success: boolean; quality: number; angles: string[] }) => void
  onCancel?: () => void
  existingEnrollment?: {
    enrolled: boolean
    quality?: number
    angles?: string[]
    lastTrained?: string
  } | null
}

// ── Component ────────────────────────────────────────────────────────────────
export default function BiometricEnrollment({
  personId,
  personName,
  personType,
  onComplete,
  onCancel,
  existingEnrollment,
}: BiometricEnrollmentProps) {
  const faceRef = useRef<FaceDetectionRef>(null)

  type Phase = 'intro' | 'capture' | 'processing' | 'success' | 'error'

  const [phase,         setPhase]         = useState<Phase>('intro')
  const [currentAngle,  setCurrentAngle]  = useState(0)
  const [captures,      setCaptures]      = useState<Record<string, string>>({})
  const [quality,       setQuality]       = useState<FaceQuality>('none')
  const [enrollQuality, setEnrollQuality] = useState(0)
  const [saving,        setSaving]        = useState(false)
  const [errorMsg,      setErrorMsg]      = useState('')
  const [captureFlash,  setCaptureFlash]  = useState(false)
  const [holdProgress,  setHoldProgress]  = useState(0)

  // Refs para evitar closures stale no timer
  const holdTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const holdStartRef    = useRef<number>(0)
  const currentAngleRef = useRef(0)
  const capturesRef     = useRef<Record<string, string>>({})
  const qualityRef      = useRef<FaceQuality>('none')
  const phaseRef        = useRef<Phase>('intro')

  // Manter refs sincronizados com state
  useEffect(() => { currentAngleRef.current = currentAngle }, [currentAngle])
  useEffect(() => { capturesRef.current = captures },         [captures])
  useEffect(() => { qualityRef.current = quality },           [quality])
  useEffect(() => { phaseRef.current = phase },               [phase])

  const canCapture   = quality === 'good' || quality === 'excellent'
  const angle        = ANGLES[currentAngle]
  const totalAngles  = ANGLES.length
  const doneAngles   = Object.keys(captures)
  const allCaptured  = doneAngles.length >= totalAngles
  const cameraActive = phase === 'capture'

  // ── Capture photo — usa refs, nunca stale ────────────────────────────────
  const doCapture = useCallback(() => {
    const img = faceRef.current?.capture()
    if (!img) return

    const angleIdx = currentAngleRef.current
    const angleId  = ANGLES[angleIdx].id

    // Já capturou este ângulo (guard duplo)
    if (capturesRef.current[angleId]) return

    setCaptureFlash(true)
    setTimeout(() => setCaptureFlash(false), 250)

    // Atualizar captures
    const newCaptures = { ...capturesRef.current, [angleId]: img }
    capturesRef.current = newCaptures
    setCaptures(newCaptures)
    setHoldProgress(0)

    // Avançar para próximo ângulo
    setTimeout(() => {
      const next = angleIdx + 1
      if (next < ANGLES.length) {
        currentAngleRef.current = next
        setCurrentAngle(next)
      }
    }, 700)
  }, []) // sem dependências — usa só refs

  // ── Auto-capture: hold 1.5s com boa qualidade ───────────────────────────
  useEffect(() => {
    // Limpar timer anterior sempre que as deps mudarem
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current)
      holdTimerRef.current = null
    }
    setHoldProgress(0)

    if (phase !== 'capture') return
    if (!canCapture) return
    if (captures[angle.id]) return  // já capturado

    const HOLD_MS = 1500
    const TICK_MS = 40
    holdStartRef.current = Date.now()

    holdTimerRef.current = setInterval(() => {
      // Re-verificar condições no tick (usando refs para valores atuais)
      if (phaseRef.current !== 'capture') {
        clearInterval(holdTimerRef.current!)
        holdTimerRef.current = null
        setHoldProgress(0)
        return
      }
      if (qualityRef.current !== 'good' && qualityRef.current !== 'excellent') {
        clearInterval(holdTimerRef.current!)
        holdTimerRef.current = null
        setHoldProgress(0)
        return
      }

      const elapsed = Date.now() - holdStartRef.current
      const pct = Math.min(100, (elapsed / HOLD_MS) * 100)
      setHoldProgress(pct)

      if (pct >= 100) {
        clearInterval(holdTimerRef.current!)
        holdTimerRef.current = null
        doCapture()
      }
    }, TICK_MS)

    return () => {
      if (holdTimerRef.current) {
        clearInterval(holdTimerRef.current)
        holdTimerRef.current = null
      }
      setHoldProgress(0)
    }
  }, [phase, canCapture, currentAngle, angle.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save enrollment ──────────────────────────────────────────────────────
  const save = async () => {
    if (Object.keys(captures).length === 0) return
    setSaving(true)
    setPhase('processing')

    try {
      // Calcular embedding sintético (em produção: usar MediaPipe FaceMesh / face-api.js)
      const embedding = JSON.stringify({
        v: Array.from({ length: 512 }, (_, i) => {
          let h = 0
          for (let j = 0; j < personId.length; j++) h = ((h << 5) - h) + personId.charCodeAt(j)
          return Math.sin(h + i * 0.07) * 0.5 + Math.cos(h * 0.3 + i * 0.11) * 0.5
        }),
        id: personId,
        ts: Date.now(),
      })

      const qualityScore = calcQuality()

      const res = await fetch('/api/biometrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: personType,
          id: personId,
          faceEmbedding: embedding,
          trainingImages: Object.values(captures),
          enrolledAngles: Object.keys(captures),
          quality: qualityScore,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setEnrollQuality(qualityScore)
        setPhase('success')
        onComplete?.({ success: true, quality: qualityScore, angles: Object.keys(captures) })
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

  const calcQuality = () => {
    const captured  = Object.keys(captures)
    const hasFront  = captured.includes('front')
    const baseScore = hasFront ? 60 : 30
    const angleBonus = captured.length * 8
    const exBonus = quality === 'excellent' ? 10 : 0
    return Math.min(100, baseScore + angleBonus + exBonus)
  }

  const reset = () => {
    if (holdTimerRef.current) { clearInterval(holdTimerRef.current); holdTimerRef.current = null }
    capturesRef.current = {}
    currentAngleRef.current = 0
    qualityRef.current = 'none'
    setCaptures({})
    setCurrentAngle(0)
    setHoldProgress(0)
    setQuality('none')
    setPhase('capture')
    setErrorMsg('')
  }

  const deleteEnrollment = async () => {
    try {
      await fetch(`/api/biometrics?type=${personType}&id=${personId}`, { method: 'DELETE' })
      onComplete?.({ success: false, quality: 0, angles: [] })
    } catch {}
  }

  // ─── INTRO SCREEN ─────────────────────────────────────────────────────────
  if (phase === 'intro') {
    const hasEnrollment = existingEnrollment?.enrolled
    const existQuality  = existingEnrollment?.quality || 0
    const existAngles   = existingEnrollment?.angles || []

    return (
      <div className="flex flex-col h-full min-h-[560px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00d4aa] to-[#0099cc] flex items-center justify-center shadow-lg shadow-[#00d4aa]/20">
              <Fingerprint className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold leading-tight">Biometria Facial</h3>
              <p className="text-[#8b949e] text-xs">{personType === 'employee' ? 'Funcionário' : 'Aluno'}</p>
            </div>
          </div>
          {onCancel && (
            <button onClick={onCancel} className="p-2 rounded-lg hover:bg-white/5 text-[#8b949e] transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Person info */}
        <div className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/8 rounded-2xl mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00d4aa]/20 to-[#0099cc]/10 border border-[#00d4aa]/20 flex items-center justify-center text-2xl font-bold text-[#00d4aa]">
            {personName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold">{personName}</p>
            <p className="text-[#8b949e] text-xs mt-0.5">
              {personType === 'employee' ? 'Funcionário' : 'Membro'} &bull; ID: {personId.slice(-8)}
            </p>
          </div>
          {hasEnrollment && (
            <div className="flex flex-col items-end gap-1">
              <span className="px-2.5 py-1 bg-[#00d4aa]/15 border border-[#00d4aa]/30 text-[#00d4aa] rounded-full text-xs font-semibold">
                Cadastrado
              </span>
              <span className="text-[#8b949e] text-xs">{existQuality}% qualidade</span>
            </div>
          )}
        </div>

        {/* Existing enrollment status */}
        {hasEnrollment ? (
          <div className="flex-1 flex flex-col gap-4">
            {/* Quality bar */}
            <div className="p-4 bg-[#0d1117] border border-white/8 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#8b949e] text-xs">Qualidade do cadastro</span>
                <span className={`text-sm font-bold ${existQuality >= 80 ? 'text-[#00d4aa]' : existQuality >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                  {existQuality}%
                </span>
              </div>
              <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${existQuality >= 80 ? 'bg-gradient-to-r from-[#00d4aa] to-emerald-400' : existQuality >= 60 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-gradient-to-r from-red-500 to-orange-400'}`}
                  style={{ width: `${existQuality}%` }}
                />
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                {existAngles.map(a => {
                  const ang = ANGLES.find(x => x.id === a)
                  return ang ? (
                    <span key={a} className="flex items-center gap-1 px-2 py-0.5 bg-[#00d4aa]/10 border border-[#00d4aa]/20 text-[#00d4aa] rounded-full text-xs">
                      <CheckCircle2 className="w-3 h-3" /> {ang.label}
                    </span>
                  ) : null
                })}
              </div>
            </div>

            {/* Actions */}
            <button
              onClick={() => setPhase('capture')}
              className="flex items-center justify-center gap-3 w-full py-4 bg-gradient-to-r from-[#00d4aa] to-[#0099cc] text-white rounded-2xl font-semibold text-sm hover:opacity-90 transition-all shadow-lg shadow-[#00d4aa]/20"
            >
              <RotateCcw className="w-5 h-5" />
              Recadastrar Biometria
            </button>

            <button
              onClick={deleteEnrollment}
              className="flex items-center justify-center gap-2 w-full py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl font-medium text-sm hover:bg-red-500/15 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Remover Cadastro
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-4">
            {/* How it works */}
            <div className="p-4 bg-[#0d1117] border border-white/8 rounded-xl space-y-3">
              <p className="text-[#8b949e] text-xs font-semibold uppercase tracking-wider">Como funciona</p>
              {[
                { n: 1, text: 'Posicione o rosto no oval e aguarde a detecção automática' },
                { n: 2, text: `Serão capturados ${ANGLES.length} ângulos diferentes do rosto` },
                { n: 3, text: 'Cada ângulo é capturado automaticamente quando a posição é detectada' },
                { n: 4, text: 'Dados ficam disponíveis para análises e relatórios de IA' },
              ].map(s => (
                <div key={s.n} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#00d4aa]/20 border border-[#00d4aa]/30 flex items-center justify-center text-[#00d4aa] text-xs font-bold flex-shrink-0 mt-0.5">
                    {s.n}
                  </div>
                  <p className="text-[#8b949e] text-sm">{s.text}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setPhase('capture')}
              className="flex items-center justify-center gap-3 w-full py-4 bg-gradient-to-r from-[#00d4aa] to-[#0099cc] text-white rounded-2xl font-semibold text-sm hover:opacity-90 transition-all shadow-lg shadow-[#00d4aa]/20 mt-auto"
            >
              <Fingerprint className="w-5 h-5" />
              Iniciar Cadastro Facial
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    )
  }

  // ─── CAPTURE SCREEN ───────────────────────────────────────────────────────
  if (phase === 'capture') {
    return (
      <div className="flex flex-col h-full min-h-[600px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => { setPhase('intro'); setCaptures({}); setCurrentAngle(0) }}
            className="p-2 rounded-lg hover:bg-white/5 text-[#8b949e] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-white font-semibold text-sm">Cadastro Facial</p>
            <p className="text-[#8b949e] text-xs">{personName}</p>
          </div>
          <div className="w-9" /> {/* spacer */}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-4">
          {ANGLES.map((a, i) => {
            const done = !!captures[a.id]
            const active = i === currentAngle && !done
            return (
              <div
                key={a.id}
                className={`transition-all duration-300 rounded-full ${
                  done    ? 'w-5 h-2 bg-[#00d4aa]' :
                  active  ? 'w-8 h-2 bg-[#00d4aa]/60' :
                            'w-2 h-2 bg-white/15'
                }`}
              />
            )
          })}
        </div>

        {/* Camera with flash overlay */}
        <div className="relative mb-4">
          {/* Flash effect */}
          {captureFlash && (
            <div className="absolute inset-0 z-30 bg-white/40 rounded-2xl pointer-events-none animate-pulse" />
          )}

          {/* Overlay: if angle already captured, show checkmark */}
          {captures[angle.id] && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0d1117]/80 rounded-2xl backdrop-blur-sm">
              <CheckCircle2 className="w-16 h-16 text-[#00d4aa] mb-3" />
              <p className="text-white font-semibold">{angle.label} capturado!</p>
              <p className="text-[#8b949e] text-sm mt-1">
                {currentAngle + 1 < totalAngles
                  ? `Próximo: ${ANGLES[currentAngle + 1]?.label}`
                  : 'Todos os ângulos capturados!'}
              </p>
            </div>
          )}

          <FaceDetectionCamera
            ref={faceRef}
            active={cameraActive && !captures[angle.id]}
            onFaceDetected={(_, q) => { qualityRef.current = q; setQuality(q) }}
          />

          {/* Auto-capture progress ring — canto inferior direito, fora do rosto */}
          {canCapture && !captures[angle.id] && (
            <div className="absolute bottom-3 right-3 z-10">
              <div className="relative w-16 h-16">
                {/* Fundo semi-opaco */}
                <div className="absolute inset-0 rounded-full bg-black/60 backdrop-blur-sm border border-white/20" />
                <svg className="w-16 h-16 -rotate-90 relative z-10" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="27" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="4" />
                  <circle
                    cx="32" cy="32" r="27"
                    fill="none"
                    stroke={holdProgress > 0 ? '#00d4aa' : 'rgba(255,255,255,0.3)'}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 27}`}
                    strokeDashoffset={`${2 * Math.PI * 27 * (1 - holdProgress / 100)}`}
                    style={{ transition: 'stroke-dashoffset 0.04s linear' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                  <span className="text-lg leading-none">{angle.icon}</span>
                  {holdProgress > 0 && (
                    <span className="text-[10px] font-bold text-[#00d4aa] leading-none mt-0.5">
                      {Math.round(holdProgress)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Barra de progresso linear abaixo da câmera */}
        <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden -mt-1 mb-1">
          <div
            className="h-full bg-gradient-to-r from-[#00d4aa] to-emerald-400 rounded-full"
            style={{
              width: `${canCapture && !captures[angle.id] ? holdProgress : captures[angle.id] ? 100 : 0}%`,
              transition: 'width 0.04s linear',
            }}
          />
        </div>

        {/* Current angle instruction */}
        <div className={`p-3 rounded-xl border mb-3 transition-all ${
          captures[angle.id]
            ? 'bg-[#00d4aa]/10 border-[#00d4aa]/30'
            : canCapture
              ? 'bg-[#00d4aa]/8 border-[#00d4aa]/20'
              : 'bg-white/[0.03] border-white/8'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{angle.icon}</span>
            <span className="text-white font-medium text-sm">
              {captures[angle.id] ? `${angle.label} ✓` : `Ângulo ${currentAngle + 1}/${totalAngles}: ${angle.label}`}
            </span>
            {canCapture && !captures[angle.id] && (
              <span className="ml-auto text-[#00d4aa] text-xs font-medium animate-pulse">
                Segure...
              </span>
            )}
          </div>
          {!captures[angle.id] && (
            <p className="text-[#8b949e] text-xs">{angle.hint}</p>
          )}
        </div>

        {/* Angle thumbnails */}
        <div className="flex gap-2 mb-4">
          {ANGLES.map((a, i) => {
            const done = !!captures[a.id]
            const active = i === currentAngle
            return (
              <button
                key={a.id}
                onClick={() => !captures[a.id] && setCurrentAngle(i)}
                className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-xl border text-xs transition-all ${
                  done
                    ? 'bg-[#00d4aa]/10 border-[#00d4aa]/30 text-[#00d4aa]'
                    : active
                      ? 'bg-white/8 border-white/20 text-white'
                      : 'bg-transparent border-white/8 text-[#8b949e]'
                }`}
              >
                {done ? <CheckCircle2 className="w-4 h-4 text-[#00d4aa]" /> : <span>{a.icon}</span>}
                <span>{a.label}</span>
              </button>
            )
          })}
        </div>

        {/* CTA */}
        {allCaptured ? (
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center justify-center gap-3 w-full py-4 bg-gradient-to-r from-[#00d4aa] to-[#0099cc] text-white rounded-2xl font-semibold text-sm hover:opacity-90 transition-all shadow-lg shadow-[#00d4aa]/20 mt-auto"
          >
            {saving
              ? <><RefreshCw className="w-5 h-5 animate-spin" /> Salvando...</>
              : <><ShieldCheck className="w-5 h-5" /> Confirmar Cadastro</>
            }
          </button>
        ) : (
          <button
            onClick={doCapture}
            disabled={!canCapture || !!captures[angle.id]}
            className={`flex items-center justify-center gap-3 w-full py-3.5 rounded-2xl font-semibold text-sm transition-all mt-auto ${
              canCapture && !captures[angle.id]
                ? 'bg-white/10 border border-white/20 text-white hover:bg-white/15'
                : 'bg-white/5 border border-white/8 text-[#8b949e] cursor-not-allowed'
            }`}
          >
            {canCapture && !captures[angle.id]
              ? 'Capturar agora (ou aguarde)'
              : captures[angle.id]
                ? 'Capturado ✓'
                : 'Posicione o rosto no oval'}
          </button>
        )}
      </div>
    )
  }

  // ─── PROCESSING SCREEN ────────────────────────────────────────────────────
  if (phase === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-[#00d4aa]/10 border border-[#00d4aa]/20 flex items-center justify-center">
            <Fingerprint className="w-10 h-10 text-[#00d4aa]" />
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-[#00d4aa]/40 border-t-[#00d4aa] animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-white font-semibold mb-1">Processando biometria...</p>
          <p className="text-[#8b949e] text-sm">Gerando embedding facial e salvando dados</p>
        </div>
        <div className="flex gap-2">
          {['Analisando', 'Vetorizando', 'Salvando'].map((s, i) => (
            <span key={s} className="px-3 py-1 bg-white/5 border border-white/8 rounded-full text-xs text-[#8b949e]"
              style={{ animationDelay: `${i * 0.3}s` }}>
              {s}
            </span>
          ))}
        </div>
      </div>
    )
  }

  // ─── SUCCESS SCREEN ───────────────────────────────────────────────────────
  if (phase === 'success') {
    return (
      <div className="flex flex-col items-center min-h-[400px] gap-5 pt-4">
        {/* Icon */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-[#00d4aa]/10 border-2 border-[#00d4aa]/30 flex items-center justify-center">
            <ShieldCheck className="w-12 h-12 text-[#00d4aa]" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#00d4aa] flex items-center justify-center shadow-lg">
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
        </div>

        <div className="text-center">
          <h3 className="text-white text-xl font-bold mb-1">Biometria Cadastrada!</h3>
          <p className="text-[#8b949e] text-sm">{personName}</p>
        </div>

        {/* Quality score */}
        <div className="w-full p-4 bg-[#0d1117] border border-white/8 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[#8b949e] text-sm">Score de qualidade</span>
            <span className={`text-2xl font-bold ${enrollQuality >= 80 ? 'text-[#00d4aa]' : enrollQuality >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
              {enrollQuality}%
            </span>
          </div>
          <div className="h-2.5 bg-white/8 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${enrollQuality >= 80 ? 'bg-gradient-to-r from-[#00d4aa] to-emerald-400' : enrollQuality >= 60 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-gradient-to-r from-red-500 to-orange-400'}`}
              style={{ width: `${enrollQuality}%` }}
            />
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            {Object.keys(captures).map(id => {
              const a = ANGLES.find(x => x.id === id)
              return a ? (
                <span key={id} className="flex items-center gap-1 px-2.5 py-1 bg-[#00d4aa]/10 border border-[#00d4aa]/20 text-[#00d4aa] rounded-full text-xs font-medium">
                  <CheckCircle2 className="w-3 h-3" /> {a.label}
                </span>
              ) : null
            })}
          </div>
        </div>

        {/* Info */}
        <div className="w-full p-3 bg-blue-500/8 border border-blue-500/20 rounded-xl">
          <p className="text-blue-300 text-xs text-center">
            Biometria disponível para reconhecimento facial, análises de IA e relatórios individuais
          </p>
        </div>

        <div className="flex gap-3 w-full mt-auto">
          <button
            onClick={reset}
            className="flex-1 py-3 bg-white/5 border border-white/10 text-[#8b949e] rounded-xl text-sm hover:text-white transition-colors"
          >
            Recadastrar
          </button>
          <button
            onClick={() => onCancel?.()}
            className="flex-1 py-3 bg-gradient-to-r from-[#00d4aa] to-[#0099cc] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all"
          >
            Concluir
          </button>
        </div>
      </div>
    )
  }

  // ─── ERROR SCREEN ─────────────────────────────────────────────────────────
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
        <button onClick={reset} className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl text-sm hover:bg-white/8 transition-colors">
          Tentar Novamente
        </button>
        {onCancel && (
          <button onClick={onCancel} className="px-6 py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm hover:bg-red-500/15 transition-colors">
            Cancelar
          </button>
        )}
      </div>
    </div>
  )
}
