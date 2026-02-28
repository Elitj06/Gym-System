'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import Webcam from 'react-webcam'
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose'
import { Camera } from '@mediapipe/camera_utils'
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils'

interface PoseDetectionProps {
  onResults?: (results: any) => void
  videoUrl?: string // Para análise de vídeo pré-gravado
  isLive?: boolean  // Para câmera ao vivo
}

export default function MediaPipePoseDetection({ 
  onResults, 
  videoUrl, 
  isLive = false 
}: PoseDetectionProps) {
  const webcamRef = useRef<Webcam>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [poseData, setPoseData] = useState<any>(null)
  const poseRef = useRef<Pose | null>(null)

  // Função para desenhar os resultados
  const onPoseResults = useCallback((results: any) => {
    if (!canvasRef.current) return

    const canvasElement = canvasRef.current
    const canvasCtx = canvasElement.getContext('2d')
    if (!canvasCtx) return

    canvasCtx.save()
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height)

    // Desenhar a imagem de fundo
    canvasCtx.drawImage(
      results.image,
      0,
      0,
      canvasElement.width,
      canvasElement.height
    )

    // Desenhar os landmarks e conexões se detectados
    if (results.poseLandmarks) {
      // Conexões (linhas entre pontos)
      drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
        color: '#00d4aa',
        lineWidth: 4,
      })

      // Landmarks (pontos)
      drawLandmarks(canvasCtx, results.poseLandmarks, {
        color: '#ff0364',
        lineWidth: 2,
        radius: 6,
      })

      setPoseData(results.poseLandmarks)
      
      // Callback para análise externa
      if (onResults) {
        onResults(results)
      }
    }

    canvasCtx.restore()
  }, [onResults])

  // Inicializar MediaPipe Pose
  useEffect(() => {
    const pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
      },
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

    return () => {
      if (poseRef.current) {
        poseRef.current.close()
      }
    }
  }, [onPoseResults])

  // Processar webcam ao vivo
  useEffect(() => {
    if (!isLive || !webcamRef.current || !poseRef.current || isLoading) return

    const videoElement = webcamRef.current.video
    if (!videoElement) return

    const camera = new Camera(videoElement, {
      onFrame: async () => {
        if (poseRef.current && videoElement.readyState === 4) {
          await poseRef.current.send({ image: videoElement })
        }
      },
      width: 1280,
      height: 720,
    })

    camera.start().catch((err) => {
      console.error('Erro ao iniciar câmera:', err)
      setError('Erro ao acessar câmera. Verifique as permissões.')
    })

    return () => {
      camera.stop()
    }
  }, [isLive, isLoading])

  // Processar vídeo pré-gravado
  useEffect(() => {
    if (!videoUrl || !videoRef.current || !poseRef.current) return

    const videoElement = videoRef.current

    const processVideo = async () => {
      if (poseRef.current && videoElement.readyState >= 2) {
        await poseRef.current.send({ image: videoElement })
      }
    }

    videoElement.addEventListener('loadeddata', () => {
      setIsLoading(false)
    })

    // Processar cada frame do vídeo
    const interval = setInterval(processVideo, 100) // ~10 FPS para análise

    return () => {
      clearInterval(interval)
    }
  }, [videoUrl])

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-200">
        <p className="font-semibold">Erro</p>
        <p className="text-sm mt-1">{error}</p>
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

      {/* Webcam ao vivo */}
      {isLive && (
        <Webcam
          ref={webcamRef}
          className="hidden"
          screenshotFormat="image/jpeg"
          videoConstraints={{
            width: 1280,
            height: 720,
            facingMode: 'user',
          }}
        />
      )}

      {/* Vídeo pré-gravado */}
      {videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          className="hidden"
          autoPlay
          loop
          muted
          playsInline
        />
      )}

      {/* Canvas para desenhar detecções */}
      <canvas
        ref={canvasRef}
        className="w-full h-full rounded-lg"
        width={1280}
        height={720}
      />

      {/* Indicador de pose detectada */}
      {poseData && (
        <div className="absolute top-4 left-4 bg-green-500/90 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          Pose Detectada (33 pontos)
        </div>
      )}
    </div>
  )
}
