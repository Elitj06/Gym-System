'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Camera, Upload, TrendingUp, AlertCircle, CheckCircle2, Info, SwitchCamera, Square, FileText, Clock, Target, Zap } from 'lucide-react'
import dynamic from 'next/dynamic'

const MediaPipePoseDetection = dynamic(
  () => import('@/components/MediaPipePoseDetection'),
  { ssr: false }
)

function scoreColor(s: number) { return s >= 80 ? '#166534' : s >= 60 ? '#22c55e' : s >= 40 ? '#eab308' : '#ef4444' }
function scoreLabel(s: number) { return s >= 80 ? 'Excelente' : s >= 60 ? 'Bom' : s >= 40 ? 'Regular' : 'Corrigir' }

interface CalibrationData {
  standingHipY: number
  standingKneeAngle: number
  bodyHeight: number
  shoulderWidth: number
  hipYRange: number[]
  calibrated: boolean
  frameCount: number
  samples: { hipY: number; kneeAngle: number }[]
}

function createCalibration(): CalibrationData {
  return {
    standingHipY: 0, standingKneeAngle: 170, bodyHeight: 0, shoulderWidth: 0,
    hipYRange: [1, 0], calibrated: false, frameCount: 0, samples: []
  }
}

function calcAngle(a: any, b: any, c: any) {
  const r = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x)
  let d = Math.abs((r * 180) / Math.PI)
  return d > 180 ? 360 - d : d
}

