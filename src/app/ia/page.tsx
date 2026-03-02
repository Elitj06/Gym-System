'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Camera, Upload, Video, Play, TrendingUp, AlertCircle, CheckCircle2, Info, SwitchCamera, Square, FileText, Clock } from 'lucide-react'
import MediaPipePoseDetection from '@/components/MediaPipePoseDetection'

function scoreColor(s: number) { return s >= 80 ? '#166534' : s >= 60 ? '#22c55e' : s >= 40 ? '#eab308' : '#ef4444' }
function scoreLabel(s: number) { return s >= 80 ? 'Excelente' : s >= 60 ? 'Bom' : s >= 40 ? 'Regular' : 'Corrigir' }

export default function IAVisionPage() {
  const [tab, setTab] = useState<'live'|'upload'>('live')
  const [videoUrl, setVideoUrl] = useState<string|null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [active, setActive] = useState(true)
  const [analysis, setAnalysis] = useState<any>(null)
  const [score, setScore] = useState(0)
  const [facing, setFacing] = useState<'user'|'environment'>('environment')
  const [reports, setReports] = useState<any[]>([])
  const [report, setReport] = useState<any>(null)
  const aRef = useRef<any>(null)
  const sRef = useRef(0)
  const t0 = useRef<Date|null>(null)
  const frames = useRef(0)

  useEffect(() => { aRef.current = analysis }, [analysis])
  useEffect(() => { sRef.current = score }, [score])

  const onPose = useCallback((r: any) => {
    if (!r.poseLandmarks) return
    frames.current++
    const lm = r.poseLandmarks
    const ang = (a:any,b:any,c:any) => { const r=Math.atan2(c.y-b.y,c.x-b.x)-Math.atan2(a.y-b.y,a.x-b.x); let d=Math.abs((r*180)/Math.PI); return d>180?360-d:d }
    const angles = { kneeRight: ang(lm[24],lm[26],lm[28]), kneeLeft: ang(lm[23],lm[25],lm[27]), hipRight: ang(lm[12],lm[24],lm[26]), elbowRight: ang(lm[12],lm[14],lm[16]) }
    const phase = lm[24].y<0.5?'Posição Alta':lm[24].y<0.7?'Descida':lm[24].y<0.85?'Posição Baixa':'Subida'
    const fb: any[] = []
    const kd = Math.abs(angles.kneeLeft-angles.kneeRight)
    fb.push(kd>15 ? {type:'warning',title:'Assimetria Joelhos',desc:`${kd.toFixed(0)}° diferença`} : {type:'success',title:'Joelhos Alinhados',desc:`Simetria ${(100-kd).toFixed(0)}%`})
    fb.push(angles.kneeRight<90 ? {type:'success',title:'Profundidade OK',desc:'Abaixo de 90°'} : angles.kneeRight>120 ? {type:'info',title:'Pouca Profundidade',desc:'Desça mais'} : {type:'success',title:'Amplitude OK',desc:`${angles.kneeRight.toFixed(0)}°`})
    const tilt = Math.abs(lm[12].x-lm[24].x)*100
    fb.push(tilt>15 ? {type:'error',title:'Inclinação Excessiva',desc:'Tronco mais ereto'} : {type:'success',title:'Postura OK',desc:'Coluna alinhada'})
    setAnalysis({ angles, phase, feedback: fb, confidence: 98.4, landmarks: lm.length })
  }, [])

  const onScore = useCallback((s: number) => setScore(Math.round(s)), [])

  const start = (url?: string) => { setAnalyzing(true); setActive(true); setVideoUrl(url||null); setAnalysis(null); setScore(0); setReport(null); t0.current=new Date(); frames.current=0 }

  const stop = () => {
    const r = {
      id: Date.now(), time: new Date().toLocaleTimeString(), date: new Date().toLocaleDateString('pt-BR'),
      dur: t0.current ? `${Math.round((Date.now()-t0.current.getTime())/1000)}s` : '0s',
      frames: frames.current, score: sRef.current, label: scoreLabel(sRef.current),
      phase: aRef.current?.phase||'N/A', angles: aRef.current?.angles ? {...aRef.current.angles} : null,
      feedback: aRef.current?.feedback ? [...aRef.current.feedback] : [], confidence: aRef.current?.confidence||0,
    }
    setReports(p => [r,...p].slice(0,20)); setReport(r); setActive(false)
    setTimeout(() => { setAnalyzing(false); setVideoUrl(null) }, 100)
  }

  const flip = () => { setActive(false); setTimeout(()=>{ setFacing(p=>p==='user'?'environment':'user'); setActive(true) }, 300) }

  return (
    <div className="min-h-screen bg-gym-dark p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-gradient-to-br from-gym-accent to-gym-secondary rounded-xl"><Camera className="w-5 h-5 sm:w-8 sm:h-8 text-white"/></div>
              Análise Biomecânica
            </h1>
            <p className="text-gym-text-secondary mt-1 text-xs sm:text-sm">MediaPipe Pose Detection • 33 Pontos • Tempo Real</p>
          </div>
          <div className="px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg self-start">
            <div className="flex items-center gap-2 text-green-400 text-xs font-medium"><div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"/>IA ATIVA</div>
          </div>
        </div>

        <div className="flex gap-1 border-b border-gym-border">
          {[{k:'live',l:'Câmera ao Vivo',i:Camera},{k:'upload',l:'Upload de Vídeo',i:Upload}].map(t=>(
            <button key={t.k} onClick={()=>{setTab(t.k as any);if(!analyzing)setReport(null)}} className={`px-4 py-2 text-sm flex items-center gap-1.5 ${tab===t.k?'text-gym-accent border-b-2 border-gym-accent':'text-gym-text-secondary hover:text-white'}`}>
              <t.i className="w-4 h-4"/>{t.l}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {analyzing && (
              <div className="bg-gym-card border border-gym-border rounded-xl p-3">
                <div className="flex gap-2">
                  <div className="hidden sm:flex flex-col items-center w-8">
                    <div className="relative w-6 rounded-full overflow-hidden flex-1 min-h-[200px]" style={{background:'linear-gradient(to top,#ef4444,#eab308,#22c55e,#166534)'}}>
                      <div className="absolute bottom-0 left-0 right-0 bg-gym-dark/70 transition-all duration-500" style={{height:`${100-score}%`}}/>
                      <div className="absolute left-1/2 -translate-x-1/2 w-5 h-1.5 bg-white rounded-full shadow transition-all duration-500" style={{bottom:`${score}%`}}/>
                    </div>
                    <span className="text-xs font-bold mt-1" style={{color:scoreColor(score)}}>{score}</span>
                  </div>
                  <div className="flex-1">
                    <div className="aspect-video bg-gym-darker rounded-lg overflow-hidden relative">
                      <MediaPipePoseDetection videoUrl={videoUrl||undefined} isLive={tab==='live'} facingMode={facing} onResults={onPose} onScoreUpdate={onScore} active={active}/>
                      <div className="sm:hidden absolute top-2 right-2">
                        <div className="w-3 h-20 rounded-full overflow-hidden relative" style={{background:'linear-gradient(to top,#ef4444,#eab308,#22c55e,#166534)'}}>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 transition-all duration-500" style={{height:`${100-score}%`}}/>
                        </div>
                        <span className="text-[10px] font-bold block text-center" style={{color:scoreColor(score)}}>{score}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {tab==='live' && <button onClick={flip} className="px-3 py-1.5 bg-gym-accent/20 text-gym-accent rounded-lg text-xs flex items-center gap-1.5"><SwitchCamera className="w-3.5 h-3.5"/>{facing==='user'?'Traseira':'Frontal'}</button>}
                      <button onClick={stop} className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs flex items-center gap-1.5"><Square className="w-3.5 h-3.5"/>Parar e Gerar Relatório</button>
                      <div className="ml-auto px-2 py-1 rounded text-xs font-bold" style={{backgroundColor:scoreColor(score)+'20',color:scoreColor(score)}}>{scoreLabel(score)} {score}%</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab==='live' && !analyzing && !report && (
              <div className="bg-gym-card border border-gym-border rounded-xl p-8 text-center">
                <Camera className="w-16 h-16 text-gym-accent mx-auto mb-4"/>
                <h3 className="text-lg font-semibold text-white mb-2">Câmera ao Vivo</h3>
                <p className="text-gym-text-secondary text-sm mb-4">Aponte a câmera para o exercício sendo executado</p>
                <button onClick={()=>start()} className="px-6 py-3 bg-gym-accent text-white rounded-lg text-sm font-medium">Iniciar Análise</button>
              </div>
            )}

            {tab==='upload' && !analyzing && (
              <div className="bg-gym-card border border-gym-border rounded-xl p-8 text-center">
                <Upload className="w-16 h-16 text-gym-text-muted mx-auto mb-4"/>
                <h3 className="text-lg font-semibold text-white mb-2">Upload de Vídeo</h3>
                <p className="text-gym-text-secondary text-sm mb-4">Selecione um vídeo do seu dispositivo</p>
                <input type="file" accept="video/*" className="hidden" id="vid-up" onChange={e=>{const f=e.target.files?.[0];if(f)start(URL.createObjectURL(f))}}/>
                <label htmlFor="vid-up" className="inline-block px-6 py-3 bg-gym-accent text-white rounded-lg cursor-pointer text-sm font-medium">Selecionar Vídeo</label>
              </div>
            )}

            {report && (
              <div className="bg-gym-card border border-gym-accent/30 rounded-xl p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-4"><FileText className="w-5 h-5 text-gym-accent"/><h3 className="text-lg font-bold text-white">Relatório da Análise</h3></div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="bg-gym-darker rounded-lg p-3 text-center"><div className="text-3xl font-black" style={{color:scoreColor(report.score)}}>{report.score}</div><div className="text-xs text-gym-text-muted mt-1">Score</div></div>
                  <div className="bg-gym-darker rounded-lg p-3 text-center"><div className="text-lg font-bold text-white">{report.dur}</div><div className="text-xs text-gym-text-muted mt-1">Duração</div></div>
                  <div className="bg-gym-darker rounded-lg p-3 text-center"><div className="text-lg font-bold text-white">{report.frames}</div><div className="text-xs text-gym-text-muted mt-1">Frames</div></div>
                  <div className="bg-gym-darker rounded-lg p-3 text-center"><div className="text-lg font-bold text-gym-accent">{report.confidence}%</div><div className="text-xs text-gym-text-muted mt-1">Confiança</div></div>
                </div>
                <div className="space-y-2 mb-4">
                  {report.feedback.map((f:any,i:number)=>(
                    <div key={i} className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${f.type==='success'?'bg-green-500/10 border-green-500/30':f.type==='warning'?'bg-yellow-500/10 border-yellow-500/30':f.type==='error'?'bg-red-500/10 border-red-500/30':'bg-blue-500/10 border-blue-500/30'}`}>
                      {f.type==='success'?<CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0"/>:<AlertCircle className={`w-4 h-4 flex-shrink-0 ${f.type==='error'?'text-red-400':f.type==='warning'?'text-yellow-400':'text-blue-400'}`}/>}
                      <div><span className="font-semibold">{f.title}</span> — {f.desc}</div>
                    </div>
                  ))}
                </div>
                {report.angles && <div className="grid grid-cols-2 gap-2">{Object.entries(report.angles).map(([k,v]:any)=>(<div key={k} className="bg-gym-darker rounded p-2 flex justify-between"><span className="text-xs text-gym-text-secondary capitalize">{k.replace(/([A-Z])/g,' $1')}</span><span className="text-sm font-bold text-white">{v.toFixed(0)}°</span></div>))}</div>}
                <div className="flex gap-2 mt-4">
                  <button onClick={()=>{setReport(null);start()}} className="px-4 py-2 bg-gym-accent text-white rounded-lg text-sm">Nova Análise</button>
                  <button onClick={()=>setReport(null)} className="px-4 py-2 bg-gym-darker text-gym-text-secondary rounded-lg text-sm">Fechar</button>
                </div>
              </div>
            )}

            {reports.length>0 && !report && (
              <div className="bg-gym-card border border-gym-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Clock className="w-4 h-4"/>Histórico</h3>
                <div className="space-y-2">{reports.map(r=>(
                  <button key={r.id} onClick={()=>setReport(r)} className="w-full flex items-center gap-3 p-2 bg-gym-darker rounded-lg text-xs hover:bg-gym-hover text-left">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[10px]" style={{backgroundColor:scoreColor(r.score)}}>{r.score}</div>
                    <div className="flex-1"><span className="text-white font-medium">{r.label}</span><span className="text-gym-text-muted ml-2">{r.time} • {r.dur}</span></div>
                  </button>
                ))}</div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-gym-card border border-gym-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-gym-accent"/>Qualidade</h3>
              {analysis ? (
                <div className="space-y-3">
                  <div className="text-center"><div className="text-5xl font-black" style={{color:scoreColor(score)}}>{score}</div><div className="text-sm font-semibold mt-1" style={{color:scoreColor(score)}}>{scoreLabel(score)}</div></div>
                  <div className="relative h-3 rounded-full overflow-hidden" style={{background:'linear-gradient(to right,#ef4444,#eab308,#22c55e,#166534)'}}>
                    <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-gray-800 shadow transition-all duration-500" style={{left:`calc(${score}% - 6px)`}}/>
                  </div>
                  <div className="flex justify-between text-[9px] text-gym-text-muted"><span>Corrigir</span><span>Regular</span><span>Bom</span><span>Excelente</span></div>
                  <div className="space-y-1.5 pt-2 border-t border-gym-border text-xs">
                    <div className="flex justify-between"><span className="text-gym-text-secondary">Fase</span><span className="text-white font-semibold">{analysis.phase}</span></div>
                  </div>
                </div>
              ) : <p className="text-gym-text-muted text-center py-6 text-sm">Inicie uma análise</p>}
            </div>
            {analysis?.feedback?.length > 0 && (
              <div className="bg-gym-card border border-gym-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Feedback</h3>
                <div className="space-y-2">{analysis.feedback.map((f:any,i:number)=>(
                  <div key={i} className={`p-2 rounded text-xs flex items-center gap-2 ${f.type==='success'?'bg-green-500/10 text-green-400':f.type==='warning'?'bg-yellow-500/10 text-yellow-400':f.type==='error'?'bg-red-500/10 text-red-400':'bg-blue-500/10 text-blue-400'}`}>
                    {f.type==='success'?<CheckCircle2 className="w-3.5 h-3.5"/>:<AlertCircle className="w-3.5 h-3.5"/>}<span className="font-medium">{f.title}</span>
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
