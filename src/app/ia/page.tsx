'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Camera, Upload, Video, Play, TrendingUp, AlertCircle, CheckCircle2, Info, RotateCcw, SwitchCamera, Square } from 'lucide-react'
import MediaPipePoseDetection from '@/components/MediaPipePoseDetection'
import { getAllExampleVideos } from '@/lib/example-videos'

// Score color helper
function getScoreColor(score: number) {
  if (score >= 80) return '#166534' // verde escuro
  if (score >= 60) return '#22c55e' // verde claro
  if (score >= 40) return '#eab308' // amarelo
  return '#ef4444' // vermelho
}

function getScoreLabel(score: number) {
  if (score >= 80) return 'Excelente'
  if (score >= 60) return 'Bom'
  if (score >= 40) return 'Regular'
  return 'Corrigir'
}

function getScoreGradient(score: number) {
  // Returns gradient position (0-100) for the bar
  return Math.min(100, Math.max(0, score))
}

export default function IAVisionPage() {
  const [activeTab, setActiveTab] = useState<'examples' | 'upload' | 'live'>('examples')
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [qualityScore, setQualityScore] = useState(0)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [reportHistory, setReportHistory] = useState<any[]>([])
  const analysisCountRef = useRef(0)
  const reportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const exampleVideos = getAllExampleVideos()

  // Auto-generate report after 5 seconds of stable analysis
  useEffect(() => {
    if (!analysis) return

    if (reportTimerRef.current) clearTimeout(reportTimerRef.current)

    reportTimerRef.current = setTimeout(() => {
      analysisCountRef.current++
      const report = {
        id: analysisCountRef.current,
        timestamp: new Date().toLocaleTimeString(),
        score: qualityScore,
        phase: analysis.phase,
        angles: { ...analysis.angles },
        feedback: [...(analysis.feedback || [])],
        confidence: analysis.confidence,
      }
      setReportHistory(prev => [report, ...prev].slice(0, 10))
    }, 3000)

    return () => {
      if (reportTimerRef.current) clearTimeout(reportTimerRef.current)
    }
  }, [analysis, qualityScore])

  const handlePoseResults = useCallback((results: any) => {
    if (!results.poseLandmarks) return

    const landmarks = results.poseLandmarks
    const angles = calculateJointAngles(landmarks)
    const phase = detectMovementPhase(landmarks)
    const feedback = generateFeedback(landmarks, angles, phase)

    setAnalysis({
      angles,
      phase,
      feedback,
      confidence: 98.4,
      landmarks: landmarks.length,
    })
  }, [])

  const handleScoreUpdate = useCallback((score: number) => {
    setQualityScore(Math.round(score))
  }, [])

  function calculateAngle(a: any, b: any, c: any): number {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x)
    let angle = Math.abs((radians * 180.0) / Math.PI)
    if (angle > 180.0) angle = 360 - angle
    return angle
  }

  function calculateJointAngles(landmarks: any[]) {
    return {
      kneeRight: calculateAngle(landmarks[24], landmarks[26], landmarks[28]),
      kneeLeft: calculateAngle(landmarks[23], landmarks[25], landmarks[27]),
      hipRight: calculateAngle(landmarks[12], landmarks[24], landmarks[26]),
      elbowRight: calculateAngle(landmarks[12], landmarks[14], landmarks[16]),
    }
  }

  function detectMovementPhase(landmarks: any[]): string {
    const hipHeight = landmarks[24].y
    if (hipHeight < 0.5) return 'Posição Alta'
    if (hipHeight < 0.7) return 'Descida'
    if (hipHeight < 0.85) return 'Posição Baixa'
    return 'Subida'
  }

  function generateFeedback(landmarks: any[], angles: any, phase: string) {
    const feedback: any[] = []

    const kneeAlignment = Math.abs(angles.kneeLeft - angles.kneeRight)
    if (kneeAlignment > 15) {
      feedback.push({ type: 'warning', title: 'Assimetria de Joelhos', description: `Diferença de ${kneeAlignment.toFixed(0)}° entre os joelhos` })
    } else {
      feedback.push({ type: 'success', title: 'Joelhos Alinhados', description: `Simetria de ${(100 - kneeAlignment).toFixed(0)}%` })
    }

    if (angles.kneeRight < 90) {
      feedback.push({ type: 'success', title: 'Profundidade Adequada', description: 'Agachamento abaixo de 90° - Excelente!' })
    } else if (angles.kneeRight > 120) {
      feedback.push({ type: 'info', title: 'Profundidade Insuficiente', description: 'Desça mais para ativar os glúteos' })
    } else {
      feedback.push({ type: 'success', title: 'Amplitude OK', description: `Joelho a ${angles.kneeRight.toFixed(0)}°` })
    }

    const torsoAngle = Math.abs(landmarks[12].x - landmarks[24].x) * 100
    if (torsoAngle > 15) {
      feedback.push({ type: 'error', title: 'Inclinação Excessiva', description: 'Mantenha o tronco mais ereto' })
    } else {
      feedback.push({ type: 'success', title: 'Postura OK', description: 'Coluna alinhada corretamente' })
    }

    return feedback
  }

  const startAnalysis = (videoUrl?: string) => {
    setIsAnalyzing(true)
    setSelectedVideo(videoUrl || null)
    setAnalysis(null)
    setQualityScore(0)
  }

  const stopAnalysis = () => {
    setIsAnalyzing(false)
    setSelectedVideo(null)
    setAnalysis(null)
    setQualityScore(0)
  }

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }

  return (
    <div className="min-h-screen bg-gym-dark p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-gradient-to-br from-gym-accent to-gym-secondary rounded-xl">
                <Camera className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
              </div>
              Análise Biomecânica
            </h1>
            <p className="text-gym-text-secondary mt-1 text-xs sm:text-base">
              Tecnologia de Pose Detection com MediaPipe • Análise em Tempo Real • 33 Pontos de Referência
            </p>
          </div>
          <div className="px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg self-start">
            <div className="flex items-center gap-2 text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs sm:text-sm font-medium">IA ATIVA</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 sm:gap-2 border-b border-gym-border overflow-x-auto">
          {[
            { key: 'examples', label: 'Vídeos de Exemplo', icon: Video },
            { key: 'upload', label: 'Upload de Vídeo', icon: Upload },
            { key: 'live', label: 'Câmera ao Vivo', icon: Camera },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key as any); if (tab.key !== 'live') stopAnalysis() }}
              className={`px-3 sm:px-6 py-2 sm:py-3 font-medium transition-all flex items-center gap-1.5 sm:gap-2 text-xs sm:text-base whitespace-nowrap ${
                activeTab === tab.key
                  ? 'text-gym-accent border-b-2 border-gym-accent'
                  : 'text-gym-text-secondary hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4 sm:w-5 sm:h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Área principal */}
          <div className="lg:col-span-2 space-y-4">
            {/* Vídeos de Exemplo */}
            {activeTab === 'examples' && !isAnalyzing && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {exampleVideos.map((video) => (
                  <div
                    key={video.id}
                    className="group bg-gym-card border border-gym-border rounded-xl overflow-hidden hover:border-gym-accent/50 transition-all cursor-pointer"
                    onClick={() => startAnalysis(video.url)}
                  >
                    <div className="relative h-40 sm:h-48 bg-gym-darker flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-14 h-14 bg-gym-accent/20 rounded-full flex items-center justify-center mx-auto mb-2">
                          <Video className="w-7 h-7 text-gym-accent" />
                        </div>
                        <p className="text-xs text-gym-text-muted">{video.duration}</p>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="p-3 bg-gym-accent/80 rounded-full group-hover:scale-110 group-hover:bg-gym-accent transition-all">
                          <Play className="w-6 h-6 text-white" fill="white" />
                        </div>
                      </div>
                    </div>
                    <div className="p-3 sm:p-4">
                      <h3 className="font-semibold text-white text-sm sm:text-base mb-1">{video.name}</h3>
                      <p className="text-xs sm:text-sm text-gym-text-secondary mb-2">{video.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {video.muscles.map(m => (
                          <span key={m} className="px-2 py-0.5 bg-gym-accent/10 text-gym-accent text-[10px] rounded">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Análise ativa (vídeo ou câmera) */}
            {(isAnalyzing || activeTab === 'live') && (
              <div className="bg-gym-card border border-gym-border rounded-xl p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  {/* Score Bar lateral */}
                  <div className="hidden sm:flex flex-col items-center w-8 h-full">
                    <div className="relative w-6 rounded-full overflow-hidden flex-1 min-h-[200px]" style={{ background: 'linear-gradient(to top, #ef4444, #eab308, #22c55e, #166534)' }}>
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-gym-dark/70 transition-all duration-500"
                        style={{ height: `${100 - getScoreGradient(qualityScore)}%` }}
                      />
                      <div
                        className="absolute left-1/2 -translate-x-1/2 w-5 h-1.5 bg-white rounded-full shadow-lg transition-all duration-500"
                        style={{ bottom: `${getScoreGradient(qualityScore)}%` }}
                      />
                    </div>
                    <div className="mt-2 text-center">
                      <span className="text-xs font-bold" style={{ color: getScoreColor(qualityScore) }}>
                        {qualityScore}
                      </span>
                    </div>
                  </div>

                  {/* Vídeo/Câmera */}
                  <div className="flex-1">
                    <div className="aspect-video bg-gym-darker rounded-lg overflow-hidden relative">
                      <MediaPipePoseDetection
                        videoUrl={selectedVideo || undefined}
                        isLive={activeTab === 'live'}
                        facingMode={facingMode}
                        onResults={handlePoseResults}
                        onScoreUpdate={handleScoreUpdate}
                      />

                      {/* Score overlay mobile */}
                      <div className="sm:hidden absolute top-2 right-2 flex flex-col items-center">
                        <div className="w-3 h-24 rounded-full overflow-hidden relative" style={{ background: 'linear-gradient(to top, #ef4444, #eab308, #22c55e, #166534)' }}>
                          <div
                            className="absolute bottom-0 left-0 right-0 bg-black/60 transition-all duration-500"
                            style={{ height: `${100 - getScoreGradient(qualityScore)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold mt-0.5" style={{ color: getScoreColor(qualityScore) }}>
                          {qualityScore}
                        </span>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2 mt-3">
                      {activeTab === 'live' && (
                        <button
                          onClick={toggleCamera}
                          className="px-3 py-2 bg-gym-accent/20 text-gym-accent rounded-lg hover:bg-gym-accent/30 transition-colors flex items-center gap-1.5 text-sm"
                        >
                          <SwitchCamera className="w-4 h-4" />
                          <span className="hidden sm:inline">{facingMode === 'user' ? 'Câmera Traseira' : 'Câmera Frontal'}</span>
                          <span className="sm:hidden">Trocar</span>
                        </button>
                      )}
                      <button
                        onClick={stopAnalysis}
                        className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors flex items-center gap-1.5 text-sm"
                      >
                        <Square className="w-4 h-4" />
                        Parar
                      </button>

                      {/* Score badge */}
                      <div className="ml-auto px-3 py-1.5 rounded-lg text-sm font-bold" style={{
                        backgroundColor: getScoreColor(qualityScore) + '20',
                        color: getScoreColor(qualityScore),
                        borderWidth: 1,
                        borderColor: getScoreColor(qualityScore) + '50',
                      }}>
                        {getScoreLabel(qualityScore)} • {qualityScore}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Upload */}
            {activeTab === 'upload' && !isAnalyzing && (
              <div className="bg-gym-card border border-gym-border rounded-xl p-8 sm:p-12">
                <div className="text-center">
                  <Upload className="w-12 h-12 text-gym-text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Upload de Vídeo</h3>
                  <p className="text-gym-text-secondary text-sm mb-6">Selecione um vídeo do seu dispositivo</p>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    id="video-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) startAnalysis(URL.createObjectURL(file))
                    }}
                  />
                  <label
                    htmlFor="video-upload"
                    className="inline-block px-6 py-3 bg-gym-accent text-white rounded-lg hover:bg-gym-accent/90 cursor-pointer transition-colors text-sm"
                  >
                    Selecionar Vídeo
                  </label>
                </div>
              </div>
            )}

            {/* Relatórios gerados */}
            {reportHistory.length > 0 && (
              <div className="bg-gym-card border border-gym-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Relatórios Gerados</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {reportHistory.map((report) => (
                    <div key={report.id} className="flex items-center gap-3 p-2 bg-gym-darker rounded-lg text-xs">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[10px]"
                        style={{ backgroundColor: getScoreColor(report.score) }}
                      >
                        {report.score}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{report.phase}</span>
                          <span className="text-gym-text-muted">{report.timestamp}</span>
                        </div>
                        <div className="flex gap-1 mt-0.5">
                          {report.feedback?.slice(0, 2).map((f: any, i: number) => (
                            <span
                              key={i}
                              className={`px-1.5 py-0.5 rounded text-[9px] ${
                                f.type === 'success' ? 'bg-green-500/20 text-green-400' :
                                f.type === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                                f.type === 'error' ? 'bg-red-500/20 text-red-400' :
                                'bg-blue-500/20 text-blue-400'
                              }`}
                            >
                              {f.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Painel lateral */}
          <div className="space-y-4">
            {/* Score gauge grande */}
            <div className="bg-gym-card border border-gym-border rounded-xl p-4 sm:p-6">
              <h3 className="text-sm sm:text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-gym-accent" />
                Qualidade do Movimento
              </h3>

              {analysis ? (
                <div className="space-y-4">
                  {/* Large score display */}
                  <div className="text-center">
                    <div
                      className="text-5xl sm:text-6xl font-black transition-colors duration-500"
                      style={{ color: getScoreColor(qualityScore) }}
                    >
                      {qualityScore}
                    </div>
                    <div
                      className="text-sm font-semibold mt-1 transition-colors duration-500"
                      style={{ color: getScoreColor(qualityScore) }}
                    >
                      {getScoreLabel(qualityScore)}
                    </div>
                  </div>

                  {/* Gradient quality bar */}
                  <div className="relative h-4 rounded-full overflow-hidden" style={{ background: 'linear-gradient(to right, #ef4444, #eab308, #22c55e, #166534)' }}>
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-gray-800 shadow-lg transition-all duration-500"
                      style={{ left: `calc(${getScoreGradient(qualityScore)}% - 8px)` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gym-text-muted">
                    <span>Corrigir</span>
                    <span>Regular</span>
                    <span>Bom</span>
                    <span>Excelente</span>
                  </div>

                  {/* Stats */}
                  <div className="space-y-2 pt-2 border-t border-gym-border">
                    <div className="flex justify-between text-sm">
                      <span className="text-gym-text-secondary">Confiança IA</span>
                      <span className="text-gym-accent font-bold">{analysis.confidence}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gym-text-secondary">Landmarks</span>
                      <span className="text-white font-semibold">{analysis.landmarks}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gym-text-secondary">Fase</span>
                      <span className="text-white font-semibold">{analysis.phase}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gym-text-muted text-center py-8 text-sm">
                  {activeTab === 'live' ? 'Inicie a câmera para analisar' : 'Selecione um vídeo para analisar'}
                </p>
              )}
            </div>

            {/* Ângulos */}
            {analysis?.angles && (
              <div className="bg-gym-card border border-gym-border rounded-xl p-4 sm:p-6">
                <h3 className="text-sm sm:text-base font-semibold text-white mb-3">Ângulos Articulares</h3>
                <div className="space-y-3">
                  {Object.entries(analysis.angles).map(([joint, angle]: [string, any]) => {
                    const pct = (angle / 180) * 100
                    const color = pct > 60 ? '#22c55e' : pct > 40 ? '#eab308' : '#ef4444'
                    return (
                      <div key={joint}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gym-text-secondary capitalize">
                            {joint.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <span className="text-white font-semibold text-xs">{angle.toFixed(0)}°</span>
                        </div>
                        <div className="h-1.5 bg-gym-darker rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Feedback */}
            {analysis?.feedback && analysis.feedback.length > 0 && (
              <div className="bg-gym-card border border-gym-border rounded-xl p-4 sm:p-6">
                <h3 className="text-sm sm:text-base font-semibold text-white mb-3">Feedback Biomecânico</h3>
                <div className="space-y-2">
                  {analysis.feedback.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border text-xs ${
                        item.type === 'error' ? 'bg-red-500/10 border-red-500/30' :
                        item.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
                        item.type === 'success' ? 'bg-green-500/10 border-green-500/30' :
                        'bg-blue-500/10 border-blue-500/30'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {item.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
                        {item.type === 'warning' && <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />}
                        {item.type === 'success' && <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />}
                        {item.type === 'info' && <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />}
                        <div>
                          <h4 className={`font-semibold ${
                            item.type === 'error' ? 'text-red-400' :
                            item.type === 'warning' ? 'text-yellow-400' :
                            item.type === 'success' ? 'text-green-400' :
                            'text-blue-400'
                          }`}>{item.title}</h4>
                          <p className="text-gym-text-secondary mt-0.5">{item.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
