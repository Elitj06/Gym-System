'use client'

import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

interface FaceBox {
  x: number; y: number; width: number; height: number
}

interface Props {
  onFaceDetected?: (detected: boolean, box?: FaceBox) => void
  onCapture?: (imageData: string) => void
  active?: boolean
}

export interface FaceDetectionRef {
  capture: () => string | null
}

const FaceDetectionCamera = forwardRef<FaceDetectionRef, Props>(({ onFaceDetected, onCapture, active = true }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<any>(null)
  const rafRef = useRef<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [faceFound, setFaceFound] = useState(false)
  const [faceQuality, setFaceQuality] = useState<'none' | 'poor' | 'good' | 'excellent'>('none')

  // Expose capture method to parent
  useImperativeHandle(ref, () => ({
    capture: () => {
      if (!canvasRef.current || !videoRef.current) return null
      const c = canvasRef.current
      const ctx = c.getContext('2d')
      if (!ctx) return null
      c.width = videoRef.current.videoWidth || 640
      c.height = videoRef.current.videoHeight || 480
      ctx.drawImage(videoRef.current, 0, 0, c.width, c.height)
      return c.toDataURL('image/jpeg', 0.9)
    }
  }))

  // Load face detection model
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const fd = await import('@mediapipe/face_detection')
        if (cancelled) return
        const detector = new fd.FaceDetection({
          locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${f}`
        })
        detector.setOptions({ model: 'short', minDetectionConfidence: 0.5 })
        detector.onResults((results: any) => {
          if (cancelled) return
          const overlay = overlayCanvasRef.current
          if (!overlay) return
          const ctx = overlay.getContext('2d')
          if (!ctx) return

          ctx.clearRect(0, 0, overlay.width, overlay.height)

          if (results.detections && results.detections.length > 0) {
            const det = results.detections[0]
            const box = det.boundingBox
            if (box) {
              // Draw face rectangle
              const x = box.xCenter * overlay.width - (box.width * overlay.width) / 2
              const y = box.yCenter * overlay.height - (box.height * overlay.height) / 2
              const w = box.width * overlay.width
              const h = box.height * overlay.height

              // Calculate face quality based on size and position
              const faceArea = box.width * box.height
              const centerOffsetX = Math.abs(box.xCenter - 0.5)
              const centerOffsetY = Math.abs(box.yCenter - 0.45)

              let quality: 'poor' | 'good' | 'excellent' = 'poor'
              if (faceArea > 0.08 && centerOffsetX < 0.2 && centerOffsetY < 0.2) quality = 'excellent'
              else if (faceArea > 0.04 && centerOffsetX < 0.3 && centerOffsetY < 0.3) quality = 'good'

              setFaceQuality(quality)
              setFaceFound(true)
              onFaceDetected?.(true, { x, y, width: w, height: h })

              // Draw bounding box
              const color = quality === 'excellent' ? '#00d4aa' : quality === 'good' ? '#eab308' : '#ef4444'
              ctx.strokeStyle = color
              ctx.lineWidth = 3
              ctx.strokeRect(x, y, w, h)

              // Draw corner accents
              const cornerLen = Math.min(w, h) * 0.15
              ctx.lineWidth = 4
              ctx.strokeStyle = color
              // Top-left
              ctx.beginPath(); ctx.moveTo(x, y + cornerLen); ctx.lineTo(x, y); ctx.lineTo(x + cornerLen, y); ctx.stroke()
              // Top-right
              ctx.beginPath(); ctx.moveTo(x + w - cornerLen, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + cornerLen); ctx.stroke()
              // Bottom-left
              ctx.beginPath(); ctx.moveTo(x, y + h - cornerLen); ctx.lineTo(x, y + h); ctx.lineTo(x + cornerLen, y + h); ctx.stroke()
              // Bottom-right
              ctx.beginPath(); ctx.moveTo(x + w - cornerLen, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - cornerLen); ctx.stroke()

              // Label
              ctx.fillStyle = color
              ctx.font = 'bold 12px sans-serif'
              const label = quality === 'excellent' ? '✓ Rosto Detectado' : quality === 'good' ? 'Aproxime-se' : 'Centralize o rosto'
              ctx.fillText(label, x, y - 8)

              // Confidence
              const conf = Math.round((det.score?.[0] || det.score || 0.95) * 100)
              ctx.font = '10px sans-serif'
              ctx.fillStyle = '#fff'
              ctx.fillText(`${conf}%`, x + w - 30, y - 8)
            }
          } else {
            setFaceFound(false)
            setFaceQuality('none')
            onFaceDetected?.(false)
          }
        })
        detectorRef.current = detector
        setLoading(false)
      } catch (e) {
        console.error('Face detection load error:', e)
        if (!cancelled) setError('Erro ao carregar detecção facial.')
      }
    })()
    return () => { cancelled = true }
  }, [onFaceDetected])

  // Camera
  useEffect(() => {
    if (loading || !detectorRef.current || !active) return
    let cancelled = false

    const startCamera = async () => {
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
        await video.play()

        // Set overlay canvas size
        if (overlayCanvasRef.current) {
          overlayCanvasRef.current.width = video.videoWidth || 640
          overlayCanvasRef.current.height = video.videoHeight || 480
        }

        // Process frames
        let busy = false
        const loop = async () => {
          if (cancelled) return
          if (!busy && detectorRef.current && video.readyState === 4) {
            busy = true
            try { await detectorRef.current.send({ image: video }) } catch {}
            busy = false
          }
          rafRef.current = requestAnimationFrame(loop)
        }
        rafRef.current = requestAnimationFrame(loop)
      } catch (e: any) {
        if (!cancelled) {
          setError(e.name === 'NotAllowedError' ? 'Permissão de câmera negada.' : `Erro: ${e.message}`)
        }
      }
    }

    startCamera()

    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    }
  }, [loading, active])

  if (error) return (
    <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-200">
      <p className="font-semibold">Erro</p><p className="text-sm mt-1">{error}</p>
    </div>
  )

  return (
    <div className="relative w-full aspect-video bg-gym-darker rounded-lg overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gym-dark/80 z-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gym-accent mx-auto mb-3" />
            <p className="text-gym-text-secondary text-sm">Carregando detecção facial...</p>
          </div>
        </div>
      )}
      <video ref={videoRef} className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} playsInline muted />
      <canvas ref={overlayCanvasRef} className="absolute inset-0 w-full h-full" style={{ transform: 'scaleX(-1)' }} />
      <canvas ref={canvasRef} className="hidden" />

      {/* Status badge */}
      <div className={`absolute top-3 left-3 px-2 py-1 rounded text-xs font-medium flex items-center gap-1.5 ${
        faceQuality === 'excellent' ? 'bg-green-500/90 text-white' :
        faceQuality === 'good' ? 'bg-yellow-500/90 text-black' :
        faceFound ? 'bg-red-500/90 text-white' : 'bg-gray-500/70 text-white'
      }`}>
        {faceFound ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
        {faceQuality === 'excellent' ? 'Rosto Pronto' : faceQuality === 'good' ? 'Aproxime-se' : faceFound ? 'Centralize' : 'Posicione seu rosto'}
      </div>

      {/* Face guide when no face detected */}
      {!faceFound && !loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-40 h-52 border-2 border-dashed border-gym-accent/40 rounded-[50%] animate-pulse" />
        </div>
      )}
    </div>
  )
})

FaceDetectionCamera.displayName = 'FaceDetectionCamera'
export default FaceDetectionCamera
