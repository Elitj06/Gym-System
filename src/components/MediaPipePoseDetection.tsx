'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { RotateCcw } from 'lucide-react'

interface Props {
  onResults?: (results: any) => void
  onScoreUpdate?: (score: number) => void
  videoUrl?: string
  isLive?: boolean
  facingMode?: 'user' | 'environment'
}

export default function MediaPipePoseDetection({ onResults, onScoreUpdate, videoUrl, isLive = false, facingMode = 'environment' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const poseRef = useRef<any>(null)
  const drawRef = useRef<any>(null)
  const connRef = useRef<any>(null)
  const rafRef = useRef<number>(0)
  const onResultsRef = useRef(onResults)
  const onScoreRef = useRef(onScoreUpdate)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detected, setDetected] = useState(false)
  const [cameraInfo, setCameraInfo] = useState('')

  useEffect(() => { onResultsRef.current = onResults }, [onResults])
  useEffect(() => { onScoreRef.current = onScoreUpdate }, [onScoreUpdate])

  const calcScore = useCallback((lm: any[]) => {
    if (!lm || lm.length < 33) return 50
    const kp = [11, 12, 13, 14, 23, 24, 25, 26, 27, 28]
    const vis = kp.reduce((s, i) => s + (lm[i]?.visibility || 0), 0) / kp.length
    const sd = Math.abs((lm[11]?.y || 0) - (lm[12]?.y || 0))
    const hd = Math.abs((lm[23]?.y || 0) - (lm[24]?.y || 0))
    const sym = Math.max(0, 1 - (sd + hd) * 5)
    const tilt = Math.abs((lm[12]?.x || 0) - (lm[24]?.x || 0))
    const post = Math.max(0, 1 - tilt * 3)
    return Math.min(100, Math.max(0, vis * 40 + sym * 30 + post * 30))
  }, [])

  const handlePose = useCallback((r: any) => {
    if (!canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return
    ctx.save()
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    ctx.drawImage(r.image, 0, 0, canvasRef.current.width, canvasRef.current.height)
    if (r.poseLandmarks) {
      if (drawRef.current?.drawConnectors && connRef.current)
        drawRef.current.drawConnectors(ctx, r.poseLandmarks, connRef.current, { color: '#00d4aa', lineWidth: 3 })
      if (drawRef.current?.drawLandmarks)
        drawRef.current.drawLandmarks(ctx, r.poseLandmarks, { color: '#ff0364', lineWidth: 2, radius: 5 })
      const score = calcScore(r.poseLandmarks)
      onScoreRef.current?.(score)
      setDetected(true)
      onResultsRef.current?.(r)
    }
    ctx.restore()
  }, [calcScore])

  // Load MediaPipe once
  useEffect(() => {
    let c = false
    ;(async () => {
      try {
        const [pm, dm] = await Promise.all([import('@mediapipe/pose'), import('@mediapipe/drawing_utils')])
        if (c) return
        drawRef.current = dm; connRef.current = pm.POSE_CONNECTIONS
        const pose = new pm.Pose({ locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` })
        pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, enableSegmentation: false, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 })
        pose.onResults(handlePose)
        poseRef.current = pose
        setLoading(false)
      } catch { if (!c) setError('Erro ao carregar modelo de IA.') }
    })()
    return () => { c = true }
  }, [handlePose])

  // Camera — this entire effect reruns when facingMode changes (via key remount from parent)
  useEffect(() => {
    if (!isLive || loading || !poseRef.current) return
    let cancelled = false

    const startCamera = async () => {
      try {
        // Strategy: try multiple approaches to get the right camera
        let stream: MediaStream | null = null

        // Approach 1: Direct deviceId selection (most reliable for rear camera)
        try {
          // Get permission first
          const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
          tempStream.getTracks().forEach(t => t.stop())

          const devices = await navigator.mediaDevices.enumerateDevices()
          const cameras = devices.filter(d => d.kind === 'videoinput')

          if (cameras.length >= 2) {
            let targetCam: MediaDeviceInfo | undefined

            if (facingMode === 'environment') {
              // Rear camera: look for back/rear/environment in label, or pick the last one
              targetCam = cameras.find(c => /back|rear|environment|traseira|camera2|camera 2|wide/i.test(c.label))
              if (!targetCam) targetCam = cameras[cameras.length - 1]
            } else {
              // Front camera: look for front/user/selfie, or pick the first one
              targetCam = cameras.find(c => /front|user|selfie|frontal|camera 0|camera 1/i.test(c.label))
              if (!targetCam) targetCam = cameras[0]
            }

            if (targetCam) {
              setCameraInfo(targetCam.label ? `${facingMode === 'environment' ? '📷' : '🤳'} ${targetCam.label.substring(0, 30)}` : '')
              stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: targetCam.deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false
              })
            }
          }
        } catch {
          // deviceId approach failed, continue to fallback
        }

        // Approach 2: facingMode constraint
        if (!stream) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: { exact: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
              audio: false
            })
            setCameraInfo(facingMode === 'environment' ? '📷 Câmera Traseira' : '🤳 Câmera Frontal')
          } catch {
            // exact failed, try without exact
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
              audio: false
            })
            setCameraInfo(facingMode === 'environment' ? '📷 Câmera' : '🤳 Câmera')
          }
        }

        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream

        // Verify we got the right camera by checking track settings
        const track = stream.getVideoTracks()[0]
        const settings = track.getSettings()
        if (settings.facingMode) {
          setCameraInfo(settings.facingMode === 'environment' ? '📷 Traseira Ativa' : '🤳 Frontal Ativa')
        }

        const video = document.createElement('video')
        video.setAttribute('playsinline', 'true')
        video.srcObject = stream
        video.muted = true
        await video.play()

        if (canvasRef.current) {
          canvasRef.current.width = video.videoWidth || 1280
          canvasRef.current.height = video.videoHeight || 720
        }

        // Process frames
        let busy = false
        const loop = async () => {
          if (cancelled) return
          if (!busy && poseRef.current && video.readyState === 4) {
            busy = true
            try { await poseRef.current.send({ image: video }) } catch {}
            busy = false
          }
          rafRef.current = requestAnimationFrame(loop)
        }
        rafRef.current = requestAnimationFrame(loop)

      } catch (e: any) {
        if (!cancelled) {
          setError(e.name === 'NotAllowedError' ? 'Permissão de câmera negada.' : e.name === 'NotFoundError' ? 'Câmera não encontrada.' : `Erro: ${e.message}`)
        }
      }
    }

    startCamera()

    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    }
  }, [isLive, loading, facingMode])

  // Video file
  useEffect(() => {
    if (!videoUrl || loading || !poseRef.current) return
    const v = videoRef.current; if (!v) return
    let interval: any = null, c = false
    const proc = async () => { if (poseRef.current && v.readyState >= 2 && !v.paused) try { await poseRef.current.send({ image: v }) } catch {} }
    const ready = () => { if (c) return; if (canvasRef.current) { canvasRef.current.width = v.videoWidth || 1280; canvasRef.current.height = v.videoHeight || 720 }; v.play().catch(() => {}); interval = setInterval(proc, 100) }
    v.addEventListener('canplay', ready); if (v.readyState >= 2) ready()
    return () => { c = true; v.removeEventListener('canplay', ready); if (interval) clearInterval(interval); v.pause() }
  }, [videoUrl, loading])

  if (error) return (
    <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-200">
      <p className="font-semibold">Erro</p><p className="text-sm mt-1">{error}</p>
      <button onClick={() => window.location.reload()} className="mt-3 px-4 py-2 bg-red-500/20 rounded-lg text-sm flex items-center gap-2"><RotateCcw className="w-4 h-4" /> Recarregar</button>
    </div>
  )

  return (
    <div className="relative w-full h-full">
      {loading && <div className="absolute inset-0 flex items-center justify-center bg-gym-dark/80 z-10 rounded-lg"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gym-accent mx-auto mb-4" /><p className="text-gym-text-secondary text-sm">Carregando IA...</p></div></div>}
      {videoUrl && <video ref={videoRef} src={videoUrl} className="hidden" autoPlay loop muted playsInline crossOrigin="anonymous" />}
      <canvas ref={canvasRef} className="w-full h-full rounded-lg object-contain" width={1280} height={720} />
      {detected && <div className="absolute top-2 left-2 bg-green-500/90 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> Pose Detectada</div>}
      {cameraInfo && isLive && <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-[10px]">{cameraInfo}</div>}
    </div>
  )
}
