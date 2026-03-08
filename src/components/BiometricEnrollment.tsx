"use client"

/**
 * BiometricEnrollment v4 — Clean Phases + Callback Capture
 * 
 * NO ref to FaceDetectionCamera. The camera captures internally
 * and calls onCaptured(imageUrl). This fixes the Next.js dynamic() ref bug.
 * 
 * UI: Each phase is a clean, separate full screen. No clutter.
 */

import { useState, useCallback } from "react"
import dynamic from "next/dynamic"
import {
  CheckCircle2, X, ShieldCheck, AlertTriangle,
  ScanFace, ChevronRight, RotateCcw, Trash2, Loader2,
} from "lucide-react"

const FaceDetectionCamera = dynamic(() => import("./FaceDetectionCamera"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[300px] bg-[#0a0f14] rounded-3xl flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#00d4aa] border-t-transparent rounded-full animate-spin" />
    </div>
  ),
})

// ── Steps ─────────────────────────────────────────────────────────────────
const STEPS = [
  { id: "front", label: "Frente",    hint: "Olhe diretamente para a camera", direction: "front" as const },
  { id: "left",  label: "Esquerda",  hint: "Vire levemente para a esquerda", direction: "left"  as const },
  { id: "right", label: "Direita",   hint: "Vire levemente para a direita",  direction: "right" as const },
  { id: "up",    label: "Cima",      hint: "Levante levemente o queixo",     direction: "up"    as const },
  { id: "down",  label: "Baixo",     hint: "Abaixe levemente o queixo",      direction: "down"  as const },
]

// ── Types ─────────────────────────────────────────────────────────────────
export interface BiometricEnrollmentProps {
  personId: string
  personName: string
  personType: "employee" | "member"
  onComplete?: (result: { success: boolean; quality: number; angles: string[] }) => void
  onCancel?: () => void
  existingEnrollment?: {
    enrolled: boolean; quality?: number; angles?: string[]; lastTrained?: string
  } | null
}

type Phase = "intro" | "capturing" | "between" | "processing" | "success" | "error"

