'use client'

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'

export type FaceQuality = 'none' | 'poor' | 'good' | 'excellent'

interface Props {
  onFaceDetected?: (detected: boolean, quality: FaceQuality) => void
  active?: boolean
}

export interface FaceDetectionRef {
  capture: () => string | null
}

// SVG mask overlay — zero canvas compositing issues
// The oval hole is a pure SVG clipPath/mask, works on every browser/GPU
function OvalOverlay({ quality, box, videoW, videoH }: {
  quality: FaceQuality
  box: { xC: number; yC: number; bw: number; bh: number } | null
  videoW: number
  videoH: number
}) {
  const hasFace = box !== null && (quality === 'good' || quality === 'excellent')

  // Oval guide dimensions (relative to 100%)
  const ovalCX = 50
  const ovalCY = 43
  const ovalRX = 30
  const ovalRY = 38

  // Bounding box (mirrored X, in % of video dims)
  let bx = 0, by = 0, bw = 0, bh = 0
  if (box && videoW > 0 && videoH > 0) {
    const rawL = (box.xC - box.bw / 2)
    const rawT = (box.yC - box.bh / 2)
    bw = box.bw * 100
    bh = box.bh * 100
    bx = (1 - rawL - box.bw) * 100   // mirrored X
    by = rawT * 100
  }

  const color = quality === 'excellent' ? '#00d4aa' : quality === 'good' ? '#eab308' : '#ef4444'
  const cl = Math.min(bw, bh) * 0.22  // corner length

  return (
    <svg
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: 'none', overflow: 'visible' }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Mask: white everywhere except oval (black = show through) */}
        <mask id="oval-mask">
          <rect x="0" y="0" width="100" height="100" fill="white" />
          <ellipse cx={ovalCX} cy={ovalCY} rx={ovalRX} ry={ovalRY} fill="black" />
        </mask>
      </defs>

      {/* Dark overlay with oval hole via SVG mask */}
      {!hasFace && (
        <rect
          x="0" y="0" width="100" height="100"
          fill={quality === 'poor' ? 'rgba(0,0,0,0.62)' : 'rgba(0,0,0,0.56)'}
          mask="url(#oval-mask)"
        />
      )}

      {/* Oval border */}
      {!hasFace && (
        <ellipse
          cx={ovalCX} cy={ovalCY} rx={ovalRX} ry={ovalRY}
          fill="none"
          stroke={quality === 'poor' ? 'rgba(239,68,68,0.95)' : 'rgba(255,255,255,0.85)'}
          strokeWidth="0.5"
          strokeDasharray="3.5 2.5"
          vectorEffect="non-scaling-stroke"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="360 50 43"
            to="0 50 43"
            dur="8s"
            repeatCount="indefinite"
          />
        </ellipse>
      )}

      {/* Light overlay when face detected */}
      {hasFace && (
        <rect x="0" y="0" width="100" height="100" fill="rgba(0,0,0,0.18)" />
      )}

      {/* Bounding box */}
      {hasFace && box && (
        <g>
          {/* Main rectangle */}
          <rect
            x={bx} y={by} width={bw} height={bh}
            fill="none"
            stroke={color}
            strokeWidth="0.6"
            vectorEffect="non-scaling-stroke"
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
          {/* Top-left corner */}
          <path d={`M ${bx} ${by + cl} L ${bx} ${by} L ${bx + cl} ${by}`} fill="none" stroke={color} strokeWidth="1" vectorEffect="non-scaling-stroke" />
          {/* Top-right corner */}
          <path d={`M ${bx + bw - cl} ${by} L ${bx + bw} ${by} L ${bx + bw} ${by + cl}`} fill="none" stroke={color} strokeWidth="1" vectorEffect="non-scaling-stroke" />
          {/* Bottom-left corner */}
          <path d={`M ${bx} ${by + bh - cl} L ${bx} ${by + bh} L ${bx + cl} ${by + bh}`} fill="none" stroke={color} strokeWidth="1" vectorEffect="non-scaling-stroke" />
          {/* Bottom-right corner */}
          <path d={`M ${bx + bw - cl} ${by + bh} L ${bx + bw} ${by + bh} L ${bx + bw} ${by + bh - cl}`} fill="none" stroke={color} strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </g>
      )}

      {/* Instruction text (SVG text is never affected by CSS transforms) */}
      {!hasFace && (
        <g>
          <rect
            x="15" y="82" width="70" height="7"
            rx="1.5" ry="1.5"
            fill="rgba(0,0,0,0.72)"
          />
          <text
            x="50" y="87"
            textAnchor="middle"
            fill="white"
            fontSize="3.2"
            fontWeight="bold"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            {quality === 'poor' ? 'Centralize o rosto no oval' : 'Posicione seu rosto no oval'}
          </text>
        </g>
      )}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
