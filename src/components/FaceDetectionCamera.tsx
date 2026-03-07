'use client'

import { useRef, useEffect, useState, forwardRef, useImperativeHandle, useCallback } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'

export type FaceQuality = 'none' | 'poor' | 'good' | 'excellent'

export interface FaceDetectionRef {
  capture: () => string | null
}

interface Props {
  active?: boolean
  holdProgress?: number        // 0-100, anima o anel ao redor do oval
  direction?: 'front' | 'left' | 'right' | 'up' | 'down' | null
  showSuccess?: boolean        // overlay verde de captura realizada
  onFaceDetected?: (detected: boolean, quality: FaceQuality) => void
}

// ── Oval com anel de progresso ────────────────────────────────────────────────
function OvalProgressOverlay({
  quality,
  holdProgress,
  direction,
  showSuccess,
}: {
  quality: FaceQuality
  holdProgress: number
  direction: Props['direction']
  showSuccess: boolean
}) {
  const cx = 50; const cy = 46
  const rx = 26; const ry = 34

  // Perímetro da elipse (aproximação de Ramanujan)
  const h = ((rx - ry) / (rx + ry)) ** 2
  const perimeter = Math.PI * (rx + ry) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)))

  const dashOffset = perimeter * (1 - holdProgress / 100)
  const trackColor = 'rgba(255,255,255,0.15)'
  const progressColor = showSuccess ? '#00d4aa'
    : quality === 'excellent' ? '#00d4aa'
    : quality === 'good' ? '#eab308'
    : 'rgba(255,255,255,0.35)'

  const arrowMap: Record<string, string> = {
    front: '', left: '←', right: '→', up: '↑', down: '↓',
  }
  const arrow = direction ? arrowMap[direction] : ''

  const instruction =
    showSuccess ? '' :
    quality === 'none' ? 'Posicione o rosto no oval' :
    quality === 'poor' ? 'Centralize e aproxime-se' :
    quality === 'good' ? 'Mantenha firme...' :
    'Perfeito! Mantendo...'

  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      style={{ pointerEvents: 'none' }}
    >
      <defs>
        <mask id="fdc-mask">
          <rect width="100" height="100" fill="white" />
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="black" />
        </mask>
        <filter id="glow">
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Overlay escuro com buraco */}
      {!showSuccess && (
        <rect width="100" height="100"
          fill={quality === 'none' ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.5)'}
          mask="url(#fdc-mask)"
        />
      )}

      {/* Sucesso: flash verde */}
      {showSuccess && (
        <rect width="100" height="100" fill="rgba(0,212,170,0.2)" />
      )}

      {/* Trilha do anel (fundo) */}
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry}
        fill="none" stroke={trackColor} strokeWidth="0.8"
        vectorEffect="non-scaling-stroke"
      />

      {/* Anel de progresso */}
      {holdProgress > 0 && (
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry}
          fill="none"
          stroke={progressColor}
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeDasharray={`${perimeter}`}
          strokeDashoffset={`${dashOffset}`}
          transform={`rotate(-90 ${cx} ${cy})`}
          vectorEffect="non-scaling-stroke"
          filter="url(#glow)"
          style={{ transition: 'stroke-dashoffset 0.04s linear, stroke 0.3s ease' }}
        />
      )}

      {/* Anel estático quando sem progresso */}
      {holdProgress === 0 && !showSuccess && (
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry}
          fill="none"
          stroke={quality === 'poor' ? 'rgba(239,68,68,0.7)' : 'rgba(255,255,255,0.5)'}
          strokeWidth="0.6"
          strokeDasharray={quality === 'none' ? '3 2' : 'none'}
          vectorEffect="non-scaling-stroke"
        >
          {quality === 'none' && (
            <animateTransform attributeName="transform" type="rotate"
              from={`360 ${cx} ${cy}`} to={`0 ${cx} ${cy}`} dur="10s" repeatCount="indefinite"
            />
          )}
        </ellipse>
      )}

      {/* Seta de direção */}
      {arrow && !showSuccess && (
        <text x={cx} y={cy + 2} textAnchor="middle" dominantBaseline="middle"
          fill="rgba(255,255,255,0.9)" fontSize="9" fontWeight="bold">
          {arrow}
        </text>
      )}

      {/* Check de sucesso */}
      {showSuccess && (
        <text x={cx} y={cy + 2} textAnchor="middle" dominantBaseline="middle"
          fill="#00d4aa" fontSize="12">✓</text>
      )}

      {/* Instrução na base */}
      {instruction && (
        <>
          <rect x="15" y="84" width="70" height="7.5" rx="2" fill="rgba(0,0,0,0.7)" />
          <text x={cx} y="88.5" textAnchor="middle" dominantBaseline="middle"
            fill="white" fontSize="3.2" fontWeight="600"
            fontFamily="system-ui,-apple-system,sans-serif">
            {instruction}
          </text>
        </>
      )}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
