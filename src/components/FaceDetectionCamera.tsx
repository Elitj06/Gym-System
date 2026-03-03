'use client'

import { useRef, useEffect, useState, forwardRef, useImperativeHandle, useCallback } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'

export type FaceQuality = 'none' | 'poor' | 'good' | 'excellent'

interface Props {
  onFaceDetected?: (detected: boolean, quality: FaceQuality) => void
  active?: boolean
  mirror?: boolean
}

export interface FaceDetectionRef {
  capture: () => string | null
}

// ─────────────────────────────────────────────────────────────
// Pure canvas drawing — NO transform CSS on canvas ever
// The video is mirrored via CSS; the canvas is NEVER transformed.
// Text is drawn with explicit save/restore + un-mirror trick.
// ─────────────────────────────────────────────────────────────
function drawFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  box: { x: number; y: number; bw: number; bh: number } | null,
  quality: FaceQuality,
  mirror: boolean,
) {
  ctx.clearRect(0, 0, w, h)

  // ── Oval guide (always drawn) ──────────────────────────────
  const ovalCX = w * 0.5
  const ovalCY = h * 0.44
  const ovalRX = w * 0.30
  const ovalRY = h * 0.38

  if (!box || quality === 'none' || quality === 'poor') {
    // Dark vignette except inside oval
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.50)'
    ctx.fillRect(0, 0, w, h)
    // Cut oval hole
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.ellipse(ovalCX, ovalCY, ovalRX, ovalRY, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
    ctx.restore()

    // Animated dashed oval border
    const t = Date.now() / 800
    const dashLen = 14
    const gapLen = 9
    ctx.save()
    ctx.strokeStyle = quality === 'poor' ? 'rgba(239,68,68,0.9)' : 'rgba(255,255,255,0.55)'
    ctx.lineWidth = 2.5
    ctx.setLineDash([dashLen, gapLen])
    ctx.lineDashOffset = -t * 20
    ctx.beginPath()
    ctx.ellipse(ovalCX, ovalCY, ovalRX, ovalRY, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()

    // Corner tick marks on oval
    const ticks = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]
    ticks.forEach((angle) => {
      const cos = Math.cos(angle), sin = Math.sin(angle)
      const px = ovalCX + ovalRX * cos
      const py = ovalCY + ovalRY * sin
      ctx.beginPath()
      ctx.moveTo(px - cos * 10, py - sin * 10)
      ctx.lineTo(px + cos * 10, py + sin * 10)
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.lineWidth = 3
      ctx.setLineDash([])
      ctx.stroke()
    })

    // Guide arrow/text at bottom — unmirrored
    ctx.save()
    if (mirror) {
      ctx.translate(w, 0)
      ctx.scale(-1, 1)
    }
    const msg = quality === 'poor' ? 'Centralize o rosto no oval' : 'Posicione seu rosto no oval'
    ctx.font = '600 13px -apple-system, sans-serif'
    const tw = ctx.measureText(msg).width
    const tx = (w - tw) / 2
    const ty = h * 0.88
    ctx.fillStyle = 'rgba(0,0,0,0.65)'
    ctx.beginPath()
    ctx.roundRect(tx - 10, ty - 18, tw + 20, 28, 8)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.fillText(msg, tx, ty)
    ctx.restore()
    return
  }

  // ── Face detected — show bounding box ─────────────────────
  const color =
    quality === 'excellent' ? '#00d4aa' :
    quality === 'good'      ? '#eab308' : '#ef4444'

  // Subtle overlay
  ctx.fillStyle = 'rgba(0,0,0,0.12)'
  ctx.fillRect(0, 0, w, h)

  // Glow
  ctx.shadowColor = color
  ctx.shadowBlur = 12

  // Rect
  ctx.strokeStyle = color
  ctx.lineWidth = 2.5
  ctx.setLineDash([])
  ctx.strokeRect(box.x, box.y, box.bw, box.bh)
  ctx.shadowBlur = 0

  // Corner accents
  const cl = Math.min(box.bw, box.bh) * 0.20
  ctx.lineWidth = 4
  ctx.strokeStyle = color
  const corners = [
    [box.x, box.y, box.x + cl, box.y, box.x, box.y + cl],
    [box.x + box.bw - cl, box.y, box.x + box.bw, box.y, box.x + box.bw, box.y + cl],
    [box.x, box.y + box.bh - cl, box.x, box.y + box.bh, box.x + cl, box.y + box.bh],
    [box.x + box.bw - cl, box.y + box.bh, box.x + box.bw, box.y + box.bh, box.x + box.bw, box.y + box.bh - cl],
  ]
  corners.forEach(([x1, y1, mx, my, x2, y2]) => {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(mx, my); ctx.lineTo(x2, y2); ctx.stroke()
  })

  // Label (un-mirrored)
  ctx.save()
  if (mirror) {
    ctx.translate(w, 0)
    ctx.scale(-1, 1)
    // flip box x for label placement
  }
  const label = quality === 'excellent' ? '✓ Rosto Pronto' : quality === 'good' ? 'Aproxime-se' : 'Centralize'
  ctx.font = 'bold 13px -apple-system, sans-serif'
  // position label above box — but in un-mirrored space
  // when mirrored: box.x in canvas-space = w - box.x - box.bw in display-space
  const labelX = mirror ? (w - box.x - box.bw) : box.x
  const lw = ctx.measureText(label).width
  const lx = Math.max(4, Math.min(labelX, w - lw - 16))
  const ly = mirror
    ? (w - box.x - box.bw > box.bw ? box.y - 10 : box.y - 10)
    : box.y - 10
  ctx.fillStyle = 'rgba(0,0,0,0.7)'
  ctx.beginPath()
  ctx.roundRect(lx - 6, ly - 17, lw + 12, 24, 6)
  ctx.fill()
  ctx.fillStyle = color
  ctx.fillText(label, lx, ly)
  ctx.restore()
}