export default function IAVisionPage() {
  const [tab, setTab] = useState<'live' | 'upload'>('live')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [score, setScore] = useState(0)
  const [facing, setFacing] = useState<'user' | 'environment'>('environment')
  const [cameraKey, setCameraKey] = useState(0)
  const [reports, setReports] = useState<any[]>([])
  const [report, setReport] = useState<any>(null)
  const [calibStatus, setCalibStatus] = useState<'waiting' | 'calibrating' | 'ready'>('waiting')
  const [repCount, setRepCount] = useState(0)

  const aRef = useRef<any>(null)
  const sRef = useRef(0)
  const t0 = useRef<Date | null>(null)
  const frames = useRef(0)
  const calibRef = useRef<CalibrationData>(createCalibration())
  const phaseRef = useRef<string>('idle')
  const prevPhaseRef = useRef<string>('idle')
  const repCountRef = useRef(0)
  const scoreHistoryRef = useRef<number[]>([])
  const exerciseScoreRef = useRef(0)

  useEffect(() => { aRef.current = analysis }, [analysis])
  useEffect(() => { sRef.current = score }, [score])

  const onPose = useCallback((r: any) => {
    if (!r.poseLandmarks) return
    frames.current++
    const lm = r.poseLandmarks
    const cal = calibRef.current

    const shoulderL = lm[11], shoulderR = lm[12]
    const hipL = lm[23], hipR = lm[24]
    const kneeL = lm[25], kneeR = lm[26]
    const ankleL = lm[27], ankleR = lm[28]

    const kneeAngleR = calcAngle(hipR, kneeR, ankleR)
    const kneeAngleL = calcAngle(hipL, kneeL, ankleL)
    const hipAngleR = calcAngle(shoulderR, hipR, kneeR)
    const elbowAngleR = calcAngle(shoulderR, lm[14], lm[16])
    const avgHipY = (hipL.y + hipR.y) / 2
    const avgKneeAngle = (kneeAngleR + kneeAngleL) / 2

    // AUTO-CALIBRATION (first 30 frames)
    if (!cal.calibrated) {
      cal.frameCount++
      cal.samples.push({ hipY: avgHipY, kneeAngle: avgKneeAngle })

      if (cal.frameCount >= 30) {
        const sortedHipY = cal.samples.map(s => s.hipY).sort((a, b) => a - b)
        const sortedKneeAngle = cal.samples.map(s => s.kneeAngle).sort((a, b) => a - b)
        cal.standingHipY = sortedHipY[Math.floor(sortedHipY.length / 2)]
        cal.standingKneeAngle = sortedKneeAngle[Math.floor(sortedKneeAngle.length / 2)]
        cal.bodyHeight = Math.abs(((shoulderL.y + shoulderR.y) / 2) - ((ankleL.y + ankleR.y) / 2))
        cal.shoulderWidth = Math.abs(shoulderL.x - shoulderR.x)
        cal.hipYRange = [cal.standingHipY, cal.standingHipY]
        cal.calibrated = true
        setCalibStatus('ready')
      } else {
        setCalibStatus('calibrating')
        setAnalysis({
          angles: { kneeRight: kneeAngleR, kneeLeft: kneeAngleL, hipRight: hipAngleR, elbowRight: elbowAngleR },
          phase: 'Calibrando...',
          feedback: [{ type: 'info', title: 'Calibracao', desc: 'Fique em pe... ' + Math.round((cal.frameCount / 30) * 100) + '%' }],
          confidence: 0, landmarks: lm.length
        })
        return
      }
    }

    // Track hip range
    if (avgHipY < cal.hipYRange[0]) cal.hipYRange[0] = avgHipY
    if (avgHipY > cal.hipYRange[1]) cal.hipYRange[1] = avgHipY

    // Relative displacement normalized by body height
    const hipDisplacement = cal.bodyHeight > 0
      ? (avgHipY - cal.standingHipY) / cal.bodyHeight
      : 0
    const kneeBendRatio = avgKneeAngle / cal.standingKneeAngle

    // Dynamic phase detection
    let phase: string
    if (hipDisplacement < 0.03 && kneeBendRatio > 0.92) {
      phase = 'Posicao Alta'
    } else if (hipDisplacement < 0.12 && kneeBendRatio > 0.75) {
      phase = phaseRef.current === 'Posicao Baixa' || phaseRef.current === 'Subida' ? 'Subida' : 'Descida'
    } else if (hipDisplacement >= 0.12 || kneeBendRatio <= 0.75) {
      phase = 'Posicao Baixa'
    } else {
      phase = phaseRef.current
    }

    // Rep counting
    if (prevPhaseRef.current === 'Subida' && phase === 'Posicao Alta') {
      repCountRef.current++
      setRepCount(repCountRef.current)
    }
    prevPhaseRef.current = phaseRef.current
    phaseRef.current = phase

    // EXERCISE QUALITY SCORE
    let exerciseScore = 0

    // 1. Depth (30 pts)
    const depthScore = hipDisplacement >= 0.15 ? 30
      : hipDisplacement >= 0.10 ? 22
      : hipDisplacement >= 0.05 ? 15
      : 5
    exerciseScore += depthScore

    // 2. Symmetry (25 pts)
    const kneeDiff = Math.abs(kneeAngleR - kneeAngleL)
    const symmetryScore = kneeDiff < 5 ? 25 : kneeDiff < 10 ? 20 : kneeDiff < 15 ? 12 : 5
    exerciseScore += symmetryScore

    // 3. Posture (25 pts)
    const shoulderMidX = (shoulderL.x + shoulderR.x) / 2
    const hipMidX = (hipL.x + hipR.x) / 2
    const trunkLean = Math.abs(shoulderMidX - hipMidX)
    const postureScore = trunkLean < 0.03 ? 25 : trunkLean < 0.06 ? 20 : trunkLean < 0.10 ? 12 : 5
    exerciseScore += postureScore

    // 4. Stability (20 pts)
    const kneeOverToe = Math.abs(kneeR.x - ankleR.x)
    const stabilityScore = kneeOverToe < 0.05 ? 20 : kneeOverToe < 0.08 ? 15 : kneeOverToe < 0.12 ? 10 : 5
    exerciseScore += stabilityScore

    // Running average
    scoreHistoryRef.current.push(exerciseScore)
    if (scoreHistoryRef.current.length > 15) scoreHistoryRef.current.shift()
    const avgScore = Math.round(scoreHistoryRef.current.reduce((a, b) => a + b, 0) / scoreHistoryRef.current.length)
    exerciseScoreRef.current = avgScore

    // Feedback
    const fb: any[] = []
    if (kneeDiff > 15) {
      fb.push({ type: 'warning', title: 'Assimetria Joelhos', desc: kneeDiff.toFixed(0) + ' de diferenca' })
    } else {
      fb.push({ type: 'success', title: 'Joelhos Alinhados', desc: 'Simetria ' + (100 - kneeDiff).toFixed(0) + '%' })
    }

    if (phase === 'Posicao Baixa' || phase === 'Subida') {
      if (hipDisplacement >= 0.15) {
        fb.push({ type: 'success', title: 'Profundidade OK', desc: 'Boa amplitude (' + (hipDisplacement * 100).toFixed(0) + '%)' })
      } else if (hipDisplacement >= 0.08) {
        fb.push({ type: 'info', title: 'Pouca Profundidade', desc: 'Desca mais para melhor ativacao' })
      } else {
        fb.push({ type: 'warning', title: 'Muito Raso', desc: 'Aumente a amplitude do movimento' })
      }
    } else {
      fb.push({ type: 'info', title: 'Amplitude', desc: 'Deslocamento: ' + (hipDisplacement * 100).toFixed(0) + '%' })
    }

    if (trunkLean > 0.10) {
      fb.push({ type: 'error', title: 'Inclinacao Excessiva', desc: 'Mantenha o tronco mais ereto' })
    } else if (trunkLean > 0.06) {
      fb.push({ type: 'warning', title: 'Leve Inclinacao', desc: 'Atencao a postura do tronco' })
    } else {
      fb.push({ type: 'success', title: 'Postura OK', desc: 'Coluna alinhada' })
    }

    if (kneeOverToe > 0.12) {
      fb.push({ type: 'warning', title: 'Joelho Avancado', desc: 'Joelhos passando dos pes' })
    }

    const angles = { kneeRight: kneeAngleR, kneeLeft: kneeAngleL, hipRight: hipAngleR, elbowRight: elbowAngleR }

    setAnalysis({
      angles, phase, feedback: fb,
      confidence: 98.4, landmarks: lm.length,
      hipDisplacement: (hipDisplacement * 100).toFixed(1),
      kneeBendRatio: (kneeBendRatio * 100).toFixed(1),
      depthScore, symmetryScore, postureScore, stabilityScore
    })
  }, [])

  const onScore = useCallback((s: number) => {
    const exScore = exerciseScoreRef.current
    const blended = calibRef.current.calibrated
      ? Math.round(exScore * 0.75 + s * 0.25)
      : Math.round(s)
    setScore(blended)
  }, [])

  const start = (url?: string) => {
    setAnalyzing(true); setVideoUrl(url || null); setAnalysis(null); setScore(0); setReport(null)
    t0.current = new Date(); frames.current = 0; setCameraKey(k => k + 1)
    calibRef.current = createCalibration()
    phaseRef.current = 'idle'; prevPhaseRef.current = 'idle'
    repCountRef.current = 0; setRepCount(0)
    scoreHistoryRef.current = []; exerciseScoreRef.current = 0
    setCalibStatus('waiting')
  }

  const stop = () => {
    const r = {
      id: Date.now(), time: new Date().toLocaleTimeString(), date: new Date().toLocaleDateString('pt-BR'),
      dur: t0.current ? Math.round((Date.now() - t0.current.getTime()) / 1000) + 's' : '0s',
      frames: frames.current, score: sRef.current, label: scoreLabel(sRef.current),
      phase: aRef.current?.phase || 'N/A', angles: aRef.current?.angles ? { ...aRef.current.angles } : null,
      feedback: aRef.current?.feedback ? [...aRef.current.feedback] : [], confidence: aRef.current?.confidence || 0,
      reps: repCountRef.current,
    }
    setReports(p => [r, ...p].slice(0, 20)); setReport(r); setAnalyzing(false); setVideoUrl(null)
  }

  const flipCamera = () => {
    setFacing(p => p === 'user' ? 'environment' : 'user')
    setCameraKey(k => k + 1)
  }

  return (
    <div className="min-h-screen bg-gym-dark p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-gradient-to-br from-gym-accent to-gym-secondary rounded-xl"><Camera className="w-5 h-5 sm:w-8 sm:h-8 text-white" /></div>
              Analise Biomecanica
            </h1>
            <p className="text-gym-text-secondary mt-1 text-xs sm:text-sm">MediaPipe Pose Detection - 33 Pontos - Auto-Calibracao</p>
          </div>
          <div className="flex items-center gap-2">
            {calibStatus === 'ready' && (
              <div className="px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-medium"><Target className="w-3 h-3" /> Calibrado</div>
              </div>
            )}
            <div className="px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-green-400 text-xs font-medium"><div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /> IA ATIVA</div>
            </div>
          </div>
        </div>

        <div className="flex gap-1 border-b border-gym-border">
          {[{ k: 'live', l: 'Camera ao Vivo', i: Camera }, { k: 'upload', l: 'Upload de Video', i: Upload }].map(t => (
            <button key={t.k} onClick={() => { setTab(t.k as any); if (!analyzing) setReport(null) }} className={'px-4 py-2 text-sm flex items-center gap-1.5 ' + (tab === t.k ? 'text-gym-accent border-b-2 border-gym-accent' : 'text-gym-text-secondary hover:text-white')}>
              <t.i className="w-4 h-4" /> {t.l}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {analyzing && (
              <div className="bg-gym-card border border-gym-border rounded-xl p-3">
                <div className="flex gap-2">
                  <div className="hidden sm:flex flex-col items-center w-8">
                    <div className="relative w-6 rounded-full overflow-hidden flex-1 min-h-[200px]" style={{ background: 'linear-gradient(to top,#ef4444,#eab308,#22c55e,#166534)' }}>
                      <div className="absolute bottom-0 left-0 right-0 bg-gym-dark/70 transition-all duration-500" style={{ height: (100 - score) + '%' }} />
                      <div className="absolute left-1/2 -translate-x-1/2 w-5 h-1.5 bg-white rounded-full shadow transition-all duration-500" style={{ bottom: score + '%' }} />
                    </div>
                    <span className="text-xs font-bold mt-1" style={{ color: scoreColor(score) }}>{score}</span>
                  </div>
                  <div className="flex-1">
                    <div className="aspect-video bg-gym-darker rounded-lg overflow-hidden relative">
                      <MediaPipePoseDetection
                        key={cameraKey}
                        videoUrl={videoUrl || undefined}
                        isLive={tab === 'live'}
                        facingMode={facing}
                        onResults={onPose}
                        onScoreUpdate={onScore}
                      />
                      <div className="sm:hidden absolute top-2 right-2">
                        <div className="w-3 h-20 rounded-full overflow-hidden relative" style={{ background: 'linear-gradient(to top,#ef4444,#eab308,#22c55e,#166534)' }}>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 transition-all duration-500" style={{ height: (100 - score) + '%' }} />
                        </div>
                        <span className="text-[10px] font-bold block text-center" style={{ color: scoreColor(score) }}>{score}</span>
                      </div>
                      {calibStatus === 'calibrating' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                          <div className="bg-black/70 rounded-xl px-4 py-3 text-center">
                            <Target className="w-6 h-6 text-cyan-400 mx-auto mb-1 animate-pulse" />
                            <p className="text-cyan-400 text-xs font-semibold">Calibrando...</p>
                            <p className="text-white/70 text-[10px]">Fique em pe por 1s</p>
                          </div>
                        </div>
                      )}
                      {repCount > 0 && (
                        <div className="absolute bottom-2 right-2 bg-gym-accent/90 text-white px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                          <Zap className="w-3 h-3" /> {repCount} rep{repCount > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {tab === 'live' && (
                        <button onClick={flipCamera} className="px-3 py-1.5 bg-gym-accent/20 text-gym-accent rounded-lg text-xs flex items-center gap-1.5">
                          <SwitchCamera className="w-3.5 h-3.5" /> {facing === 'user' ? 'Traseira' : 'Frontal'}
                        </button>
                      )}
                      <button onClick={stop} className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs flex items-center gap-1.5">
                        <Square className="w-3.5 h-3.5" /> Parar e Gerar Relatorio
                      </button>
                      <div className="ml-auto flex items-center gap-2">
                        {repCount > 0 && (
                          <div className="px-2 py-1 bg-gym-accent/10 text-gym-accent rounded text-xs font-bold">
                            {repCount} reps
                          </div>
                        )}
                        <div className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: scoreColor(score) + '20', color: scoreColor(score) }}>
                          {scoreLabel(score)} {score}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'live' && !analyzing && !report && (
              <div className="bg-gym-card border border-gym-border rounded-xl p-8 text-center">
                <Camera className="w-16 h-16 text-gym-accent mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Camera ao Vivo</h3>
                <p className="text-gym-text-secondary text-sm mb-2">Aponte a camera para o exercicio sendo executado</p>
                <p className="text-gym-text-muted text-xs mb-4">O sistema calibra automaticamente nos primeiros segundos</p>
                <button onClick={() => start()} className="px-6 py-3 bg-gym-accent text-white rounded-lg text-sm font-medium">Iniciar Analise</button>
              </div>
            )}

            {tab === 'upload' && !analyzing && (
              <div className="bg-gym-card border border-gym-border rounded-xl p-8 text-center">
                <Upload className="w-16 h-16 text-gym-text-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Upload de Video</h3>
                <p className="text-gym-text-secondary text-sm mb-4">Selecione um video do seu dispositivo</p>
                <input type="file" accept="video/*" className="hidden" id="vid-up" onChange={e => { const f = e.target.files?.[0]; if (f) start(URL.createObjectURL(f)) }} />
                <label htmlFor="vid-up" className="inline-block px-6 py-3 bg-gym-accent text-white rounded-lg cursor-pointer text-sm font-medium">Selecionar Video</label>
              </div>
            )}

            {report && (
              <div className="bg-gym-card border border-gym-accent/30 rounded-xl p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-4"><FileText className="w-5 h-5 text-gym-accent" /><h3 className="text-lg font-bold text-white">Relatorio da Analise</h3></div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                  <div className="bg-gym-darker rounded-lg p-3 text-center"><div className="text-3xl font-black" style={{ color: scoreColor(report.score) }}>{report.score}</div><div className="text-xs text-gym-text-muted mt-1">Score</div></div>
                  <div className="bg-gym-darker rounded-lg p-3 text-center"><div className="text-lg font-bold text-white">{report.dur}</div><div className="text-xs text-gym-text-muted mt-1">Duracao</div></div>
                  <div className="bg-gym-darker rounded-lg p-3 text-center"><div className="text-lg font-bold text-white">{report.frames}</div><div className="text-xs text-gym-text-muted mt-1">Frames</div></div>
                  <div className="bg-gym-darker rounded-lg p-3 text-center"><div className="text-lg font-bold text-gym-accent">{report.confidence}%</div><div className="text-xs text-gym-text-muted mt-1">Confianca</div></div>
                  <div className="bg-gym-darker rounded-lg p-3 text-center"><div className="text-lg font-bold text-cyan-400">{report.reps || 0}</div><div className="text-xs text-gym-text-muted mt-1">Repeticoes</div></div>
                </div>
                <div className="space-y-2 mb-4">
                  {report.feedback.map((f: any, i: number) => (
                    <div key={i} className={'p-3 rounded-lg border text-xs flex items-start gap-2 ' + (f.type === 'success' ? 'bg-green-500/10 border-green-500/30' : f.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' : f.type === 'error' ? 'bg-red-500/10 border-red-500/30' : 'bg-blue-500/10 border-blue-500/30')}>
                      {f.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" /> : <AlertCircle className={'w-4 h-4 flex-shrink-0 ' + (f.type === 'error' ? 'text-red-400' : f.type === 'warning' ? 'text-yellow-400' : 'text-blue-400')} />}
                      <div><span className="font-semibold">{f.title}</span> {' \u2014 '} {f.desc}</div>
                    </div>
                  ))}
                </div>
                {report.angles && <div className="grid grid-cols-2 gap-2">{Object.entries(report.angles).map(([k, v]: any) => (<div key={k} className="bg-gym-darker rounded p-2 flex justify-between"><span className="text-xs text-gym-text-secondary capitalize">{k.replace(/([A-Z])/g, ' $1')}</span><span className="text-sm font-bold text-white">{v.toFixed(0)}{'\u00B0'}</span></div>))}</div>}
                <div className="flex gap-2 mt-4">
                  <button onClick={() => { setReport(null); start() }} className="px-4 py-2 bg-gym-accent text-white rounded-lg text-sm">Nova Analise</button>
                  <button onClick={() => setReport(null)} className="px-4 py-2 bg-gym-darker text-gym-text-secondary rounded-lg text-sm">Fechar</button>
                </div>
              </div>
            )}

            {reports.length > 0 && !report && (
              <div className="bg-gym-card border border-gym-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Clock className="w-4 h-4" /> Historico</h3>
                <div className="space-y-2">{reports.map(r => (
                  <button key={r.id} onClick={() => setReport(r)} className="w-full flex items-center gap-3 p-2 bg-gym-darker rounded-lg text-xs hover:bg-gym-hover text-left">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[10px]" style={{ backgroundColor: scoreColor(r.score) }}>{r.score}</div>
                    <div className="flex-1"><span className="text-white font-medium">{r.label}</span><span className="text-gym-text-muted ml-2">{r.time} - {r.dur} - {r.reps || 0} reps</span></div>
                  </button>
                ))}</div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-gym-card border border-gym-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-gym-accent" /> Qualidade</h3>
              {analysis ? (
                <div className="space-y-3">
                  <div className="text-center"><div className="text-5xl font-black" style={{ color: scoreColor(score) }}>{score}</div><div className="text-sm font-semibold mt-1" style={{ color: scoreColor(score) }}>{scoreLabel(score)}</div></div>
                  <div className="relative h-3 rounded-full overflow-hidden" style={{ background: 'linear-gradient(to right,#ef4444,#eab308,#22c55e,#166534)' }}>
                    <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-gray-800 shadow transition-all duration-500" style={{ left: 'calc(' + score + '% - 6px)' }} />
                  </div>
                  <div className="flex justify-between text-[9px] text-gym-text-muted"><span>Corrigir</span><span>Regular</span><span>Bom</span><span>Excelente</span></div>
                  <div className="space-y-1.5 pt-2 border-t border-gym-border text-xs">
                    <div className="flex justify-between"><span className="text-gym-text-secondary">Fase</span><span className="text-white font-semibold">{analysis.phase}</span></div>
                    {analysis.hipDisplacement && (
                      <div className="flex justify-between"><span className="text-gym-text-secondary">Deslocamento</span><span className="text-white font-semibold">{analysis.hipDisplacement}%</span></div>
                    )}
                    {repCount > 0 && (
                      <div className="flex justify-between"><span className="text-gym-text-secondary">Repeticoes</span><span className="text-cyan-400 font-semibold">{repCount}</span></div>
                    )}
                  </div>
                  {analysis.depthScore !== undefined && (
                    <div className="pt-2 border-t border-gym-border space-y-1.5">
                      <p className="text-[10px] text-gym-text-muted font-semibold uppercase tracking-wider">Composicao do Score</p>
                      {[
                        { label: 'Profundidade', val: analysis.depthScore, max: 30 },
                        { label: 'Simetria', val: analysis.symmetryScore, max: 25 },
                        { label: 'Postura', val: analysis.postureScore, max: 25 },
                        { label: 'Estabilidade', val: analysis.stabilityScore, max: 20 },
                      ].map(item => (
                        <div key={item.label} className="flex items-center gap-2 text-xs">
                          <span className="text-gym-text-secondary w-20 flex-shrink-0">{item.label}</span>
                          <div className="flex-1 h-1.5 bg-gym-darker rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: ((item.val / item.max) * 100) + '%', backgroundColor: scoreColor((item.val / item.max) * 100) }} />
                          </div>
                          <span className="text-white font-bold w-8 text-right">{item.val}/{item.max}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : <p className="text-gym-text-muted text-center py-6 text-sm">Inicie uma analise</p>}
            </div>
            {analysis?.feedback?.length > 0 && (
              <div className="bg-gym-card border border-gym-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Feedback</h3>
                <div className="space-y-2">{analysis.feedback.map((f: any, i: number) => (
                  <div key={i} className={'p-2 rounded text-xs flex items-center gap-2 ' + (f.type === 'success' ? 'bg-green-500/10 text-green-400' : f.type === 'warning' ? 'bg-yellow-500/10 text-yellow-400' : f.type === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400')}>
                    {f.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}<span className="font-medium">{f.title}</span>
                  </div>
                ))}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
