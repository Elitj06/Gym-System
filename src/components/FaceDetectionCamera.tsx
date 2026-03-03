'use client'

/**
 * FaceDetectionCamera
 * 
 * ARQUITETURA DO CANVAS:
 * - <video> tem CSS transform: scaleX(-1) para efeito espelho (natural para selfie)
 * - <canvas> NÃO tem transform CSS algum — fica em coordenadas absolutas
 * - MediaPipe recebe o frame SEM espelho → suas coords são no espaço original
 * - Para desenhar o bounding box na posição certa sobre o vídeo espelhado,
 *   espelhamos as coordenadas X: drawX = canvasWidth - (mpX + mpW) para o lado esquerdo
 * - O texto/label é desenhado normalmente (ctx.save/restore sem scale) porque
 *   o canvas já NÃO está espelhado
 */

import {
  useRef, useEffect, useState,
  forwardRef, useImperativeHandle, useCallback
} from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'

export type FaceQuality = 'none' | 'poor' | 'good' | 'excellent'

interface Props {
  onFaceDetected?: (detected: boolean, quality: FaceQuality) => void
  active?: boolean
}

export interface FaceDetectionRef {
  capture: () => string | null
}

// ─── Canvas drawing ───────────────────────────────────────────────────────────
function drawOverlay(
  canvas: HTMLCanvasElement,
  W: number,
  H: number,
  // mpBox: raw MediaPipe box in UN-mirrored space (null when no face)
  mpBox: { xC: number; yC: number; bw: number; bh: number } | null,
  quality: FaceQuality,
) {
  if (canvas.width !== W) canvas.width  = W
  if (canvas.height !== H) canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, W, H)

  // ── Guide oval (center of canvas, always visible) ──────────────────
  const ovalCX = W * 0.50
  const ovalCY = H * 0.44
  const ovalRX = W * 0.28
  const ovalRY = H * 0.37

  if (!mpBox || quality === 'none' || quality === 'poor') {
    // Dark vignette with transparent oval cutout
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.52)'
    ctx.fillRect(0, 0, W, H)
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.ellipse(ovalCX, ovalCY, ovalRX, ovalRY, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // Animated dashed oval border
    ctx.save()
    const dashOffset = -(Date.now() / 40) % 40
    ctx.strokeStyle = quality === 'poor'
      ? 'rgba(239,68,68,0.95)' : 'rgba(255,255,255,0.6)'
    ctx.lineWidth = 2.5
    ctx.setLineDash([14, 10])
    ctx.lineDashOffset = dashOffset
    ctx.beginPath()
    ctx.ellipse(ovalCX, ovalCY, ovalRX, ovalRY, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()

    // 4 solid tick marks at cardinal points of oval
    ;[0, 90, 180, 270].forEach(deg => {
      const rad  = (deg * Math.PI) / 180
      const px   = ovalCX + ovalRX * Math.cos(rad)
      const py   = ovalCY + ovalRY * Math.sin(rad)
      const inX  = ovalCX + (ovalRX - 10) * Math.cos(rad)
      const inY  = ovalCY + (ovalRY - 10) * Math.sin(rad)
      ctx.beginPath()
      ctx.moveTo(inX, inY); ctx.lineTo(px, py)
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.lineWidth   = 3
      ctx.setLineDash([])
      ctx.stroke()
    })

    // Instruction text at bottom
    const msg = quality === 'poor'
      ? 'Centralize o rosto no oval'
      : 'Posicione seu rosto no oval'
    ctx.font      = '600 13px system-ui, sans-serif'
    const tw      = ctx.measureText(msg).width
    const tx      = (W - tw) / 2
    const ty      = H * 0.88
    ctx.fillStyle = 'rgba(0,0,0,0.65)'
    ctx.beginPath()
    ctx.roundRect(tx - 10, ty - 18, tw + 20, 28, 8)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.fillText(msg, tx, ty)
    return
  }

  // ── Face detected: compute mirrored box position ────────────────────
  // MediaPipe coords are in un-mirrored space.
  // Since video is CSS-mirrored, we mirror X axis:
  //   mirroredLeft = W - (mpBox.xC*W + mpBox.bw*W/2)
  const rawLeft   = (mpBox.xC - mpBox.bw / 2) * W
  const rawTop    = (mpBox.yC - mpBox.bh / 2) * H
  const rawW      = mpBox.bw * W
  const rawH      = mpBox.bh * H
  const mirLeft   = W - rawLeft - rawW
  const bx        = mirLeft
  const by        = rawTop
  const bw        = rawW
  const bh        = rawH

  const color =
    quality === 'excellent' ? '#00d4aa' :
    quality === 'good'      ? '#eab308' : '#ef4444'

  // Subtle overlay
  ctx.fillStyle = 'rgba(0,0,0,0.10)'
  ctx.fillRect(0, 0, W, H)

  // Glow effect
  ctx.shadowColor = color
  ctx.shadowBlur  = 14
  ctx.strokeStyle = color
  ctx.lineWidth   = 2.5
  ctx.setLineDash([])
  ctx.strokeRect(bx, by, bw, bh)
  ctx.shadowBlur  = 0

  // Corner accents
  const cl = Math.min(bw, bh) * 0.20
  ctx.lineWidth   = 4
  ctx.strokeStyle = color
  ;[
    [bx,      by,      bx + cl, by,      bx,      by + cl],
    [bx+bw-cl,by,      bx+bw,   by,      bx+bw,   by+cl  ],
    [bx,      by+bh-cl,bx,      by+bh,   bx+cl,   by+bh  ],
    [bx+bw-cl,by+bh,   bx+bw,   by+bh,   bx+bw,   by+bh-cl],
  ].forEach(([x1,y1, mx,my, x2,y2]) => {
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(mx,my); ctx.lineTo(x2,y2)
    ctx.stroke()
  })

  // Label (text in canvas coords = already un-mirrored, so just draw normally)
  const label = quality === 'excellent' ? '✓ Rosto Pronto'
              : quality === 'good'      ? 'Aproxime-se'
              : 'Centralize'
  ctx.font      = 'bold 13px system-ui, sans-serif'
  const lw      = ctx.measureText(label).width
  const lx      = Math.max(4, Math.min(bx, W - lw - 16))
  const ly      = Math.max(22, by - 8)
  ctx.fillStyle = 'rgba(0,0,0,0.72)'
  ctx.beginPath()
  ctx.roundRect(lx - 6, ly - 17, lw + 12, 24, 6)
  ctx.fill()
  ctx.fillStyle = color
  ctx.fillText(label, lx, ly)
}