const FaceDetectionCamera = forwardRef<FaceDetectionRef, Props>(({
  active = true,
  holdProgress = 0,
  direction = null,
  showSuccess = false,
  onFaceDetected,
}, ref) => {
  const videoRef    = useRef<HTMLVideoElement>(null)
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const streamRef   = useRef<MediaStream | null>(null)
  const detRef      = useRef<any>(null)
  const rafRef      = useRef<number>(0)
  const aliveRef    = useRef(true)
  const cbRef       = useRef(onFaceDetected)
  cbRef.current = onFaceDetected

  const [phase,   setPhase]   = useState<'init' | 'ready' | 'error'>('init')
  const [errMsg,  setErrMsg]  = useState('')
  const [quality, setQuality] = useState<FaceQuality>('none')

  useImperativeHandle(ref, () => ({
    capture(): string | null {
      const v = videoRef.current; const c = canvasRef.current
      if (!v || !c || v.readyState < 2) return null
      c.width = v.videoWidth || 640; c.height = v.videoHeight || 480
      const ctx = c.getContext('2d'); if (!ctx) return null
      // Captura espelhada (para ficar natural)
      ctx.save()
      ctx.translate(c.width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(v, 0, 0)
      ctx.restore()
      return c.toDataURL('image/jpeg', 0.9)
    }
  }))

  // Carregar MediaPipe
  useEffect(() => {
    aliveRef.current = true
    let done = false
    ;(async () => {
      try {
        const fd = await import('@mediapipe/face_detection')
        if (done || !aliveRef.current) return
        const det = new fd.FaceDetection({
          locateFile: (f: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4.1646425229/${f}`
        })
        det.setOptions({ model: 'short', minDetectionConfidence: 0.35 })
        det.onResults((res: any) => {
          if (!aliveRef.current) return
          if (res.detections?.length > 0) {
            const b = res.detections[0].boundingBox
            if (b) {
              const area = b.width * b.height
              const dx = Math.abs(b.xCenter - 0.5)
              const dy = Math.abs(b.yCenter - 0.46)
              const q: FaceQuality =
                area > 0.06 && dx < 0.18 && dy < 0.18 ? 'excellent' :
                area > 0.02 && dx < 0.32 && dy < 0.32 ? 'good' : 'poor'
              setQuality(q)
              cbRef.current?.(true, q)
            }
          } else {
            setQuality('none')
            cbRef.current?.(false, 'none')
          }
        })
        detRef.current = det
      } catch {
        if (!done && aliveRef.current) {
          setErrMsg('Não foi possível carregar o detector facial.')
          setPhase('error')
        }
      }
    })()
    return () => { done = true }
  }, [])

  // Câmera
  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
      setQuality('none')
      setPhase('init')
      return
    }
    let gone = false
    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        })
        if (gone) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        const video = videoRef.current!
        video.srcObject = stream
        video.setAttribute('playsinline', 'true')
        video.muted = true
        await video.play().catch(() => {})
        await new Promise<void>(resolve => {
          if (video.readyState >= 2) return resolve()
          video.addEventListener('loadeddata', () => resolve(), { once: true })
        })
        if (gone || !aliveRef.current) return
        setPhase('ready')

        let busy = false
        const loop = async () => {
          if (gone || !aliveRef.current) return
          if (!busy && detRef.current && video.readyState >= 2) {
            busy = true
            try { await detRef.current.send({ image: video }) } catch {}
            busy = false
          }
          rafRef.current = requestAnimationFrame(loop)
        }
        rafRef.current = requestAnimationFrame(loop)
      } catch (e: any) {
        if (!gone && aliveRef.current) {
          setErrMsg(
            e.name === 'NotAllowedError'
              ? 'Permissão de câmera negada. Autorize nas configurações do navegador.'
              : 'Não foi possível acessar a câmera.'
          )
          setPhase('error')
        }
      }
    })()
    return () => {
      gone = true
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [active])

  useEffect(() => () => { aliveRef.current = false }, [])

  if (phase === 'error') return (
    <div className="w-full aspect-[3/4] bg-[#0d1117] rounded-3xl flex items-center justify-center border border-red-500/30">
      <div className="text-center px-6">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-red-300 text-sm font-medium">{errMsg}</p>
      </div>
    </div>
  )

  return (
    <div className="relative w-full aspect-[3/4] bg-black rounded-3xl overflow-hidden select-none">
      {phase === 'init' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0d1117]">
          <Loader2 className="w-8 h-8 text-[#00d4aa] animate-spin mb-3" />
          <p className="text-[#8b949e] text-sm">Iniciando câmera...</p>
        </div>
      )}

      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
        playsInline muted
      />

      {phase === 'ready' && (
        <OvalProgressOverlay
          quality={showSuccess ? 'excellent' : quality}
          holdProgress={showSuccess ? 100 : holdProgress}
          direction={direction}
          showSuccess={showSuccess}
        />
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
})

FaceDetectionCamera.displayName = 'FaceDetectionCamera'
export default FaceDetectionCamera
