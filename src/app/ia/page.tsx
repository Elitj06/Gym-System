'use client'

import { useState, useRef } from 'react'
import { Brain, Upload, Play, Camera, ScanLine, Result, CheckCircle2, AlertTriangle, FileText, ChevronRight, Activity, ArrowRight } from 'lucide-react'

export default function IAPage() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      // Create a local blob URL for the uploaded file preview
      const url = URL.createObjectURL(e.target.files[0])
      setSelectedFile(url)
      setShowResults(false)
      setIsScanning(false)
    }
  }

  const startAnalysis = () => {
    setIsScanning(true)
    // Simulate AI processing time
    setTimeout(() => {
      setIsScanning(false)
      setShowResults(true)
    }, 3500)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-gym-secondary p-6 rounded-2xl border border-gym-border relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gym-accent/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 bg-gradient-to-br from-gym-accent to-gym-info rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(0,212,170,0.3)]">
            <Brain className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              IA Vision <span className="text-[10px] uppercase tracking-wider bg-gym-accent/20 text-gym-accent px-2 py-0.5 rounded-full border border-gym-accent/30">Beta</span>
            </h1>
            <p className="text-gym-text-secondary text-sm">Análise biomecânica avançada usando Inteligência Artificial e Visão Computacional</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Area: Upload & Display */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gym-secondary border border-gym-border rounded-xl overflow-hidden relative min-h-[400px] flex flex-col">
            {!selectedFile ? (
              <div
                className="flex-1 flex flex-col items-center justify-center p-12 border-2 border-dashed border-gym-border m-4 rounded-xl hover:border-gym-accent/50 hover:bg-gym-dark/50 transition-all cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-16 h-16 bg-gym-dark rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform group-hover:bg-gym-accent/10 group-hover:text-gym-accent">
                  <Upload className="w-8 h-8 text-gym-text-secondary group-hover:text-gym-accent" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Faça upload de um vídeo ou foto</h3>
                <p className="text-gym-text-secondary text-center text-sm max-w-sm mb-6">
                  Arraste e solte o vídeo de execução do exercício (agachamento, supino, etc) para receber análise biomecânica em tempo real.
                </p>
                <button className="bg-gym-surface border border-gym-border text-white px-6 py-2 rounded-lg font-medium hover:bg-gym-accent hover:text-black hover:border-gym-accent transition-colors flex items-center gap-2">
                  <Camera className="w-4 h-4" /> Selecionar Arquivo
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="video/*,image/*"
                  onChange={handleFileChange}
                />
              </div>
            ) : (
              <div className="relative flex-1 bg-black flex items-center justify-center">
                {/* Media Preview */}
                <img
                  src={selectedFile}
                  alt="Preview do Exercício"
                  className={`max-w-full max-h-[500px] object-contain transition-opacity duration-500 ${isScanning ? 'opacity-50 grayscale' : ''}`}
                />

                {/* Simulated Scanning Animation */}
                {isScanning && (
                  <>
                    <div className="absolute inset-0 bg-gym-accent/5" />
                    <div className="absolute top-0 left-0 w-full h-1 bg-gym-accent shadow-[0_0_15px_#00d4aa] animate-[scan_2s_ease-in-out_infinite_alternate]" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                      <ScanLine className="w-16 h-16 text-gym-accent animate-pulse mb-4" />
                      <p className="text-gym-accent font-mono font-medium tracking-widest animate-pulse border border-gym-accent/30 bg-black/50 px-4 py-2 rounded-lg">PROCESSANDO VETORES NEURAIS...</p>
                    </div>
                  </>
                )}

                {/* Overlaid Joint Lines if Results show (Simulation) */}
                {showResults && (
                  <div className="absolute inset-0 pointer-events-none opacity-80" style={{ backgroundImage: 'radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.8) 100%)' }}>
                    {/* Fake skeleton vectors */}
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <line x1="45" y1="30" x2="50" y2="50" stroke="#00d4aa" strokeWidth="0.5" className="animate-[dash_2s_linear_forwards] stroke-dasharray-[100] stroke-dashoffset-[100]" />
                      <line x1="55" y1="30" x2="50" y2="50" stroke="#00d4aa" strokeWidth="0.5" className="animate-[dash_2s_linear_forwards] stroke-dasharray-[100] stroke-dashoffset-[100] delay-100" />
                      <line x1="50" y1="50" x2="50" y2="70" stroke="#00d4aa" strokeWidth="0.5" className="animate-[dash_2s_linear_forwards] stroke-dasharray-[100] stroke-dashoffset-[100] delay-200" />
                      <circle cx="45" cy="30" r="1.5" fill="#00d4aa" className="animate-pulse" />
                      <circle cx="55" cy="30" r="1.5" fill="#00d4aa" className="animate-pulse" />
                      <circle cx="50" cy="50" r="1.5" fill="#00d4aa" className="animate-pulse" />
                      <circle cx="50" cy="70" r="1.5" fill="#00d4aa" className="animate-pulse" />

                      {/* Warning box for posture */}
                      <rect x="42" y="45" width="16" height="10" fill="none" stroke="#f5a623" strokeWidth="0.5" strokeDasharray="1 1" className="animate-pulse" />
                    </svg>
                  </div>
                )}

                <button
                  onClick={() => { setSelectedFile(null); setShowResults(false) }}
                  className="absolute top-4 right-4 bg-black/60 hover:bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors backdrop-blur-sm border border-white/10"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Action Bar */}
            {selectedFile && !isScanning && !showResults && (
              <div className="p-4 border-t border-gym-border bg-gym-secondary flex justify-between items-center">
                <span className="text-sm text-gym-text-secondary flex items-center gap-2"><FileText className="w-4 h-4" /> Arquivo carregado com sucesso</span>
                <button
                  onClick={startAnalysis}
                  className="bg-gradient-to-r from-gym-accent to-gym-info text-black font-semibold px-6 py-2.5 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity shadow-[0_0_15px_rgba(0,212,170,0.2)]"
                >
                  <Brain className="w-4 h-4" /> Iniciar Análise Biomecânica
                </button>
              </div>
            )}

            {showResults && (
              <div className="p-4 border-t border-gym-border bg-green-500/10 flex justify-between items-center">
                <span className="text-sm text-green-400 font-medium flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Análise concluída com sucesso (2.4s)</span>
                <button
                  onClick={() => { setSelectedFile(null); setShowResults(false) }}
                  className="text-gym-text-secondary hover:text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Nova Análise
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Area: Results & Analytics */}
        <div className="space-y-6">
          <div className="bg-gym-secondary border border-gym-border rounded-xl p-6 relative h-full flex flex-col">
            <h3 className="text-lg font-bold text-white mb-6 border-b border-gym-border pb-4 w-full flex items-center gap-2">
              <Activity className="w-5 h-5 text-gym-info" />
              Diagnóstico IA
            </h3>

            {!selectedFile || isScanning ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-gym-text-secondary h-full min-h-[300px]">
                <Brain className={`w-12 h-12 mb-4 ${isScanning ? 'animate-bounce text-gym-accent' : 'opacity-20'}`} />
                <p>{isScanning ? 'Avaliando ângulos, vetores e velocidade...' : 'Faça o upload do vídeo e inicie a análise para ver o diagnóstico.'}</p>
              </div>
            ) : showResults ? (
              <div className="space-y-6 flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Overall Score */}
                <div className="flex items-center gap-4 bg-gym-surface p-4 rounded-xl border border-gym-border">
                  <div className="w-16 h-16 rounded-full border-4 border-gym-accent flex items-center justify-center bg-gym-dark">
                    <span className="text-xl font-bold text-white">85<span className="text-sm text-gym-accent">%</span></span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Score de Execução</h4>
                    <p className="text-xs text-gym-text-secondary">Conformidade com os padrões anatômicos ideais (Classificação: Bom).</p>
                  </div>
                </div>

                {/* Detected Exercise */}
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-gym-text-secondary mb-3 font-semibold">Reconhecimento</h4>
                  <div className="bg-gym-dark rounded-lg p-3 border border-gym-border flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Agachamento Livre (Barbell Squat)</p>
                      <p className="text-xs text-gym-text-secondary">Confiança da IA: 98.4%</p>
                    </div>
                    <div className="bg-gym-info/20 text-gym-info px-2 py-1 rounded text-xs font-mono">12 REPS</div>
                  </div>
                </div>

                {/* Feedback List */}
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-gym-text-secondary mb-3 font-semibold">Feedbacks Biomecânicos</h4>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-red-200">Extensão Lombar (Butt Wink)</p>
                        <p className="text-xs text-red-500/80 mt-1">Detectada leve retroversão pélvica no final da fase excêntrica. Cuidado com a pressão nos discos lombares.</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3 bg-green-500/10 p-3 rounded-lg border border-green-500/20">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-green-200">Postura Cervical</p>
                        <p className="text-xs text-green-500/80 mt-1">Alinhamento perfeito com a coluna torácica preservado durante toda a execução.</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
                      <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-yellow-200">Velocidade (Fase Cadente)</p>
                        <p className="text-xs text-yellow-500/80 mt-1">A fase excêntrica (descida) está durando apenas 0.8s. Recomendado aumentar para 2 a 3 segundos para maior hipertrofia.</p>
                      </div>
                    </li>
                  </ul>
                </div>

                <button className="w-full mt-4 bg-gym-surface hover:bg-gym-hover border border-gym-border text-white px-4 py-3 rounded-xl transition-colors flex items-center justify-center gap-2 group text-sm font-medium">
                  Salvar Avaliação no Perfil do Aluno <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-gym-text-secondary h-full cursor-not-allowed min-h-[300px]">
                <p>Por favor inicie a análise primeiro.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Custom styles injected for the scanning animation */}
      <style dangerouslySetInnerHTML={{
        __html: `
@keyframes scan {
  0% { transform: translateY(0); }
  100% { transform: translateY(500px); }
}
@keyframes dash {
  to {
    stroke-dashoffset: 0;
  }
}
`}} />
    </div>
  )
}
