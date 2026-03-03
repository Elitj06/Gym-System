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

// ─── Standalone draw function — pure canvas, zero CSS transform ──────────────
function paint(
  cv: HTMLCanvasElement,
  W: number, H: number,
  box: { xC: number; yC: number; bw: number; bh: number } | null,
  q: FaceQuality,
) {
  // Always resize canvas to match video frame
  if (cv.width !== W)  cv.width  = W
  if (cv.height !== H) cv.height = H

  const ctx = cv.getContext('2d', { alpha: true })
  if (!ctx) return
  ctx.clearRect(0, 0, W, H)

  // Oval guide geometry
  const ox = W * 0.50
  const oy = H * 0.44
  const rx = W * 0.27
  const ry = H * 0.36

  if (!box || q === 'none' || q === 'poor') {
    // Step 1: dark fill over entire canvas
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, 0, W, H)

    // Step 2: punch transparent hole using destination-out
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.ellipse(ox, oy, rx, ry, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0,0,0,1)'
    ctx.fill()

    // Step 3: back to normal compositing
    ctx.globalCompositeOperation = 'source-over'

    // Animated dashed border around oval
    const t = (Date.now() / 1000)
    ctx.save()
    ctx.strokeStyle = q === 'poor' ? '#ef4444' : 'rgba(255,255,255,0.75)'
    ctx.lineWidth   = 2.5
    ctx.setLineDash([12, 8])
    ctx.lineDashOffset = -(t * 25) % 40
    ctx.beginPath()
    ctx.ellipse(ox, oy, rx, ry, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()

    // Cardinal tick marks
    for (const deg of [0, 90, 180, 270]) {
      const rad = deg * Math.PI / 180
      const px = ox + rx * Math.cos(rad)
      const py = oy + ry * Math.sin(rad)
      ctx.beginPath()
      ctx.moveTo(ox + (rx - 12) * Math.cos(rad), oy + (ry - 12) * Math.sin(rad))
      ctx.lineTo(px, py)
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.lineWidth   = 3
      ctx.setLineDash([])
      ctx.stroke()
    }

    // Instruction text
    const msg = q === 'poor' ? 'Centralize o rosto no oval' : 'Posicione seu rosto no oval'
    ctx.font = 'bold 13px system-ui, sans-serif'
    const tw = ctx.measureText(msg).width
    const tx = (W - tw) / 2
    const ty = H * 0.88
    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    ctx.beginPath()
    if (ctx.roundRect) ctx.roundRect(tx - 10, ty - 18, tw + 20, 28, 8)
    else ctx.rect(tx - 10, ty - 18, tw + 20, 28)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.fillText(msg, tx, ty)
    return
  }

  // ── Face detected ──────────────────────────────────────────────────────────
  // MediaPipe gives coords in UN-mirrored space.
  // Since video is CSS scaleX(-1), we mirror X to match visual position.
  const rawL = (box.xC - box.bw / 2) * W
  const rawT = (box.yC - box.bh / 2) * H
  const bw   = box.bw * W
  const bh   = box.bh * H
  const bx   = W - rawL - bw   // mirrored X
  const by   = rawT

  const color = q === 'excellent' ? '#00d4aa' : q === 'good' ? '#eab308' : '#ef4444'

  // Light overlay (no punch-out needed)
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = 'rgba(0,0,0,0.15)'
  ctx.fillRect(0, 0, W, H)

  // Glow
  ctx.shadowColor = color
  ctx.shadowBlur  = 16
  ctx.strokeStyle = color
  ctx.lineWidth   = 2.5
  ctx.setLineDash([])
  ctx.strokeRect(bx, by, bw, bh)
  ctx.shadowBlur  = 0

  // Corner accents
  const cl = Math.min(bw, bh) * 0.22
  ctx.lineWidth   = 4.5
  ctx.strokeStyle = color
  ;[
    [bx,      by,      bx+cl,   by,      bx,      by+cl  ],
    [bx+bw-cl,by,      bx+bw,   by,      bx+bw,   by+cl  ],
    [bx,      by+bh-cl,bx,      by+bh,   bx+cl,   by+bh  ],
    [bx+bw-cl,by+bh,   bx+bw,   by+bh,   bx+bw,   by+bh-cl],
  ].forEach(([x1,y1,mx,my,x2,y2]) => {
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(mx,my); ctx.lineTo(x2,y2); ctx.stroke()
  })

  // Label above box (coords already in canvas/un-mirrored space)
  const label = q === 'excellent' ? '✓ Rosto Pronto' : q === 'good' ? 'Aproxime-se' : 'Centralize'
  ctx.font      = 'bold 13px system-ui, sans-serif'
  const lw      = ctx.measureText(label).width
  const lx      = Math.max(4, Math.min(bx, W - lw - 16))
  const ly      = Math.max(22, by - 8)
  ctx.fillStyle = 'rgba(0,0,0,0.75)'
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(lx - 6, ly - 17, lw + 12, 24, 6)
  else ctx.rect(lx - 6, ly - 17, lw + 12, 24)
  ctx.fill()
  ctx.fillStyle = color
  ctx.fillText(label, lx, ly)
}