const FaceDetectionCamera = forwardRef<FaceDetectionRef, Props>(({
  onFaceDetected,
  active = true,
}, ref) => {
  const videoRef   = useRef<HTMLVideoElement>(null)
  const captureRef = useRef<HTMLCanvasElement>(null)
  const streamRef  = useRef<MediaStream | null>(null)
  const detRef     = useRef<any>(null)
  const rafDetRef  = useRef<number>(0)
  const aliveRef   = useRef(true)

  const [phase,   setPhase]   = useState<'init' | 'ready' | 'error'>('init')
  const [errMsg,  setErrMsg]  = useState('')
  const [quality, setQuality] = useState<FaceQuality>('none')
  const [box, setBox] = useState<{ xC: number; yC: number; bw: number; bh: number } | null>(null)
  const [videoDims, setVideoDims] = useState({ w: 640, h: 480 })

  // ── Capture ──────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    capture(): string | null {
      const v = videoRef.current
      const c = captureRef.current
      if (!v || !c || v.readyState < 2) return null
      c.width  = v.videoWidth  || 640
      c.height = v.videoHeight || 480
      const ctx = c.getContext('2d')
      if (!ctx) return null
      ctx.drawImage(v, 0, 0)
      return c.toDataURL('image/jpeg', 0.92)
    }
  }))

  // ── Load MediaPipe ───────────────────────────────────────────────────
  useEffect(() => {
    aliveRef.current = true
    let gone = false
    ;(async () => {
      try {
        const fd  = await import('@mediapipe/face_detection')
        if (gone || !aliveRef.current) return
        const det = new fd.FaceDetection({
          locateFile: (f: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4.1646425229/${f}`
        })
        det.setOptions({ model: 'short', minDetectionConfidence: 0.4 })
        det.onResults((res: any) => {
          if (!aliveRef.current) return
          if (res.detections?.length > 0) {
            const b = res.detections[0].boundingBox
            if (b) {
              const area = b.width * b.height
              const dx   = Math.abs(b.xCenter - 0.5)
              const dy   = Math.abs(b.yCenter - 0.43)
              const q: FaceQuality =
                area > 0.09 && dx < 0.16 && dy < 0.16 ? 'excellent' :
                area > 0.04 && dx < 0.26 && dy < 0.26 ? 'good'      : 'poor'
              setBox({ xC: b.xCenter, yC: b.yCenter, bw: b.width, bh: b.height })
              setQuality(q)
              onFaceDetected?.(true, q)
            }
          } else {
            setBox(null)
            setQuality('none')
            onFaceDetected?.(false, 'none')
          }
        })
        detRef.current = det
      } catch {
        if (!gone && aliveRef.current) {
          setErrMsg('Nao foi possivel carregar o detector facial.')
          setPhase('error')
        }
      }
    })()
    return () => { gone = true }
  }, [])

  // ── Camera ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(rafDetRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
      setBox(null)
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

        const video     = videoRef.current!
        video.srcObject = stream
        video.setAttribute('playsinline', 'true')
        video.muted     = true
        video.play().catch(() => {})

        await new Promise<void>(res => {
          if (video.readyState >= 2) { res(); return }
          const fn = () => { video.removeEventListener('loadeddata', fn); res() }
          video.addEventListener('loadeddata', fn)
        })
        if (gone || !aliveRef.current) return

        setVideoDims({ w: video.videoWidth || 640, h: video.videoHeight || 480 })
        setPhase('ready')

        let busy = false
        const detLoop = async () => {
          if (gone || !aliveRef.current) return
          if (!busy && detRef.current && video.readyState >= 2) {
            busy = true
            try { await detRef.current.send({ image: video }) } catch {}
            busy = false
          }
          rafDetRef.current = requestAnimationFrame(detLoop)
        }
        rafDetRef.current = requestAnimationFrame(detLoop)

      } catch (e: any) {
        if (!gone && aliveRef.current) {
          setErrMsg(e.name === 'NotAllowedError'
            ? 'Permissao de camera negada. Autorize nas configuracoes do navegador.'
            : 'Nao foi possivel acessar a camera.')
          setPhase('error')
        }
      }
    })()

    return () => {
      gone = true
      cancelAnimationFrame(rafDetRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [active])

  useEffect(() => () => { aliveRef.current = false }, [])

  if (phase === 'error') return (
    <div className="w-full aspect-[4/3] bg-gym-darker rounded-2xl flex items-center justify-center border border-red-500/40">
      <div className="text-center px-6">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-red-300 text-sm font-medium">{errMsg}</p>
      </div>
    </div>
  )

  const badgeBg    = quality === 'excellent' ? 'bg-emerald-500'
                   : quality === 'good'      ? 'bg-amber-500'
                   : quality === 'poor'      ? 'bg-red-500'
                   :                           'bg-black/60 backdrop-blur-sm'
  const badgeLabel = quality === 'excellent' ? '✓ Rosto Pronto'
                   : quality === 'good'      ? 'Aproxime-se'
                   : quality === 'poor'      ? 'Centralize'
                   :                           'Posicione o rosto no oval'

  return (
    <div className="relative w-full aspect-[4/3] bg-black rounded-2xl overflow-hidden shadow-xl border border-gym-border select-none">

      {phase === 'init' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0d1117]">
          <Loader2 className="w-8 h-8 text-gym-accent animate-spin mb-3" />
          <p className="text-gym-text-secondary text-sm">Iniciando camera...</p>
        </div>
      )}

      {/* Video: CSS mirror for natural selfie view */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
        playsInline
        muted
      />

      {/* SVG overlay — completely independent of CSS transforms */}
      {phase === 'ready' && (
        <OvalOverlay
          quality={quality}
          box={box}
          videoW={videoDims.w}
          videoH={videoDims.h}
        />
      )}

      {/* Hidden photo capture canvas */}
      <canvas ref={captureRef} className="hidden" />

      {/* Quality badge */}
      {phase === 'ready' && (
        <div className={`absolute top-3 left-3 z-20 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-lg transition-all duration-200 ${badgeBg}`}>
          {badgeLabel}
        </div>
      )}
    </div>
  )
})

FaceDetectionCamera.displayName = 'FaceDetectionCamera'
export default FaceDetectionCamera
