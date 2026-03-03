'use client'

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

interface FaceBox {
  x: number; y: number; width: number; height: number
}

interface Props {
  onFaceDetected?: (detected: boolean, quality?: 'none' | 'poor' | 'good' | 'excellent') => void
  active?: boolean
  mirror?: boolean
  showGuide?: boolean
}

export interface FaceDetectionRef {
  capture: () => string | null
}

const FaceDetectionCamera = forwardRef<FaceDetectionRef, Props>(({
  onFaceDetected,
  active = true,
  mirror = true,
  showGuide = true,
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<any>(null)
  const rafRef = useRef<number>(0)
  const mountedRef = useRef(true)

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [faceQuality, setFaceQuality] = useState<'none' | 'poor' | 'good' | 'excellent'>('none')

  useImperativeHandle(ref, () => ({
    capture: (): string | null => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState < 2) return null
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      if (mirror) {
        ctx.translate(canvas.width, 0)
        ctx.scale(-1, 1)
      }
      ctx.drawImage(video, 0, 0)
      return canvas.toDataURL('image/jpeg', 0.92)
    }
  }))

  // Draw overlay: guide oval + face bounding box
  const drawOverlay = (
    box: FaceBox | null,
    quality: 'none' | 'poor' | 'good' | 'excellent',
    w: number,
    h: number
  ) => {
    const canvas = overlayRef.current
    if (!canvas) return
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, w, h)

    // Oval guide
    const ovalW = w * 0.48
    const ovalH = h * 0.72
    const cx = w / 2
    const cy = h * 0.48

    if (!box || quality === 'none') {
      // Dark overlay with oval cutout
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.fillRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.ellipse(cx, cy, ovalW / 2, ovalH / 2, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over'

      // Dashed oval border
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'
      ctx.lineWidth = 2
      ctx.setLineDash([8, 6])
      ctx.beginPath()
      ctx.ellipse(cx, cy, ovalW / 2, ovalH / 2, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
    } else {
      // Face detected: colored box
      const color =
        quality === 'excellent' ? '#00d4aa' :
        quality === 'good' ? '#eab308' :
        '#ef4444'

      // Semi-dark background
      ctx.fillStyle = 'rgba(0,0,0,0.15)'
      ctx.fillRect(0, 0, w, h)

      // Bounding box
      ctx.strokeStyle = color
      ctx.lineWidth = 2.5
      ctx.setLineDash([])
      ctx.strokeRect(box.x, box.y, box.width, box.height)

      // Corner accents
      const cl = Math.min(box.width, box.height) * 0.18
      ctx.lineWidth = 4
      ctx.strokeStyle = color
      // TL
      ctx.beginPath(); ctx.moveTo(box.x, box.y + cl); ctx.lineTo(box.x, box.y); ctx.lineTo(box.x + cl, box.y); ctx.stroke()
      // TR
      ctx.beginPath(); ctx.moveTo(box.x + box.width - cl, box.y); ctx.lineTo(box.x + box.width, box.y); ctx.lineTo(box.x + box.width, box.y + cl); ctx.stroke()
      // BL
      ctx.beginPath(); ctx.moveTo(box.x, box.y + box.height - cl); ctx.lineTo(box.x, box.y + box.height); ctx.lineTo(box.x + cl, box.y + box.height); ctx.stroke()
      // BR
      ctx.beginPath(); ctx.moveTo(box.x + box.width - cl, box.y + box.height); ctx.lineTo(box.x + box.width, box.y + box.height); ctx.lineTo(box.x + box.width, box.y + box.height - cl); ctx.stroke()

      // Label
      ctx.font = 'bold 13px sans-serif'
      ctx.fillStyle = color
      const label = quality === 'excellent' ? '✓ Rosto Pronto' : quality === 'good' ? 'Aproxime-se' : 'Centralize'
      const textW = ctx.measureText(label).width
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(box.x, box.y - 26, textW + 12, 22)
      ctx.fillStyle = color
      ctx.fillText(label, box.x + 6, box.y - 8)
    }
  }

  // Load detector
  useEffect(() => {
    mountedRef.current = true
    let cancelled = false;

    (async () => {
      try {
        const fd = await import('@mediapipe/face_detection')
        if (cancelled || !mountedRef.current) return

        const detector = new fd.FaceDetection({
          locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4.1646425229/${f}`
        })
        detector.setOptions({ model: 'short', minDetectionConfidence: 0.5 })

        detector.onResults((results: any) => {
          if (!mountedRef.current) return
          const video = videoRef.current
          if (!video) return
          const w = video.videoWidth || 640
          const h = video.videoHeight || 480

          if (results.detections?.length > 0) {
            const det = results.detections[0]
            const box = det.boundingBox
            if (box) {
              const bx = box.xCenter * w - (box.width * w) / 2
              const by = box.yCenter * h - (box.height * h) / 2
              const bw = box.width * w
              const bh = box.height * h

              const faceArea = box.width * box.height
              const cx = Math.abs(box.xCenter - 0.5)
              const cy = Math.abs(box.yCenter - 0.45)

              let q: 'poor' | 'good' | 'excellent' = 'poor'
              if (faceArea > 0.10 && cx < 0.18 && cy < 0.18) q = 'excellent'
              else if (faceArea > 0.05 && cx < 0.28 && cy < 0.28) q = 'good'

              setFaceQuality(q)
              onFaceDetected?.(true, q)
              drawOverlay({ x: bx, y: by, width: bw, height: bh }, q, w, h)
            }
          } else {
            setFaceQuality('none')
            onFaceDetected?.(false, 'none')
            drawOverlay(null, 'none', w, h)
          }
        })

        detectorRef.current = detector
      } catch (e) {
        if (!cancelled && mountedRef.current) {
          setErrorMsg('Não foi possível carregar o módulo de detecção facial.')
          setStatus('error')
        }
      }
    })()

    return () => { cancelled = true }
  }, [])

  // Camera
  useEffect(() => {
    if (!active) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
      cancelAnimationFrame(rafRef.current)
      setStatus('loading')
      setFaceQuality('none')
      return
    }

    let cancelled = false

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream

        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        video.setAttribute('playsinline', 'true')
        video.muted = true

        await new Promise<void>((res) => {
          video.onloadeddata = () => res()
          video.play().catch(() => {})
        })

        if (cancelled || !mountedRef.current) return
        setStatus('ready')

        // Resize overlay to match video
        if (overlayRef.current) {
          overlayRef.current.width = video.videoWidth || 640
          overlayRef.current.height = video.videoHeight || 480
          drawOverlay(null, 'none', video.videoWidth || 640, video.videoHeight || 480)
        }

        // Detection loop
        let busy = false
        const loop = async () => {
          if (cancelled || !mountedRef.current) return
          if (!busy && detectorRef.current && video.readyState >= 2) {
            busy = true
            try { await detectorRef.current.send({ image: video }) } catch {}
            busy = false
          }
          rafRef.current = requestAnimationFrame(loop)
        }
        rafRef.current = requestAnimationFrame(loop)

      } catch (e: any) {
        if (!cancelled && mountedRef.current) {
          const msg = e.name === 'NotAllowedError'
            ? 'Permissão de câmera negada. Autorize o acesso nas configurações do navegador.'
            : 'Não foi possível acessar a câmera.'
          setErrorMsg(msg)
          setStatus('error')
        }
      }
    }

    start()

    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
    }
  }, [active])

  useEffect(() => {
    return () => { mountedRef.current = false }
  }, [])

  if (status === 'error') {
    return (
      <div className="w-full aspect-[4/3] bg-gym-darker rounded-2xl flex items-center justify-center border border-red-500/40">
        <div className="text-center px-6">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-300 font-medium text-sm">{errorMsg}</p>
        </div>
      </div>
    )
  }

  const qualityColor =
    faceQuality === 'excellent' ? 'bg-emerald-500' :
    faceQuality === 'good' ? 'bg-yellow-500' :
    faceQuality === 'poor' ? 'bg-red-500' :
    'bg-gray-500'

  const qualityLabel =
    faceQuality === 'excellent' ? 'Rosto Pronto ✓' :
    faceQuality === 'good' ? 'Aproxime-se' :
    faceQuality === 'poor' ? 'Centralize o rosto' :
    'Posicione seu rosto'

  return (
    <div className="relative w-full aspect-[4/3] bg-black rounded-2xl overflow-hidden shadow-xl border border-gym-border">
      {/* Loading overlay */}
      {status === 'loading' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-gym-darker">
          <Loader2 className="w-8 h-8 text-gym-accent animate-spin mb-3" />
          <p className="text-gym-text-secondary text-sm">Inicializando câmera...</p>
        </div>
      )}

      {/* Video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: mirror ? 'scaleX(-1)' : 'none' }}
        playsInline
        muted
      />

      {/* Overlay canvas */}
      <canvas
        ref={overlayRef}
        className="absolute inset-0 w-full h-full"
        style={{ transform: mirror ? 'scaleX(-1)' : 'none' }}
      />

      {/* Hidden capture canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Status badge */}
      {status === 'ready' && (
        <div className={`absolute top-3 left-3 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-white shadow-lg transition-all ${qualityColor}`}>
          {faceQuality === 'excellent'
            ? <CheckCircle2 className="w-3.5 h-3.5" />
            : <AlertCircle className="w-3.5 h-3.5" />
          }
          {qualityLabel}
        </div>
      )}

      {/* Instruction text at bottom */}
      {status === 'ready' && faceQuality === 'none' && showGuide && (
        <div className="absolute bottom-0 inset-x-0 z-20 text-center pb-4 pt-6 bg-gradient-to-t from-black/70 to-transparent">
          <p className="text-white text-xs font-medium">Centralize seu rosto no oval</p>
        </div>
      )}
    </div>
  )
})

FaceDetectionCamera.displayName = 'FaceDetectionCamera'
export default FaceDetectionCamera
