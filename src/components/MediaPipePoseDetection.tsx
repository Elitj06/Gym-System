'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

interface PoseDetectionProps {
  onResults?: (results: any) => void
  videoUrl?: string
  isLive?: boolean
}

export default function MediaPipePoseDetection({ 
  onResults, 
  videoUrl, 
  isLive = false 
}: PoseDetectionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [poseData, setPoseData] = useState<any>(null)
  const poseRef = useRef<any>(null)
  const cameraRef = useRef<any>(null)
  const animFrameRef = useRef<number>(0)

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
      // Dynamic import already loaded these
      const { drawConnectors, drawLandmarks } = (window as any).__drawingUtils || {}
      const { POSE_CONNECTIONS } = (window as any).__poseConnections || {}

      if (drawConnectors && POSE_CONNECTIONS) {
        drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
          color: '#00d4aa',
          lineWidth: 4,
        })
      }

      if (drawLandmarks) {
        drawLandmarks(ctx, results.poseLandmarks, {
          color: '#ff0364',
          lineWidth: 2,
          radius: 6,
        })
      }

      setPoseData(results.poseLandmarks)
      onResults?.(results)
    }

    ctx.restore()
  }, [onResults])

  // Initialize MediaPipe (dynamically)
  useEffect(() => {
    let cancelled = false

    const initPose = async () => {
      try {
        const [poseModule, drawingModule] = await Promise.all([
          import('@mediapipe/pose'),
          import('@mediapipe/drawing_utils'),
        ])

        if (cancelled) return

        // Store drawing utils globally for the callback
        ;(window as any).__drawingUtils = drawingModule
        ;(window as any).__poseConnections = { POSE_CONNECTIONS: poseModule.POSE_CONNECTIONS }

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
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: 'user' },
          audio: false,
        })

        if (cancelled) {
          stream.getTracks().forEach(t => t.stop())
          return
        }

        // Create hidden video element for webcam
        const video = document.createElement('video')
        video.srcObject = stream
        video.playsInline = true
        video.muted = true
        webcamVideoRef.current = video

        await video.play()

        const cameraUtilsModule = await import('@mediapipe/camera_utils')
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop())
          return
        }

        const cam = new cameraUtilsModule.Camera(video, {
          onFrame: async () => {
            if (poseRef.current && video.readyState === 4) {
              await poseRef.current.send({ image: video })
            }
          },
          width: 1280,
          height: 720,
        })

        cameraRef.current = cam
        cam.start()
      } catch (err: any) {
        console.error('Erro câmera:', err)
        if (!cancelled) {
          if (err.name === 'NotAllowedError') {
            setError('Permissão de câmera negada. Clique no ícone de câmera na barra do navegador e permita o acesso.')
          } else if (err.name === 'NotFoundError') {
            setError('Nenhuma câmera encontrada no dispositivo.')
          } else {
            setError(`Erro ao acessar câmera: ${err.message || 'Verifique as permissões.'}`)
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
        const tracks = (webcamVideoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach(t => t.stop())
        webcamVideoRef.current = null
      }
    }
  }, [isLive, isLoading])

  // Handle VIDEO playback
  useEffect(() => {
    if (!videoUrl || !videoRef.current || isLoading || !poseRef.current) return

    const video = videoRef.current
    let interval: NodeJS.Timeout | null = null

    const processFrame = async () => {
      if (poseRef.current && video.readyState >= 2 && !video.paused) {
        try {
          await poseRef.current.send({ image: video })
        } catch (e) { /* ignore frame errors */ }
      }
    }

    const onCanPlay = () => {
      setIsLoading(false)
      video.play().catch(() => {})
      interval = setInterval(processFrame, 100)
    }

    video.addEventListener('canplay', onCanPlay)
    
    // If already loaded
    if (video.readyState >= 2) {
      onCanPlay()
    }

    return () => {
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
        {isLive && (
          <button
            onClick={() => { setError(null); setIsLoading(true); }}
            className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm transition-colors"
          >
            Tentar novamente
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gym-dark/80 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gym-accent mx-auto mb-4"></div>
            <p className="text-gym-text-secondary">Carregando modelo de IA...</p>
          </div>
        </div>
      )}

      {/* Hidden video for pre-recorded content */}
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

      {/* Canvas for pose overlay */}
      <canvas
        ref={canvasRef}
        className="w-full h-full rounded-lg"
        width={1280}
        height={720}
      />

      {/* Pose detected indicator */}
      {poseData && (
        <div className="absolute top-4 left-4 bg-green-500/90 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          Pose Detectada (33 pontos)
        </div>
      )}
    </div>
  )
}
