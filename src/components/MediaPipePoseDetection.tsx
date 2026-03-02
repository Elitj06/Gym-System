'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { RotateCcw } from 'lucide-react'

interface PoseDetectionProps {
  onResults?: (results: any) => void
  onScoreUpdate?: (score: number) => void
  videoUrl?: string
  isLive?: boolean
  facingMode?: 'user' | 'environment'
}

export default function MediaPipePoseDetection({
  onResults,
  onScoreUpdate,
  videoUrl,
  isLive = false,
  facingMode = 'environment',
}: PoseDetectionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [poseData, setPoseData] = useState<any>(null)
  const poseRef = useRef<any>(null)
  const cameraRef = useRef<any>(null)
  const drawingRef = useRef<any>(null)
  const connectionsRef = useRef<any>(null)
  const scoreRef = useRef(0)

  // Calculate quality score from landmarks
  const calculateScore = useCallback((landmarks: any[]) => {
    if (!landmarks || landmarks.length < 33) return 50

    // Visibility score (average visibility of key points)
    const keyPoints = [11, 12, 13, 14, 23, 24, 25, 26, 27, 28]
    const avgVisibility = keyPoints.reduce((sum, i) => sum + (landmarks[i]?.visibility || 0), 0) / keyPoints.length

    // Symmetry score (compare left/right)
    const shoulderDiff = Math.abs((landmarks[11]?.y || 0) - (landmarks[12]?.y || 0))
    const hipDiff = Math.abs((landmarks[23]?.y || 0) - (landmarks[24]?.y || 0))
    const symmetryScore = Math.max(0, 1 - (shoulderDiff + hipDiff) * 5)

    // Posture score (shoulder-hip-knee alignment)
    const shoulder = landmarks[12]
    const hip = landmarks[24]
    const knee = landmarks[26]
    if (shoulder && hip && knee) {
      const torsoLean = Math.abs(shoulder.x - hip.x)
      const postureScore = Math.max(0, 1 - torsoLean * 3)

      const rawScore = (avgVisibility * 40 + symmetryScore * 30 + postureScore * 30)
      const score = Math.min(100, Math.max(0, rawScore))
      scoreRef.current = score
      onScoreUpdate?.(score)
      return score
    }

    const score = avgVisibility * 100
    scoreRef.current = score
    onScoreUpdate?.(score)
    return score
  }, [onScoreUpdate])

  // Draw results on canvas
  const onPoseResults = useCallback((results: any) => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.save()
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height)

    if (results.poseLandmarks) {
      const drawing = drawingRef.current
      const connections = connectionsRef.current

      if (drawing?.drawConnectors && connections) {
        drawing.drawConnectors(ctx, results.poseLandmarks, connections, {
          color: '#00d4aa',
          lineWidth: 3,
        })
      }

      if (drawing?.drawLandmarks) {
        drawing.drawLandmarks(ctx, results.poseLandmarks, {
          color: '#ff0364',
          lineWidth: 2,
          radius: 5,
        })
      }

      const score = calculateScore(results.poseLandmarks)
      setPoseData({ landmarks: results.poseLandmarks, score })
      onResults?.(results)
    }

    ctx.restore()
  }, [onResults, calculateScore])

  // Initialize MediaPipe
  useEffect(() => {
    let cancelled = false

    const initPose = async () => {
      try {
        const [poseModule, drawingModule] = await Promise.all([
          import('@mediapipe/pose'),
          import('@mediapipe/drawing_utils'),
        ])

        if (cancelled) return

        drawingRef.current = drawingModule
        connectionsRef.current = poseModule.POSE_CONNECTIONS

        const pose = new poseModule.Pose({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        })

        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })

        pose.onResults(onPoseResults)
        poseRef.current = pose
        setIsLoading(false)
      } catch (err) {
        console.error('Erro ao carregar MediaPipe:', err)
        if (!cancelled) setError('Erro ao carregar modelo de IA.')
      }
    }

    initPose()
    return () => { cancelled = true }
  }, [onPoseResults])

  // Handle LIVE camera
  useEffect(() => {
    if (!isLive || isLoading || !poseRef.current) return

    let cancelled = false

    const startCamera = async () => {
      try {
        // Stop any existing stream
        if (webcamVideoRef.current?.srcObject) {
          (webcamVideoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop())
        }

        const constraints: MediaStreamConstraints = {
          video: {
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            facingMode: facingMode,
            frameRate: { ideal: 30 },
          },
          audio: false,
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints)

        if (cancelled) {
          stream.getTracks().forEach(t => t.stop())
          return
        }

        const video = document.createElement('video')
        video.setAttribute('playsinline', 'true')
        video.setAttribute('muted', 'true')
        video.srcObject = stream
        video.muted = true
        webcamVideoRef.current = video

        await video.play()

        // Update canvas size to match video
        if (canvasRef.current) {
          canvasRef.current.width = video.videoWidth || 1280
          canvasRef.current.height = video.videoHeight || 720
        }

        const cameraUtilsModule = await import('@mediapipe/camera_utils')
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop())
          return
        }

        const cam = new cameraUtilsModule.Camera(video, {
          onFrame: async () => {
            if (poseRef.current && video.readyState === 4) {
              try {
                await poseRef.current.send({ image: video })
              } catch (e) { /* frame skip */ }
            }
          },
          width: video.videoWidth || 1280,
          height: video.videoHeight || 720,
        })

        cameraRef.current = cam
        cam.start()
      } catch (err: any) {
        console.error('Erro câmera:', err)
        if (!cancelled) {
          if (err.name === 'NotAllowedError') {
            setError('Permissão de câmera negada. Permita o acesso nas configurações do navegador.')
          } else if (err.name === 'NotFoundError') {
            setError('Nenhuma câmera encontrada neste dispositivo.')
          } else if (err.name === 'OverconstrainedError') {
            setError('Câmera não suporta a resolução solicitada. Tentando resolução menor...')
          } else {
            setError(`Erro ao acessar câmera: ${err.message}`)
          }
        }
      }
    }

    startCamera()

    return () => {
      cancelled = true
      if (cameraRef.current) {
        cameraRef.current.stop()
        cameraRef.current = null
      }
      if (webcamVideoRef.current?.srcObject) {
        (webcamVideoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop())
        webcamVideoRef.current = null
      }
    }
  }, [isLive, isLoading, facingMode])

  // Handle VIDEO playback
  useEffect(() => {
    if (!videoUrl || isLoading || !poseRef.current) return

    const video = videoRef.current
    if (!video) return

    let interval: ReturnType<typeof setInterval> | null = null
    let cancelled = false

    const processFrame = async () => {
      if (poseRef.current && video && video.readyState >= 2 && !video.paused) {
        try {
          await poseRef.current.send({ image: video })
        } catch (e) { /* skip */ }
      }
    }

    const onCanPlay = () => {
      if (cancelled) return
      if (canvasRef.current && video) {
        canvasRef.current.width = video.videoWidth || 1280
        canvasRef.current.height = video.videoHeight || 720
      }
      video.play().catch(() => {})
      interval = setInterval(processFrame, 100)
    }

    video.addEventListener('canplay', onCanPlay)
    if (video.readyState >= 2) onCanPlay()

    return () => {
      cancelled = true
      video.removeEventListener('canplay', onCanPlay)
      if (interval) clearInterval(interval)
      video.pause()
    }
  }, [videoUrl, isLoading])

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-200">
        <p className="font-semibold">Erro</p>
        <p className="text-sm mt-1">{error}</p>
        <button
          onClick={() => { setError(null); setIsLoading(true) }}
          className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm transition-colors flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" /> Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gym-dark/80 z-10 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gym-accent mx-auto mb-4"></div>
            <p className="text-gym-text-secondary text-sm">Carregando modelo de IA...</p>
          </div>
        </div>
      )}

      {videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          className="hidden"
          autoPlay
          loop
          muted
          playsInline
          crossOrigin="anonymous"
        />
      )}

      <canvas
        ref={canvasRef}
        className="w-full h-full rounded-lg object-contain"
        width={1280}
        height={720}
      />

      {poseData && (
        <div className="absolute top-2 left-2 bg-green-500/90 text-white px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
          Pose Detectada (33 pts)
        </div>
      )}
    </div>
  )
}