// ── Component ─────────────────────────────────────────────────────────────
export default function BiometricEnrollment({
  personId, personName, personType, onComplete, onCancel, existingEnrollment,
}: BiometricEnrollmentProps) {

  const [phase,         setPhase]         = useState<Phase>("intro")
  const [stepIdx,       setStepIdx]       = useState(0)
  const [captures,      setCaptures]      = useState<Record<string, string>>({})
  const [cameraKey,     setCameraKey]     = useState(0)
  const [errorMsg,      setErrorMsg]      = useState("")
  const [enrollQuality, setEnrollQuality] = useState(0)

  const step = STEPS[stepIdx] || STEPS[0]

  // ── Reset ───────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setCaptures({})
    setStepIdx(0)
    setErrorMsg("")
    setCameraKey(k => k + 1)
    setPhase("capturing")
  }, [])

  // ── Camera captured an image (callback from FaceDetectionCamera) ────
  const handleCaptured = useCallback((imageUrl: string) => {
    const currentId = STEPS[stepIdx]?.id
    if (!currentId) return

    const newCaptures = { ...captures, [currentId]: imageUrl }
    setCaptures(newCaptures)

    const nextIdx = stepIdx + 1

    if (nextIdx >= STEPS.length) {
      // All done — process
      setPhase("processing")
      setTimeout(() => saveEnrollment(newCaptures), 600)
    } else {
      // Show brief transition, then mount new camera for next step
      setPhase("between")
      setTimeout(() => {
        setStepIdx(nextIdx)
        setCameraKey(k => k + 1)
        setPhase("capturing")
      }, 800)
    }
  }, [stepIdx, captures]) // eslint-disable-line

  // ── Save ────────────────────────────────────────────────────────────
  const saveEnrollment = async (caps: Record<string, string>) => {
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
        (capturedAngles.includes("front") ? 60 : 30) + capturedAngles.length * 8
      )

      const res = await fetch("/api/biometrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        setPhase("success")
        onComplete?.({ success: true, quality: qualityScore, angles: capturedAngles })
      } else {
        throw new Error(data.error || "Erro ao salvar")
      }
    } catch (e: any) {
      setErrorMsg(e.message)
      setPhase("error")
    }
  }

  const deleteEnrollment = async () => {
    try {
      await fetch(`/api/biometrics?type=${personType}&id=${personId}`, { method: "DELETE" })
      onComplete?.({ success: false, quality: 0, angles: [] })
    } catch {}
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE: INTRO
  // ═══════════════════════════════════════════════════════════════════════
  if (phase === "intro") {
    const hasEnroll = existingEnrollment?.enrolled
    const eq = existingEnrollment?.quality || 0
    const ea = existingEnrollment?.angles || []

    return (
      <div className="flex flex-col h-full min-h-[480px]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00d4aa] to-[#0099cc] flex items-center justify-center shadow-lg shadow-[#00d4aa]/20">
              <ScanFace className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-base">Biometria Facial</h3>
              <p className="text-[#8b949e] text-xs">{personType === "employee" ? "Funcionario" : "Aluno"}</p>
            </div>
          </div>
          {onCancel && (
            <button onClick={onCancel} className="p-2 rounded-xl hover:bg-white/5 text-[#8b949e]">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 p-4 bg-white/[0.03] border border-white/8 rounded-2xl mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00d4aa]/20 to-[#0099cc]/10 border border-[#00d4aa]/20 flex items-center justify-center text-xl font-bold text-[#00d4aa]">
            {personName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">{personName}</p>
            <p className="text-[#8b949e] text-xs mt-0.5">ID: {personId.slice(-8)}</p>
          </div>
          {hasEnroll && (
            <span className="px-2.5 py-1 bg-[#00d4aa]/15 border border-[#00d4aa]/30 text-[#00d4aa] rounded-full text-xs font-semibold">
              {eq}%
            </span>
          )}
        </div>

        {hasEnroll ? (
          <div className="flex-1 flex flex-col gap-3">
            <div className="p-4 bg-[#0d1117] border border-white/8 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#8b949e] text-xs">Qualidade</span>
                <span className={`text-sm font-bold ${eq >= 80 ? "text-[#00d4aa]" : "text-amber-400"}`}>{eq}%</span>
              </div>
              <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${eq >= 80 ? "bg-gradient-to-r from-[#00d4aa] to-emerald-400" : "bg-amber-500"}`}
                  style={{ width: `${eq}%` }} />
              </div>
              <div className="flex gap-1.5 mt-3 flex-wrap">
                {ea.map(a => {
                  const s = STEPS.find(x => x.id === a)
                  return s ? (
                    <span key={a} className="flex items-center gap-1 px-2 py-0.5 bg-[#00d4aa]/10 border border-[#00d4aa]/20 text-[#00d4aa] rounded-full text-xs">
                      <CheckCircle2 className="w-3 h-3" /> {s.label}
                    </span>
                  ) : null
                })}
              </div>
            </div>
            <button onClick={reset}
              className="flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-[#00d4aa] to-[#0099cc] text-white rounded-2xl font-semibold text-sm hover:opacity-90 transition-all shadow-lg shadow-[#00d4aa]/20">
              <RotateCcw className="w-4 h-4" /> Recadastrar
            </button>
            <button onClick={deleteEnrollment}
              className="flex items-center justify-center gap-2 w-full py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-sm hover:bg-red-500/15 transition-all">
              <Trash2 className="w-4 h-4" /> Remover
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="p-4 bg-white/[0.02] border border-white/8 rounded-2xl mb-5">
              <p className="text-white text-sm font-medium mb-3">Como funciona:</p>
              <div className="space-y-2">
                {["Posicione seu rosto na tela", "A captura e automatica em 5 angulos", "Leva menos de 30 segundos"].map((t, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-[#00d4aa]/15 flex items-center justify-center text-[#00d4aa] text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </div>
                    <p className="text-[#8b949e] text-sm">{t}</p>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => { setCameraKey(k => k + 1); setPhase("capturing") }}
              className="flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-[#00d4aa] to-[#0099cc] text-white rounded-2xl font-semibold text-sm hover:opacity-90 transition-all shadow-lg shadow-[#00d4aa]/20 mt-auto">
              <ScanFace className="w-5 h-5" />
              Iniciar Cadastro
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE: CAPTURING (clean full-screen camera)
  // ═══════════════════════════════════════════════════════════════════════
  if (phase === "capturing") {
    const doneCount = Object.keys(captures).length

    return (
      <div className="flex flex-col h-full min-h-[500px]">
        {/* Minimal header */}
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => { setPhase("intro"); setCaptures({}); setStepIdx(0) }}
            className="p-2 rounded-xl hover:bg-white/5 text-[#8b949e]">
            <X className="w-4 h-4" />
          </button>
          <div className="text-center">
            <p className="text-white font-bold text-sm">{step.label}</p>
            <p className="text-[#8b949e] text-[11px]">{doneCount + 1} de {STEPS.length}</p>
          </div>
          <div className="w-8" />
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5 mb-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className={`flex-1 h-1 rounded-full transition-all duration-500 ${
              captures[s.id] ? "bg-[#00d4aa]" :
              i === stepIdx ? "bg-[#00d4aa]/40" : "bg-white/10"
            }`} />
          ))}
        </div>

        {/* Direction hint */}
        <p className="text-center text-[#8b949e] text-xs mb-2">{step.hint}</p>

        {/* Camera — takes all remaining space */}
        <div className="flex-1 min-h-0">
          <FaceDetectionCamera
            key={cameraKey}
            active={true}
            direction={step.direction}
            holdDuration={2500}
            onCaptured={handleCaptured}
          />
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE: BETWEEN (transition between angles)
  // ═══════════════════════════════════════════════════════════════════════
  if (phase === "between") {
    const nextStep = STEPS[stepIdx + 1]
    const doneCount = Object.keys(captures).length

    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
        <div className="flex gap-1.5 w-full max-w-xs">
          {STEPS.map((s, i) => (
            <div key={s.id} className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
              captures[s.id] ? "bg-[#00d4aa]" : "bg-white/10"
            }`} />
          ))}
        </div>

        <div className="w-16 h-16 rounded-full bg-[#00d4aa]/10 border border-[#00d4aa]/20 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-[#00d4aa]" />
        </div>

        <div className="text-center">
          <p className="text-[#00d4aa] font-semibold text-sm">{doneCount} de {STEPS.length} capturados</p>
          {nextStep && (
            <p className="text-[#8b949e] text-xs mt-1">Proximo: {nextStep.label}</p>
          )}
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE: PROCESSING
  // ═══════════════════════════════════════════════════════════════════════
  if (phase === "processing") return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-[#00d4aa]/10 border border-[#00d4aa]/20 flex items-center justify-center">
          <ScanFace className="w-10 h-10 text-[#00d4aa]" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#00d4aa] animate-spin" />
      </div>
      <p className="text-white font-medium text-sm">Processando biometria...</p>
    </div>
  )

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE: SUCCESS
  // ═══════════════════════════════════════════════════════════════════════
  if (phase === "success") return (
    <div className="flex flex-col items-center min-h-[400px] gap-5 pt-4">
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-[#00d4aa]/10 border-2 border-[#00d4aa]/30 flex items-center justify-center">
          <ShieldCheck className="w-10 h-10 text-[#00d4aa]" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#00d4aa] flex items-center justify-center shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-white" />
        </div>
      </div>

      <div className="text-center">
        <h3 className="text-white text-lg font-bold">Cadastro Completo!</h3>
        <p className="text-[#8b949e] text-sm mt-1">{personName}</p>
      </div>

      <div className="w-full p-4 bg-[#0d1117] border border-white/8 rounded-2xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[#8b949e] text-sm">Qualidade</span>
          <span className={`text-xl font-bold ${enrollQuality >= 80 ? "text-[#00d4aa]" : "text-amber-400"}`}>
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
              <span key={id} className="flex items-center gap-1 px-2 py-1 bg-[#00d4aa]/10 border border-[#00d4aa]/20 text-[#00d4aa] rounded-full text-xs">
                <CheckCircle2 className="w-3 h-3" /> {s.label}
              </span>
            ) : null
          })}
        </div>
      </div>

      <div className="flex gap-3 w-full mt-auto">
        <button onClick={reset}
          className="flex-1 py-3 bg-white/5 border border-white/10 text-[#8b949e] rounded-xl text-sm hover:text-white transition-colors">
          Refazer
        </button>
        <button onClick={() => onCancel?.()}
          className="flex-1 py-3 bg-gradient-to-r from-[#00d4aa] to-[#0099cc] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all">
          Concluir
        </button>
      </div>
    </div>
  )

  // ═══════════════════════════════════════════════════════════════════════
  // PHASE: ERROR
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col items-center justify-center min-h-[350px] gap-5">
      <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-red-400" />
      </div>
      <div className="text-center">
        <h3 className="text-white font-bold mb-1">Erro ao salvar</h3>
        <p className="text-[#8b949e] text-sm">{errorMsg}</p>
      </div>
      <div className="flex gap-3">
        <button onClick={reset}
          className="px-5 py-3 bg-white/5 border border-white/10 text-white rounded-xl text-sm hover:bg-white/8 transition-colors">
          Tentar Novamente
        </button>
        {onCancel && (
          <button onClick={onCancel}
            className="px-5 py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm hover:bg-red-500/15 transition-colors">
            Cancelar
          </button>
        )}
      </div>
    </div>
  )
}
