'use client'

/**
 * FaceDetectionCamera v3 — Banking-Grade
 * Robust face detection with MediaPipe, heartbeat monitoring, and polished UI
 */

import {
  useRef, useEffect, useState, forwardRef,
  useImperativeHandle,
} from 'react'
import { AlertCircle, Loader2, Camera } from 'lucide-react'

export type FaceQuality = 'none' | 'poor' | 'good' | 'excellent'

export interface FaceDetectionRef {
  capture: () => string | null
}

interface Props {
  active?: boolean
  holdProgress?: number
  direction?: 'front' | 'left' | 'right' | 'up' | 'down' | null
  showSuccess?: boolean
  onFaceDetected?: (detected: boolean, quality: FaceQuality) => void
  onManualCapture?: () => void
}

/* ── Banking-style Oval Overlay ─────────────────────────────────────────── */
function OvalOverlay({
  quality, holdProgress, direction, showSuccess,
}: {
  quality: FaceQuality; holdProgress: number
  direction: Props['direction']; showSuccess: boolean
}) {
  const cx = 50, cy = 46, rx = 27, ry = 35
  const h = ((rx - ry) / (rx + ry)) ** 2
  const perimeter = Math.PI * (rx + ry) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)))
  const dashOffset = perimeter * (1 - holdProgress / 100)

  const ringColor =
    showSuccess          ? '#00d4aa' :
    holdProgress > 0     ? (quality === 'excellent' ? '#00d4aa' : '#eab308') :
    quality === 'poor'   ? '#ef4444' :
    quality === 'good'   ? '#eab308' :
    quality === 'excellent' ? '#00d4aa' : 'rgba(255,255,255,0.4)'

  const arrows: Record<string, string> = {
    front: '', left: '\u2190', right: '\u2192', up: '\u2191', down: '\u2193',
  }

  const hint =
    showSuccess        ? '\u2713 Capturado!' :
    quality === 'none' ? 'Posicione seu rosto no oval' :
    quality === 'poor' ? 'Aproxime-se e centralize' :
    holdProgress > 60  ? 'Quase la... mantenha firme' :
    holdProgress > 0   ? 'Mantenha a posicao...' :
    quality === 'good' ? 'Segure firme...' : 'Perfeito! Aguarde...'

  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet" style={{ pointerEvents: 'none' }}>
      <defs>
        <mask id="oval-mask">
          <rect width="100" height="100" fill="white" />
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="black" />
        </mask>
        <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00d4aa" />
          <stop offset="100%" stopColor="#0099cc" />
        </linearGradient>
        <filter id="ring-glow">
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {!showSuccess && (
        <rect width="100" height="100"
          fill={quality === 'none' ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.45)'}
          mask="url(#oval-mask)"
          style={{ transition: 'fill 0.5s ease' }} />
      )}

      {showSuccess && (
        <>
          <rect width="100" height="100" fill="rgba(0,212,170,0.15)" />
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="rgba(0,212,170,0.08)" />
        </>
      )}

      <ellipse cx={cx} cy={cy} rx={rx} ry={ry}
        fill="none"
        stroke={showSuccess ? '#00d4aa' : 'rgba(255,255,255,0.12)'}
        strokeWidth="0.7" vectorEffect="non-scaling-stroke" />

      {holdProgress > 0 && (
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry}
          fill="none"
          stroke={showSuccess ? '#00d4aa' : 'url(#ring-grad)'}
          strokeWidth="1.6" strokeLinecap="round"
          strokeDasharray={perimeter} strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${cx} ${cy})`}
          vectorEffect="non-scaling-stroke" filter="url(#ring-glow)"
          style={{ transition: 'stroke-dashoffset 0.08s linear' }} />
      )}

      {holdProgress === 0 && !showSuccess && (
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry}
          fill="none" stroke={ringColor} strokeWidth="0.6"
          strokeDasharray={quality === 'none' ? '2.5 2' : 'none'}
          vectorEffect="non-scaling-stroke"
          style={{ transition: 'stroke 0.3s ease' }}>
          {quality === 'none' && (
            <animateTransform attributeName="transform" type="rotate"
              from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`}
              dur="12s" repeatCount="indefinite" />
          )}
        </ellipse>
      )}

      {!showSuccess && quality !== 'none' && (
        <g stroke={ringColor} strokeWidth="0.5" fill="none" opacity="0.6"
          vectorEffect="non-scaling-stroke">
          <path d={`M${cx-rx+3},${cy-ry-2} L${cx-rx-2},${cy-ry-2} L${cx-rx-2},${cy-ry+3}`} />
          <path d={`M${cx+rx-3},${cy-ry-2} L${cx+rx+2},${cy-ry-2} L${cx+rx+2},${cy-ry+3}`} />
          <path d={`M${cx-rx-2},${cy+ry-3} L${cx-rx-2},${cy+ry+2} L${cx-rx+3},${cy+ry+2}`} />
          <path d={`M${cx+rx+2},${cy+ry-3} L${cx+rx+2},${cy+ry+2} L${cx+rx-3},${cy+ry+2}`} />
        </g>
      )}

      {direction && !showSuccess && arrows[direction] && (
        <text x={cx} y={cy+1.5} textAnchor="middle" dominantBaseline="middle"
          fill="rgba(255,255,255,0.85)" fontSize="10" fontWeight="bold"
          style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))' }}>
          {arrows[direction]}
        </text>
      )}

      {showSuccess && (
        <g>
          <circle cx={cx} cy={cy} r="6" fill="rgba(0,212,170,0.2)" />
          <text x={cx} y={cy+1.5} textAnchor="middle" dominantBaseline="middle"
            fill="#00d4aa" fontSize="8" fontWeight="bold">{'\u2713'}</text>
        </g>
      )}

      <rect x="10" y="85" width="80" height="8" rx="2.5" fill="rgba(0,0,0,0.75)" />
      <text x={cx} y="89.5" textAnchor="middle" dominantBaseline="middle"
        fill={showSuccess ? '#00d4aa' : 'white'}
        fontSize="3" fontWeight="600" fontFamily="system-ui,-apple-system,sans-serif">
        {hint}
      </text>

      {holdProgress > 0 && !showSuccess && (
        <>
          <rect x="74" y="4" width="18" height="8" rx="2" fill="rgba(0,0,0,0.6)" />
          <text x="83" y="8.5" textAnchor="middle" dominantBaseline="middle"
            fill="#00d4aa" fontSize="3.5" fontWeight="700" fontFamily="system-ui">
            {Math.round(holdProgress)}%
          </text>
        </>
      )}
    </svg>
  )
}