// ─── Component ────────────────────────────────────────────────────────────────
const FaceDetectionCamera = forwardRef<FaceDetectionRef, Props>(({
  onFaceDetected, active = true
}, ref) => {

  const videoRef    = useRef<HTMLVideoElement>(null)
  const captureRef  = useRef<HTMLCanvasElement>(null)   // hidden, for photo capture
  const overlayRef  = useRef<HTMLCanvasElement>(null)   // visible overlay
  const streamRef   = useRef<MediaStream | null>(null)
  const detectorRef = useRef<any>(null)
  const rafDetRef   = useRef<number>(0)       // detection rAF
  const rafDrawRef  = useRef<number>(0)       // draw rAF
  const aliveRef    = useRef(true)
  const mpBoxRef    = useRef<{ xC: number; yC: number; bw: number; bh: number } | null>(null)
  const qualityRef  = useRef<FaceQuality>('none')

  const [phase,   setPhase]   = useState<'init' | 'ready' | 'error'>('init')
  const [errMsg,  setErrMsg]  = useState('')
  const [quality, setQuality] = useState<FaceQuality>('none')

  // ── Capture ──────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    capture(): string | null {
      const v = videoRef.current
      const c = captureRef.current
      if (!v || !c || v.readyState < 2) return null
      c.width  = v.videoWidth  || 640
      c.height = v.videoHeight || 480
      const ctx = c.getContext('2d')!
      // Capture the raw (un-mirrored) frame for correct storage
      ctx.drawImage(v, 0, 0, c.width, c.height)
      return c.toDataURL('image/jpeg', 0.92)
    }
  }))

  // ── Continuous 60fps redraw loop ─────────────────────────────────────
  const startDraw = useCallback(() => {
    const loop = () => {
      if (!aliveRef.current) return
      const canvas = overlayRef.current
      const video  = videoRef.current
      if (canvas && video && video.readyState >= 2) {
        drawOverlay(
          canvas,
          video.videoWidth  || 640,
          video.videoHeight || 480,
          mpBoxRef.current,
          qualityRef.current,
        )
      }
      rafDrawRef.current = requestAnimationFrame(loop)
    }
    rafDrawRef.current = requestAnimationFrame(loop)
  }, [])

  // ── Load MediaPipe once ──────────────────────────────────────────────
  useEffect(() => {
    aliveRef.current = true
    let gone = false;
    (async () => {
      try {
        const fd = await import('@mediapipe/face_detection')
        if (gone || !aliveRef.current) return

        const det = new fd.FaceDetection({
          locateFile: (f: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4.1646425229/${f}`
        })
        det.setOptions({ model: 'short', minDetectionConfidence: 0.5 })
        det.onResults((res: any) => {
          if (!aliveRef.current) return

          if (res.detections?.length > 0) {
            const b = res.detections[0].boundingBox
            if (b) {
              // MediaPipe normalized: xCenter, yCenter, width, height
              const area = b.width * b.height
              const dx   = Math.abs(b.xCenter - 0.5)
              const dy   = Math.abs(b.yCenter - 0.44)

              const q: FaceQuality =
                area > 0.09 && dx < 0.15 && dy < 0.15 ? 'excellent' :
                area > 0.04 && dx < 0.25 && dy < 0.25 ? 'good'      : 'poor'

              mpBoxRef.current  = { xC: b.xCenter, yC: b.yCenter, bw: b.width, bh: b.height }
              qualityRef.current = q
              setQuality(q)
              onFaceDetected?.(true, q)
            }
          } else {
            mpBoxRef.current   = null
            qualityRef.current = 'none'
            setQuality('none')
            onFaceDetected?.(false, 'none')
          }
        })
        detectorRef.current = det
      } catch {
        if (!gone && aliveRef.current) {
          setErrMsg('Não foi possível carregar o detector facial.')
          setPhase('error')
        }
      }
    })()
    return () => { gone = true }
  }, [])

  // ── Camera lifecycle ─────────────────────────────────────────────────
  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(rafDetRef.current)
      cancelAnimationFrame(rafDrawRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current     = null
      mpBoxRef.current      = null
      qualityRef.current    = 'none'
      setQuality('none')
      setPhase('init')
      return
    }

    let gone = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        })
        if (gone) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream

        const video       = videoRef.current!
        video.srcObject   = stream
        video.setAttribute('playsinline', 'true')
        video.muted       = true

        await new Promise<void>(res => {
          video.addEventListener('loadeddata', function onLoad() {
            video.removeEventListener('loadeddata', onLoad); res()
          })
          video.play().catch(() => {})
        })
        if (gone || !aliveRef.current) return

        setPhase('ready')
        startDraw()         // start 60fps overlay loop

        // Detection loop
        let busy = false
        const detLoop = async () => {
          if (gone || !aliveRef.current) return
          if (!busy && detectorRef.current && video.readyState >= 2) {
            busy = true
            try { await detectorRef.current.send({ image: video }) } catch {}
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
  }, [active, startDraw])

  useEffect(() => () => { aliveRef.current = false }, [])

  // ── Error ────────────────────────────────────────────────────────────
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
                   : quality === 'poor'      ? 'bg-red-500' : 'bg-gray-700'
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

      {/*
        Video: mirrored via CSS only.
        transform-style doesn't affect the canvas — they are siblings.
      */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
        playsInline
        muted
      />

      {/*
        Overlay canvas: NO CSS transform.
        Drawing logic mirrors the X coordinates internally to match the flipped video.
        This ensures the oval and bounding box render correctly without text inversion.
      */}
      <canvas
        ref={overlayRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Hidden canvas for photo capture */}
      <canvas ref={captureRef} className="hidden" />

      {/* Status badge */}
      {phase === 'ready' && (
        <div className={`absolute top-3 left-3 z-20 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-lg transition-colors duration-300 ${badgeBg}`}>
          {badgeLabel}
        </div>
      )}
    </div>
  )
})

FaceDetectionCamera.displayName = 'FaceDetectionCamera'
export default FaceDetectionCamera
