"use client"

/**
 * FaceDetectionCamera v4 — Callback-based (NO REF needed)
 * 
 * The camera handles its own capture timing internally.
 * When quality is good for HOLD_MS, it auto-captures and calls onCaptured(imageUrl).
 * This eliminates the ref forwarding issue with Next.js dynamic().
 */

import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react"
import { AlertCircle, Loader2, Camera } from "lucide-react"

export type FaceQuality = "none" | "poor" | "good" | "excellent"

// Backward-compatible ref interface (used by ponto page)
export interface FaceDetectionRef {
  capture: () => string | null
}

interface Props {
  active?: boolean
  direction?: "front" | "left" | "right" | "up" | "down" | null
  holdDuration?: number       // ms to hold for auto-capture (default 1500, 0 = disabled)
  holdProgress?: number       // external progress (backward compat, ignored if holdDuration > 0)
  showSuccess?: boolean       // external success flash (backward compat)
  onCaptured?: (imageDataUrl: string) => void   // NEW: callback when auto-capture completes
  onFaceDetected?: (detected: boolean, quality: FaceQuality) => void  // backward compat
  onQualityChange?: (quality: FaceQuality, progress: number) => void
  onManualCapture?: () => void  // backward compat
}

const TOLERANCE_MS = 500

const FaceDetectionCamera = forwardRef<FaceDetectionRef, Props>(({
  active = true,
  direction = null,
  holdDuration = 1500,
  holdProgress: _extProgress,
  showSuccess: _extSuccess,
  onCaptured,
  onFaceDetected: onFaceDetectedLegacy,
  onQualityChange,
  onManualCapture: onManualCaptureLegacy,
}, ref) => {
  const videoRef    = useRef<HTMLVideoElement>(null)
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const streamRef   = useRef<MediaStream | null>(null)
  const detectorRef = useRef<any>(null)
  const rafRef      = useRef<number>(0)
  const mountedRef  = useRef(true)
  const busyRef     = useRef(false)

  // Capture timing refs
  const firstGoodRef  = useRef(0)
  const lastGoodRef   = useRef(0)
  const capturedRef   = useRef(false)  // prevent double capture

  // Callback refs (avoid stale closures)
  const onCapturedRef     = useRef(onCaptured)
  const onQualityRef      = useRef(onQualityChange)
  const onFaceDetectedRef = useRef(onFaceDetectedLegacy)
  onCapturedRef.current   = onCaptured
  onQualityRef.current    = onQualityChange
  onFaceDetectedRef.current = onFaceDetectedLegacy

  // Backward-compatible ref for manual capture (used by ponto page)
  useImperativeHandle(ref, () => ({
    capture(): string | null {
      const v = videoRef.current, c = canvasRef.current
      if (!v || !c || v.readyState < 2) return null
      c.width = v.videoWidth || 640; c.height = v.videoHeight || 480
      const ctx = c.getContext("2d"); if (!ctx) return null
      ctx.save(); ctx.translate(c.width, 0); ctx.scale(-1, 1)
      ctx.drawImage(v, 0, 0); ctx.restore()
      return c.toDataURL("image/jpeg", 0.9)
    }
  }))

  const [phase,   setPhase]   = useState<"loading" | "ready" | "error">("loading")
  const [errMsg,  setErrMsg]  = useState("")
  const [quality, setQuality] = useState<FaceQuality>("none")
  const [progress, setProgress] = useState(0)
  const [showFlash, setShowFlash] = useState(false)

  const lastDetRef = useRef(Date.now())

  // ── Internal capture function ───────────────────────────────────────
  const doCapture = useCallback(() => {
    if (capturedRef.current) return
    const v = videoRef.current, c = canvasRef.current
    if (!v || !c || v.readyState < 2) return

    capturedRef.current = true
    c.width = v.videoWidth || 640
    c.height = v.videoHeight || 480
    const ctx = c.getContext("2d")
    if (!ctx) { capturedRef.current = false; return }

    // Capture mirrored
    ctx.save()
    ctx.translate(c.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(v, 0, 0)
    ctx.restore()

    const imageUrl = c.toDataURL("image/jpeg", 0.9)

    // Flash effect
    setShowFlash(true)
    setProgress(100)

    setTimeout(() => {
      setShowFlash(false)
      onCapturedRef.current?.(imageUrl)
      // Reset for potential next use (if component stays mounted)
      setTimeout(() => {
        capturedRef.current = false
        firstGoodRef.current = 0
        lastGoodRef.current = 0
        setProgress(0)
      }, 200)
    }, 600)
  }, [])

  // ── Manual capture ──────────────────────────────────────────────────
  const handleManual = useCallback(() => {
    if (capturedRef.current || quality === "none") return
    doCapture()
  }, [doCapture, quality])

  // ── Load MediaPipe ──────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true
    let cancelled = false
    ;(async () => {
      try {
        const fd = await import("@mediapipe/face_detection")
        if (cancelled) return
        const det = new fd.FaceDetection({
          locateFile: (f: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4.1646425229/${f}`
        })
        det.setOptions({ model: "short", minDetectionConfidence: 0.3 })
        det.onResults((r: any) => {
          if (!mountedRef.current || capturedRef.current) return
          lastDetRef.current = Date.now()

          let q: FaceQuality = "none"
          if (r.detections?.length > 0) {
            const bb = r.detections[0].boundingBox
            if (bb) {
              const area = bb.width * bb.height
              const dx = Math.abs(bb.xCenter - 0.5)
              const dy = Math.abs(bb.yCenter - 0.46)
              q = area > 0.06 && dx < 0.18 && dy < 0.18 ? "excellent" :
                  area > 0.02 && dx < 0.30 && dy < 0.30 ? "good" : "poor"
            }
          }
          setQuality(q)

          // Legacy callback (for ponto page)
          const detected = q !== "none"
          onFaceDetectedRef.current?.(detected, q)

          // ── Hold timer logic (only when onCaptured is provided) ────
          if (!onCapturedRef.current) return  // no auto-capture needed

          const now = Date.now()
          const isGood = q === "good" || q === "excellent"

          if (isGood) {
            if (firstGoodRef.current === 0) firstGoodRef.current = now
            lastGoodRef.current = now
            const elapsed = now - firstGoodRef.current
            const pct = Math.min(99, (elapsed / holdDuration) * 100)
            setProgress(pct)
            onQualityRef.current?.(q, pct)

            if (elapsed >= holdDuration) {
              doCapture()
            }
          } else {
            if (lastGoodRef.current > 0 && now - lastGoodRef.current > TOLERANCE_MS) {
              firstGoodRef.current = 0
              lastGoodRef.current = 0
              setProgress(0)
              onQualityRef.current?.(q, 0)
            }
          }
        })
        if (!cancelled) detectorRef.current = det
      } catch {
        if (!cancelled && mountedRef.current) {
          setErrMsg("Erro ao carregar detector facial.")
          setPhase("error")
        }
      }
    })()
    return () => { cancelled = true }
  }, [doCapture, holdDuration])

  // ── Camera stream + detection loop ──────────────────────────────────
  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
      setQuality("none"); setPhase("loading"); setProgress(0)
      capturedRef.current = false
      firstGoodRef.current = 0; lastGoodRef.current = 0
      return
    }
    let gone = false
    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        })
        if (gone) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        const video = videoRef.current!
        video.srcObject = stream
        video.setAttribute("playsinline", "true")
        video.muted = true
        await video.play().catch(() => {})
        await new Promise<void>(res => {
          if (video.readyState >= 2) return res()
          video.addEventListener("loadeddata", () => res(), { once: true })
        })
        if (gone || !mountedRef.current) return
        setPhase("ready")
        lastDetRef.current = Date.now()

        const loop = async () => {
          if (gone || !mountedRef.current) return
          if (!busyRef.current && detectorRef.current && video.readyState >= 2 && !capturedRef.current) {
            busyRef.current = true
            try { await detectorRef.current.send({ image: video }) } catch {}
            busyRef.current = false
          }
          if (Date.now() - lastDetRef.current > 8000 && detectorRef.current) {
            busyRef.current = false
            lastDetRef.current = Date.now()
          }
          rafRef.current = requestAnimationFrame(loop)
        }
        rafRef.current = requestAnimationFrame(loop)
      } catch (e: any) {
        if (!gone && mountedRef.current) {
          setErrMsg(e.name === "NotAllowedError"
            ? "Permissao de camera negada."
            : "Nao foi possivel acessar a camera.")
          setPhase("error")
        }
      }
    })()
    return () => {
      gone = true; cancelAnimationFrame(rafRef.current); busyRef.current = false
      streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null
    }
  }, [active])

  useEffect(() => () => {
    mountedRef.current = false; cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  // ── SVG Overlay ─────────────────────────────────────────────────────
  const cx = 50, cy = 46, rx = 27, ry = 35
  const h2 = ((rx - ry) / (rx + ry)) ** 2
  const perim = Math.PI * (rx + ry) * (1 + (3 * h2) / (10 + Math.sqrt(4 - 3 * h2)))
  const dashOff = perim * (1 - progress / 100)

  const ringColor = showFlash ? "#00d4aa" :
    progress > 0 ? "#00d4aa" :
    quality === "poor" ? "#ef4444" :
    quality === "good" || quality === "excellent" ? "#eab308" :
    "rgba(255,255,255,0.3)"

  const arrows: Record<string, string> = {
    front: "", left: "\u2190", right: "\u2192", up: "\u2191", down: "\u2193",
  }

  const hint = showFlash ? "" :
    quality === "none" ? "Posicione seu rosto" :
    quality === "poor" ? "Aproxime e centralize" :
    progress > 70 ? "Quase la..." :
    progress > 0 ? "Mantenha firme..." : "Segure a posicao..."

  // ── Render ──────────────────────────────────────────────────────────
  if (phase === "error") return (
    <div className="w-full h-full bg-[#0d1117] rounded-3xl flex items-center justify-center">
      <div className="text-center px-6">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-red-300 text-sm">{errMsg}</p>
      </div>
    </div>
  )

  return (
    <div className="relative w-full h-full bg-black rounded-3xl overflow-hidden select-none">
      {phase === "loading" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0d1117]">
          <Loader2 className="w-8 h-8 text-[#00d4aa] animate-spin mb-3" />
          <p className="text-[#8b949e] text-sm">Iniciando camera...</p>
        </div>
      )}

      <video ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: "scaleX(-1)" }} playsInline muted />

      {phase === "ready" && (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet" style={{ pointerEvents: "none" }}>
          <defs>
            <mask id="om">
              <rect width="100" height="100" fill="white" />
              <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="black" />
            </mask>
            <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00d4aa" />
              <stop offset="100%" stopColor="#0099cc" />
            </linearGradient>
            <filter id="gl">
              <feGaussianBlur stdDeviation="1" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {!showFlash && (
            <rect width="100" height="100"
              fill={quality === "none" ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.45)"}
              mask="url(#om)" style={{ transition: "fill 0.5s" }} />
          )}
          {showFlash && <rect width="100" height="100" fill="rgba(0,212,170,0.2)" />}

          <ellipse cx={cx} cy={cy} rx={rx} ry={ry}
            fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.7"
            vectorEffect="non-scaling-stroke" />

          {progress > 0 && (
            <ellipse cx={cx} cy={cy} rx={rx} ry={ry}
              fill="none" stroke="url(#rg)" strokeWidth="1.8"
              strokeLinecap="round" strokeDasharray={perim} strokeDashoffset={dashOff}
              transform={`rotate(-90 ${cx} ${cy})`}
              vectorEffect="non-scaling-stroke" filter="url(#gl)"
              style={{ transition: "stroke-dashoffset 0.08s linear" }} />
          )}

          {progress === 0 && !showFlash && quality !== "none" && (
            <g stroke={ringColor} strokeWidth="0.5" fill="none" opacity="0.5"
              vectorEffect="non-scaling-stroke">
              <path d={`M${cx-rx+3},${cy-ry-2} L${cx-rx-2},${cy-ry-2} L${cx-rx-2},${cy-ry+3}`} />
              <path d={`M${cx+rx-3},${cy-ry-2} L${cx+rx+2},${cy-ry-2} L${cx+rx+2},${cy-ry+3}`} />
              <path d={`M${cx-rx-2},${cy+ry-3} L${cx-rx-2},${cy+ry+2} L${cx-rx+3},${cy+ry+2}`} />
              <path d={`M${cx+rx+2},${cy+ry-3} L${cx+rx+2},${cy+ry+2} L${cx+rx-3},${cy+ry+2}`} />
            </g>
          )}

          {direction && !showFlash && arrows[direction] && (
            <text x={cx} y={cy+1.5} textAnchor="middle" dominantBaseline="middle"
              fill="rgba(255,255,255,0.8)" fontSize="10" fontWeight="bold">
              {arrows[direction]}
            </text>
          )}

          {showFlash && (
            <text x={cx} y={cy+1.5} textAnchor="middle" dominantBaseline="middle"
              fill="#00d4aa" fontSize="10">{"\u2713"}</text>
          )}

          {hint && !showFlash && (
            <>
              <rect x="15" y="86" width="70" height="7" rx="2" fill="rgba(0,0,0,0.7)" />
              <text x={cx} y="90" textAnchor="middle" dominantBaseline="middle"
                fill="white" fontSize="3" fontWeight="600"
                fontFamily="system-ui,-apple-system,sans-serif">{hint}</text>
            </>
          )}

          {progress > 0 && !showFlash && (
            <>
              <rect x="76" y="4" width="16" height="7" rx="2" fill="rgba(0,0,0,0.6)" />
              <text x="84" y="8" textAnchor="middle" dominantBaseline="middle"
                fill="#00d4aa" fontSize="3.5" fontWeight="700">{Math.round(progress)}%</text>
            </>
          )}
        </svg>
      )}

      {phase === "ready" && !showFlash && !capturedRef.current && quality !== "none" && (
        <button onClick={() => { onManualCaptureLegacy ? onManualCaptureLegacy() : handleManual() }}
          className="absolute bottom-3 right-3 z-20 p-2.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white/70 hover:text-white hover:bg-white/20 transition-all"
          title="Captura manual">
          <Camera className="w-4 h-4" />
        </button>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
})

FaceDetectionCamera.displayName = "FaceDetectionCamera"
export default FaceDetectionCamera