/* ── Main Component ────────────────────────────────────────────────────── */
const FaceDetectionCamera = forwardRef<FaceDetectionRef, Props>(({
  active = true, holdProgress = 0, direction = null,
  showSuccess = false, onFaceDetected, onManualCapture,
}, ref) => {
  const videoRef    = useRef<HTMLVideoElement>(null)
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const streamRef   = useRef<MediaStream | null>(null)
  const detectorRef = useRef<any>(null)
  const rafRef      = useRef<number>(0)
  const mountedRef  = useRef(true)
  const busyRef     = useRef(false)
  const cbRef       = useRef(onFaceDetected)
  cbRef.current     = onFaceDetected
  const lastDetRef  = useRef(Date.now())

  const [phase,   setPhase]   = useState<'loading' | 'ready' | 'error'>('loading')
  const [errMsg,  setErrMsg]  = useState('')
  const [quality, setQuality] = useState<FaceQuality>('none')

  useImperativeHandle(ref, () => ({
    capture(): string | null {
      const v = videoRef.current, c = canvasRef.current
      if (!v || !c || v.readyState < 2) return null
      c.width = v.videoWidth || 640; c.height = v.videoHeight || 480
      const ctx = c.getContext('2d'); if (!ctx) return null
      ctx.save(); ctx.translate(c.width, 0); ctx.scale(-1, 1)
      ctx.drawImage(v, 0, 0); ctx.restore()
      return c.toDataURL('image/jpeg', 0.9)
    }
  }))

  // Load MediaPipe (once)
  useEffect(() => {
    mountedRef.current = true
    let cancelled = false
    ;(async () => {
      try {
        const fd = await import('@mediapipe/face_detection')
        if (cancelled) return
        const det = new fd.FaceDetection({
          locateFile: (f: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4.1646425229/${f}`
        })
        det.setOptions({ model: 'short', minDetectionConfidence: 0.3 })
        det.onResults((r: any) => {
          if (!mountedRef.current) return
          lastDetRef.current = Date.now()
          if (r.detections?.length > 0) {
            const bb = r.detections[0].boundingBox
            if (bb) {
              const area = bb.width * bb.height
              const dx = Math.abs(bb.xCenter - 0.5)
              const dy = Math.abs(bb.yCenter - 0.46)
              const q: FaceQuality =
                area > 0.06 && dx < 0.18 && dy < 0.18 ? 'excellent' :
                area > 0.02 && dx < 0.30 && dy < 0.30 ? 'good' : 'poor'
              setQuality(q); cbRef.current?.(true, q)
            } else { setQuality('none'); cbRef.current?.(false, 'none') }
          } else { setQuality('none'); cbRef.current?.(false, 'none') }
        })
        if (!cancelled) detectorRef.current = det
      } catch {
        if (!cancelled && mountedRef.current) {
          setErrMsg('Erro ao carregar detector facial.')
          setPhase('error')
        }
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Camera + detection loop
  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
      setQuality('none'); setPhase('loading')
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
        await new Promise<void>(res => {
          if (video.readyState >= 2) return res()
          video.addEventListener('loadeddata', () => res(), { once: true })
        })
        if (gone || !mountedRef.current) return
        setPhase('ready')
        lastDetRef.current = Date.now()

        const loop = async () => {
          if (gone || !mountedRef.current) return
          if (!busyRef.current && detectorRef.current && video.readyState >= 2) {
            busyRef.current = true
            try { await detectorRef.current.send({ image: video }) } catch {}
            busyRef.current = false
          }
          // Heartbeat: reset busy if stuck for 8s
          if (Date.now() - lastDetRef.current > 8000 && detectorRef.current) {
            busyRef.current = false
            lastDetRef.current = Date.now()
          }
          rafRef.current = requestAnimationFrame(loop)
        }
        rafRef.current = requestAnimationFrame(loop)
      } catch (e: any) {
        if (!gone && mountedRef.current) {
          setErrMsg(e.name === 'NotAllowedError'
            ? 'Permissao de camera negada. Autorize nas configuracoes.'
            : 'Nao foi possivel acessar a camera.')
          setPhase('error')
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

  if (phase === 'error') return (
    <div className="w-full aspect-[3/4] bg-[#0d1117] rounded-3xl flex items-center justify-center border border-red-500/20">
      <div className="text-center px-6">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-red-300 text-sm">{errMsg}</p>
        <button onClick={() => window.location.reload()}
          className="mt-3 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg text-xs hover:bg-red-500/15 transition-colors">
          Recarregar
        </button>
      </div>
    </div>
  )

  return (
    <div className="relative w-full aspect-[3/4] bg-black rounded-3xl overflow-hidden select-none">
      {phase === 'loading' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0d1117]">
          <Loader2 className="w-8 h-8 text-[#00d4aa] animate-spin mb-3" />
          <p className="text-[#8b949e] text-sm">Iniciando camera...</p>
        </div>
      )}
      <video ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }} playsInline muted />
      {phase === 'ready' && (
        <OvalOverlay
          quality={showSuccess ? 'excellent' : quality}
          holdProgress={showSuccess ? 100 : holdProgress}
          direction={direction} showSuccess={showSuccess} />
      )}
      {phase === 'ready' && onManualCapture && !showSuccess && quality !== 'none' && (
        <button onClick={onManualCapture}
          className="absolute bottom-3 right-3 z-20 p-2.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white/70 hover:text-white hover:bg-white/20 transition-all"
          title="Captura manual">
          <Camera className="w-4 h-4" />
        </button>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
})

FaceDetectionCamera.displayName = 'FaceDetectionCamera'
export default FaceDetectionCamera
