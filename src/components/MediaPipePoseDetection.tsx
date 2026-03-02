'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { RotateCcw } from 'lucide-react'

interface Props {
  onResults?: (results: any) => void
  onScoreUpdate?: (score: number) => void
  videoUrl?: string
  isLive?: boolean
  facingMode?: 'user' | 'environment'
  active?: boolean
}

export default function MediaPipePoseDetection({ onResults, onScoreUpdate, videoUrl, isLive = false, facingMode = 'environment', active = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const poseRef = useRef<any>(null)
  const camRef = useRef<any>(null)
  const drawRef = useRef<any>(null)
  const connRef = useRef<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detected, setDetected] = useState(false)

  const calcScore = useCallback((lm: any[]) => {
    if (!lm || lm.length < 33) return 50
    const kp = [11,12,13,14,23,24,25,26,27,28]
    const vis = kp.reduce((s,i) => s + (lm[i]?.visibility||0), 0) / kp.length
    const sd = Math.abs((lm[11]?.y||0) - (lm[12]?.y||0))
    const hd = Math.abs((lm[23]?.y||0) - (lm[24]?.y||0))
    const sym = Math.max(0, 1 - (sd+hd)*5)
    const tilt = Math.abs((lm[12]?.x||0) - (lm[24]?.x||0))
    const post = Math.max(0, 1 - tilt*3)
    const score = Math.min(100, Math.max(0, vis*40 + sym*30 + post*30))
    onScoreUpdate?.(score)
    return score
  }, [onScoreUpdate])

  const onPose = useCallback((r: any) => {
    if (!canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return
    ctx.save()
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    ctx.drawImage(r.image, 0, 0, canvasRef.current.width, canvasRef.current.height)
    if (r.poseLandmarks) {
      if (drawRef.current?.drawConnectors && connRef.current) drawRef.current.drawConnectors(ctx, r.poseLandmarks, connRef.current, { color: '#00d4aa', lineWidth: 3 })
      if (drawRef.current?.drawLandmarks) drawRef.current.drawLandmarks(ctx, r.poseLandmarks, { color: '#ff0364', lineWidth: 2, radius: 5 })
      calcScore(r.poseLandmarks)
      setDetected(true)
      onResults?.(r)
    }
    ctx.restore()
  }, [onResults, calcScore])

  // Init MediaPipe
  useEffect(() => {
    let c = false
    ;(async () => {
      try {
        const [pm, dm] = await Promise.all([import('@mediapipe/pose'), import('@mediapipe/drawing_utils')])
        if (c) return
        drawRef.current = dm; connRef.current = pm.POSE_CONNECTIONS
        const pose = new pm.Pose({ locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` })
        pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, enableSegmentation: false, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 })
        pose.onResults(onPose)
        poseRef.current = pose
        setLoading(false)
      } catch { if (!c) setError('Erro ao carregar IA.') }
    })()
    return () => { c = true }
  }, [onPose])

  // Stop everything when not active
  useEffect(() => {
    if (!active) {
      if (camRef.current) { camRef.current.stop(); camRef.current = null }
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    }
  }, [active])

  // Camera
  useEffect(() => {
    if (!isLive || loading || !poseRef.current || !active) return
    let c = false
    ;(async () => {
      try {
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
        const mobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
        let stream: MediaStream
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: mobile ? { exact: facingMode } : facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
          })
        } catch {
          // Fallback: sem exact
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })
        }
        if (c) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        const v = document.createElement('video')
        v.setAttribute('playsinline','true'); v.setAttribute('muted','true'); v.srcObject = stream; v.muted = true
        await v.play()
        if (canvasRef.current) { canvasRef.current.width = v.videoWidth||1280; canvasRef.current.height = v.videoHeight||720 }
        const cu = await import('@mediapipe/camera_utils')
        if (c) { stream.getTracks().forEach(t => t.stop()); return }
        const cam = new cu.Camera(v, {
          onFrame: async () => { if (poseRef.current && v.readyState===4) try { await poseRef.current.send({image:v}) } catch{} },
          width: v.videoWidth||1280, height: v.videoHeight||720
        })
        camRef.current = cam; cam.start()
      } catch (e: any) {
        if (!c) setError(e.name==='NotAllowedError' ? 'Permissão negada. Permita acesso à câmera.' : e.name==='NotFoundError' ? 'Câmera não encontrada.' : `Erro: ${e.message}`)
      }
    })()
    return () => { c=true; if(camRef.current){camRef.current.stop();camRef.current=null} if(streamRef.current){streamRef.current.getTracks().forEach(t=>t.stop());streamRef.current=null} }
  }, [isLive, loading, facingMode, active])

  // Video
  useEffect(() => {
    if (!videoUrl || loading || !poseRef.current || !active) return
    const v = videoRef.current; if(!v) return
    let interval: any=null, c=false
    const proc = async () => { if(poseRef.current && v.readyState>=2 && !v.paused) try{await poseRef.current.send({image:v})}catch{} }
    const ready = () => { if(c)return; if(canvasRef.current){canvasRef.current.width=v.videoWidth||1280;canvasRef.current.height=v.videoHeight||720} v.play().catch(()=>{}); interval=setInterval(proc,100) }
    v.addEventListener('canplay',ready); if(v.readyState>=2) ready()
    return () => { c=true; v.removeEventListener('canplay',ready); if(interval)clearInterval(interval); v.pause() }
  }, [videoUrl, loading, active])

  if (error) return (
    <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-200">
      <p className="font-semibold">Erro</p><p className="text-sm mt-1">{error}</p>
      <button onClick={()=>{setError(null);setLoading(true)}} className="mt-3 px-4 py-2 bg-red-500/20 rounded-lg text-sm flex items-center gap-2"><RotateCcw className="w-4 h-4"/>Tentar novamente</button>
    </div>
  )

  return (
    <div className="relative w-full h-full">
      {loading && <div className="absolute inset-0 flex items-center justify-center bg-gym-dark/80 z-10 rounded-lg"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gym-accent mx-auto mb-4"/><p className="text-gym-text-secondary text-sm">Carregando IA...</p></div></div>}
      {videoUrl && <video ref={videoRef} src={videoUrl} className="hidden" autoPlay loop muted playsInline crossOrigin="anonymous"/>}
      <canvas ref={canvasRef} className="w-full h-full rounded-lg object-contain" width={1280} height={720}/>
      {detected && <div className="absolute top-2 left-2 bg-green-500/90 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"/>Pose Detectada</div>}
    </div>
  )
}