// ─────────────────────────────────────────────────────────────
const FaceDetectionCamera = forwardRef<FaceDetectionRef, Props>(({
  onFaceDetected,
  active = true,
  mirror = true,
}, ref) => {
  const videoRef    = useRef<HTMLVideoElement>(null)
  const canvasRef   = useRef<HTMLCanvasElement>(null)   // hidden — capture only
  const overlayRef  = useRef<HTMLCanvasElement>(null)   // visible — drawing only
  const streamRef   = useRef<MediaStream | null>(null)
  const detectorRef = useRef<any>(null)
  const rafRef      = useRef<number>(0)
  const animRef     = useRef<number>(0)
  const aliveRef    = useRef(true)
  const qualityRef  = useRef<FaceQuality>('none')
  const boxRef      = useRef<{ x: number; y: number; bw: number; bh: number } | null>(null)

  const [phase, setPhase]     = useState<'init' | 'ready' | 'error'>('init')
  const [errMsg, setErrMsg]   = useState('')
  const [quality, setQuality] = useState<FaceQuality>('none')

  // ── expose capture() ──────────────────────────────────────
  useImperativeHandle(ref, () => ({
    capture(): string | null {
      const v = videoRef.current
      const c = canvasRef.current
      if (!v || !c || v.readyState < 2) return null
      c.width  = v.videoWidth  || 640
      c.height = v.videoHeight || 480
      const ctx = c.getContext('2d')
      if (!ctx) return null
      // Capture without mirror so the stored image is correct
      ctx.drawImage(v, 0, 0, c.width, c.height)
      return c.toDataURL('image/jpeg', 0.92)
    }
  }))

  // ── Continuous redraw loop (runs independently of detection) ─
  const startRedraw = useCallback(() => {
    const overlay = overlayRef.current
    const video   = videoRef.current
    if (!overlay || !video) return
    const loop = () => {
      if (!aliveRef.current) return
      const w = video.videoWidth  || overlay.width  || 640
      const h = video.videoHeight || overlay.height || 480
      if (overlay.width !== w || overlay.height !== h) {
        overlay.width  = w
        overlay.height = h
      }
      const ctx = overlay.getContext('2d')
      if (ctx) drawFrame(ctx, w, h, boxRef.current, qualityRef.current, mirror)
      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)
  }, [mirror])

  // ── Load MediaPipe detector once ──────────────────────────
  useEffect(() => {
    aliveRef.current = true
    let cancelled = false;
    (async () => {
      try {
        const fd = await import('@mediapipe/face_detection')
        if (cancelled || !aliveRef.current) return
        const detector = new fd.FaceDetection({
          locateFile: (f: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4.1646425229/${f}`
        })
        detector.setOptions({ model: 'short', minDetectionConfidence: 0.45 })
        detector.onResults((results: any) => {
          if (!aliveRef.current) return
          const video = videoRef.current
          if (!video) return
          const w = video.videoWidth || 640
          const h = video.videoHeight || 480

          if (results.detections?.length > 0) {
            const det = results.detections[0]
            const b   = det.boundingBox
            if (b) {
              // MediaPipe gives normalized coords in MIRRORED space when input is mirrored
              // Since video is mirrored via CSS, the raw coords match canvas coords directly
              const bx = b.xCenter * w - (b.width  * w) / 2
              const by = b.yCenter * h - (b.height * h) / 2
              const bw = b.width  * w
              const bh = b.height * h

              const area = b.width * b.height
              const dx   = Math.abs(b.xCenter - 0.5)
              const dy   = Math.abs(b.yCenter - 0.44)

              let q: FaceQuality =
                area > 0.10 && dx < 0.16 && dy < 0.16 ? 'excellent' :
                area > 0.05 && dx < 0.26 && dy < 0.26 ? 'good' : 'poor'

              boxRef.current     = { x: bx, y: by, bw, bh }
              qualityRef.current = q
              setQuality(q)
              onFaceDetected?.(true, q)
            }
          } else {
            boxRef.current     = null
            qualityRef.current = 'none'
            setQuality('none')
            onFaceDetected?.(false, 'none')
          }
        })
        detectorRef.current = detector
      } catch {
        if (!cancelled && aliveRef.current) {
          setErrMsg('Não foi possível carregar o detector facial.')
          setPhase('error')
        }
      }
    })()
    return () => { cancelled = true }
  }, [])

  // ── Camera lifecycle ───────────────────────────────────────
  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(rafRef.current)
      cancelAnimationFrame(animRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
      boxRef.current     = null
      qualityRef.current = 'none'
      setQuality('none')
      setPhase('init')
      return
    }

    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream

        const video = videoRef.current!
        video.srcObject = stream
        video.setAttribute('playsinline', 'true')
        video.muted = true

        await new Promise<void>(res => {
          const onReady = () => { video.removeEventListener('loadeddata', onReady); res() }
          video.addEventListener('loadeddata', onReady)
          video.play().catch(() => {})
        })
        if (cancelled || !aliveRef.current) return

        // Size overlay to match video
        const overlay = overlayRef.current!
        overlay.width  = video.videoWidth  || 640
        overlay.height = video.videoHeight || 480

        setPhase('ready')
        startRedraw()

        // Detection loop
        let busy = false
        const loop = async () => {
          if (cancelled || !aliveRef.current) return
          if (!busy && detectorRef.current && video.readyState >= 2) {
            busy = true
            try { await detectorRef.current.send({ image: video }) } catch {}
            busy = false
          }
          rafRef.current = requestAnimationFrame(loop)
        }
        rafRef.current = requestAnimationFrame(loop)

      } catch (e: any) {
        if (!cancelled && aliveRef.current) {
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
      cancelled = true
      cancelAnimationFrame(rafRef.current)
      cancelAnimationFrame(animRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [active, startRedraw])

  useEffect(() => () => { aliveRef.current = false }, [])

  // ── Error state ────────────────────────────────────────────
  if (phase === 'error') return (
    <div className="w-full aspect-[4/3] bg-gym-darker rounded-2xl flex items-center justify-center border border-red-500/40">
      <div className="text-center px-6">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-red-300 text-sm font-medium">{errMsg}</p>
      </div>
    </div>
  )

  const badgeColor =
    quality === 'excellent' ? 'bg-emerald-500' :
    quality === 'good'      ? 'bg-amber-500'   :
    quality === 'poor'      ? 'bg-red-500'      : 'bg-gray-600'

  const badgeLabel =
    quality === 'excellent' ? '✓ Rosto Pronto'  :
    quality === 'good'      ? 'Aproxime-se'     :
    quality === 'poor'      ? 'Centralize'      : 'Posicione o rosto'

  return (
    <div className="relative w-full aspect-[4/3] bg-black rounded-2xl overflow-hidden shadow-xl border border-gym-border select-none">

      {/* Loading */}
      {phase === 'init' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0d1117]">
          <Loader2 className="w-8 h-8 text-gym-accent animate-spin mb-3" />
          <p className="text-gym-text-secondary text-sm">Iniciando câmera…</p>
        </div>
      )}

      {/* Video — mirrored purely by CSS */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: mirror ? 'scaleX(-1)' : 'none' }}
        playsInline
        muted
      />

      {/*
        Overlay canvas — NO CSS transform.
        drawFrame() compensates by drawing text/labels un-mirrored internally.
        The bounding box coords from MediaPipe already match the mirrored video
        because MediaPipe processes the raw (un-mirrored) frame and returns
        coords in that space; since video is CSS-mirrored the coords align.
      */}
      <canvas
        ref={overlayRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ transform: 'none' }}
      />

      {/* Hidden capture canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Status badge */}
      {phase === 'ready' && (
        <div className={`absolute top-3 left-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-lg transition-all duration-300 ${badgeColor}`}>
          <span>{badgeLabel}</span>
        </div>
      )}
    </div>
  )
})

FaceDetectionCamera.displayName = 'FaceDetectionCamera'
export default FaceDetectionCamera