// ─── Component ────────────────────────────────────────────────────────────────
const FaceDetectionCamera = forwardRef<FaceDetectionRef, Props>(({
  onFaceDetected,
  active = true,
}, ref) => {
  const videoRef    = useRef<HTMLVideoElement>(null)
  const captureRef  = useRef<HTMLCanvasElement>(null)
  const overlayRef  = useRef<HTMLCanvasElement>(null)
  const streamRef   = useRef<MediaStream | null>(null)
  const detRef      = useRef<any>(null)
  const rafDetRef   = useRef<number>(0)
  const rafDrawRef  = useRef<number>(0)
  const aliveRef    = useRef(true)
  const boxRef      = useRef<{ xC: number; yC: number; bw: number; bh: number } | null>(null)
  const qualRef     = useRef<FaceQuality>('none')

  const [phase,   setPhase]   = useState<'init' | 'ready' | 'error'>('init')
  const [errMsg,  setErrMsg]  = useState('')
  const [quality, setQuality] = useState<FaceQuality>('none')

  // ── Expose capture() ────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    capture(): string | null {
      const v = videoRef.current, c = captureRef.current
      if (!v || !c || v.readyState < 2) return null
      c.width  = v.videoWidth  || 640
      c.height = v.videoHeight || 480
      const ctx = c.getContext('2d')!
      ctx.drawImage(v, 0, 0)   // raw un-mirrored photo (correct for storage)
      return c.toDataURL('image/jpeg', 0.92)
    }
  }))

  // ── Load MediaPipe detector ──────────────────────────────────────────
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
        det.setOptions({ model: 'short', minDetectionConfidence: 0.45 })
        det.onResults((res: any) => {
          if (!aliveRef.current) return
          if (res.detections?.length > 0) {
            const b = res.detections[0].boundingBox
            if (b) {
              const area = b.width * b.height
              const dx   = Math.abs(b.xCenter - 0.5)
              const dy   = Math.abs(b.yCenter - 0.44)
              const q: FaceQuality =
                area > 0.09 && dx < 0.16 && dy < 0.16 ? 'excellent' :
                area > 0.04 && dx < 0.26 && dy < 0.26 ? 'good'      : 'poor'
              boxRef.current  = { xC: b.xCenter, yC: b.yCenter, bw: b.width, bh: b.height }
              qualRef.current = q
              setQuality(q)
              onFaceDetected?.(true, q)
            }
          } else {
            boxRef.current  = null
            qualRef.current = 'none'
            setQuality('none')
            onFaceDetected?.(false, 'none')
          }
        })
        detRef.current = det
      } catch {
        if (!gone && aliveRef.current) {
          setErrMsg('Não foi possível carregar o detector facial.')
          setPhase('error')
        }
      }
    })()
    return () => { gone = true }
  }, [])

  // ── Camera + draw loops ──────────────────────────────────────────────
  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(rafDetRef.current)
      cancelAnimationFrame(rafDrawRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
      boxRef.current    = null
      qualRef.current   = 'none'
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
        await video.play().catch(() => {})

        // Wait for first frame
        await new Promise<void>(res => {
          if (video.readyState >= 2) { res(); return }
          const onData = () => { video.removeEventListener('loadeddata', onData); res() }
          video.addEventListener('loadeddata', onData)
        })
        if (gone || !aliveRef.current) return

        // Pre-size overlay canvas immediately so first draw has correct dims
        const cv = overlayRef.current!
        cv.width  = video.videoWidth  || 640
        cv.height = video.videoHeight || 480

        setPhase('ready')

        // 60fps draw loop
        const drawLoop = () => {
          if (gone || !aliveRef.current) return
          const cv  = overlayRef.current
          const vid = videoRef.current
          if (cv && vid && vid.readyState >= 2) {
            paint(cv, vid.videoWidth || 640, vid.videoHeight || 480, boxRef.current, qualRef.current)
          }
          rafDrawRef.current = requestAnimationFrame(drawLoop)
        }
        rafDrawRef.current = requestAnimationFrame(drawLoop)

        // Detection loop (runs independently)
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
            ? 'Permissão de câmera negada. Autorize nas configurações do navegador.'
            : 'Não foi possível acessar a câmera.')
          setPhase('error')
        }
      }
    })()

    return () => {
      gone = true
      cancelAnimationFrame(rafDetRef.current)
      cancelAnimationFrame(rafDrawRef.current)
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
                   : quality === 'poor'      ? 'bg-red-500' : 'bg-gray-700/80'
  const badgeLabel = quality === 'excellent' ? '✓ Rosto Pronto'
                   : quality === 'good'      ? 'Aproxime-se'
                   : quality === 'poor'      ? 'Centralize'  : 'Posicione o rosto'

  return (
    <div className="relative w-full aspect-[4/3] bg-black rounded-2xl overflow-hidden shadow-xl border border-gym-border select-none">

      {/* Loading */}
      {phase === 'init' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0d1117]">
          <Loader2 className="w-8 h-8 text-gym-accent animate-spin mb-3" />
          <p className="text-gym-text-secondary text-sm">Iniciando câmera…</p>
        </div>
      )}

      {/* Video — mirrored CSS only, canvas has NO transform */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
        playsInline muted
      />

      {/*
        Canvas overlay — absolutely NO CSS transform here.
        The paint() function mirrors box X coords internally.
        destination-out composite only works correctly on untransformed canvas.
      */}
      <canvas
        ref={overlayRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ transform: 'none', imageRendering: 'pixelated' }}
      />

      {/* Hidden capture canvas */}
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
