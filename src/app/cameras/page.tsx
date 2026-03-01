'use client'

import { useState, useEffect } from 'react'
import { Video, Plus, Settings, Play, Pause, Trash2, Edit, CheckCircle2, XCircle, MapPin } from 'lucide-react'

interface Camera {
  id: string
  name: string
  location: string
  rtspUrl: string
  isActive: boolean
  resolution: string
  fps: number
  cameraType: string
}

export default function CamerasPage() {
  const [cameras, setCameras] = useState<Camera[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    rtspUrl: '',
    username: '',
    password: '',
    resolution: '1080p',
    fps: 30,
  })

  useEffect(() => {
    loadCameras()
  }, [])

  const loadCameras = async () => {
    try {
      const response = await fetch('/api/cameras')
      const data = await response.json()
      setCameras(data)
    } catch (error) {
      console.error('Erro ao carregar câmeras:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCamera = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/cameras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (result.success) {
        await loadCameras()
        setShowAddModal(false)
        setFormData({
          name: '',
          location: '',
          rtspUrl: '',
          username: '',
          password: '',
          resolution: '1080p',
          fps: 30,
        })
      } else {
        alert(result.error)
      }
    } catch (error) {
      console.error('Erro ao adicionar câmera:', error)
      alert('Erro ao adicionar câmera')
    }
  }

  const toggleCamera = async (camera: Camera) => {
    try {
      await fetch('/api/cameras', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: camera.id,
          isActive: !camera.isActive,
        }),
      })

      await loadCameras()
    } catch (error) {
      console.error('Erro ao atualizar câmera:', error)
    }
  }

  const deleteCamera = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover esta câmera?')) return

    try {
      await fetch(`/api/cameras?id=${id}`, {
        method: 'DELETE',
      })

      await loadCameras()
    } catch (error) {
      console.error('Erro ao remover câmera:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gym-dark p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-gym-accent to-gym-secondary rounded-xl">
                <Video className="w-8 h-8 text-white" />
              </div>
              Câmeras de Segurança
            </h1>
            <p className="text-gym-text-secondary mt-2">
              Gerenciamento de câmeras IP/RTSP • Streaming ao vivo • Integração com IA Vision
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-gym-accent text-white rounded-lg hover:bg-gym-accent/90 transition-colors font-medium flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Adicionar Câmera
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gym-card border border-gym-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gym-text-secondary text-sm">Total de Câmeras</span>
              <Video className="w-5 h-5 text-gym-accent" />
            </div>
            <p className="text-3xl font-bold text-white">{cameras.length}</p>
          </div>

          <div className="bg-gym-card border border-gym-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gym-text-secondary text-sm">Câmeras Ativas</span>
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-3xl font-bold text-white">
              {cameras.filter(c => c.isActive).length}
            </p>
          </div>

          <div className="bg-gym-card border border-gym-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gym-text-secondary text-sm">Câmeras Offline</span>
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-3xl font-bold text-white">
              {cameras.filter(c => !c.isActive).length}
            </p>
          </div>

          <div className="bg-gym-card border border-gym-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gym-text-secondary text-sm">Localizações</span>
              <MapPin className="w-5 h-5 text-gym-accent" />
            </div>
            <p className="text-3xl font-bold text-white">
              {new Set(cameras.map(c => c.location)).size}
            </p>
          </div>
        </div>

        {/* Grid de Câmeras */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gym-accent"></div>
          </div>
        ) : cameras.length === 0 ? (
          <div className="bg-gym-card border border-gym-border rounded-xl p-12 text-center">
            <Video className="w-16 h-16 text-gym-text-muted mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Nenhuma câmera cadastrada</h3>
            <p className="text-gym-text-secondary mb-6">
              Adicione câmeras IP/RTSP para monitorar sua academia em tempo real
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-gym-accent text-white rounded-lg hover:bg-gym-accent/90 transition-colors font-medium"
            >
              Adicionar Primeira Câmera
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cameras.map((camera) => (
              <div
                key={camera.id}
                className="bg-gym-card border border-gym-border rounded-xl overflow-hidden hover:border-gym-accent/50 transition-all"
              >
                {/* Preview da Câmera (simulado) */}
                <div className="relative aspect-video bg-gym-darker">
                  {camera.isActive ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <Play className="w-12 h-12 text-gym-accent mx-auto mb-2 animate-pulse" />
                        <p className="text-sm text-gym-text-secondary">Streaming Ativo</p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <Pause className="w-12 h-12 text-gym-text-muted mx-auto mb-2" />
                        <p className="text-sm text-gym-text-muted">Câmera Offline</p>
                      </div>
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute top-3 left-3">
                    {camera.isActive ? (
                      <div className="px-3 py-1 bg-green-500/90 text-white rounded-lg text-xs font-medium flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        AO VIVO
                      </div>
                    ) : (
                      <div className="px-3 py-1 bg-red-500/90 text-white rounded-lg text-xs font-medium">
                        OFFLINE
                      </div>
                    )}
                  </div>

                  {/* Resolution Badge */}
                  <div className="absolute top-3 right-3">
                    <div className="px-2 py-1 bg-black/60 text-white rounded text-xs font-medium">
                      {camera.resolution} • {camera.fps}fps
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-white mb-1">{camera.name}</h3>
                  <p className="text-sm text-gym-text-secondary mb-3 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {camera.location}
                  </p>

                  <div className="bg-gym-darker rounded-lg p-2 mb-4">
                    <p className="text-xs text-gym-text-muted font-mono truncate">
                      {camera.rtspUrl}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleCamera(camera)}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                        camera.isActive
                          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                          : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      }`}
                    >
                      {camera.isActive ? 'Desativar' : 'Ativar'}
                    </button>
                    
                    <button
                      onClick={() => deleteCamera(camera.id)}
                      className="px-4 py-2 bg-gym-darker text-gym-text-secondary rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Adicionar Câmera */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-gym-card border border-gym-border rounded-xl p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold text-white mb-6">Nova Câmera IP/RTSP</h2>

              <form onSubmit={handleAddCamera} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gym-text-secondary mb-2">
                    Nome da Câmera *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-gym-darker border border-gym-border rounded-lg text-white focus:border-gym-accent outline-none"
                    placeholder="Ex: Câmera Recepção"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gym-text-secondary mb-2">
                    Localização *
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2 bg-gym-darker border border-gym-border rounded-lg text-white focus:border-gym-accent outline-none"
                    placeholder="Ex: Recepção Principal"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gym-text-secondary mb-2">
                    URL RTSP *
                  </label>
                  <input
                    type="text"
                    value={formData.rtspUrl}
                    onChange={(e) => setFormData({ ...formData, rtspUrl: e.target.value })}
                    className="w-full px-4 py-2 bg-gym-darker border border-gym-border rounded-lg text-white focus:border-gym-accent outline-none font-mono text-sm"
                    placeholder="rtsp://usuario:senha@ip:porta/stream"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gym-text-secondary mb-2">
                      Resolução
                    </label>
                    <select
                      value={formData.resolution}
                      onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                      className="w-full px-4 py-2 bg-gym-darker border border-gym-border rounded-lg text-white focus:border-gym-accent outline-none"
                    >
                      <option value="720p">720p</option>
                      <option value="1080p">1080p</option>
                      <option value="4K">4K</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gym-text-secondary mb-2">
                      FPS
                    </label>
                    <input
                      type="number"
                      value={formData.fps}
                      onChange={(e) => setFormData({ ...formData, fps: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-gym-darker border border-gym-border rounded-lg text-white focus:border-gym-accent outline-none"
                      min="15"
                      max="60"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 bg-gym-darker text-gym-text-secondary rounded-lg hover:bg-gym-darker/70 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gym-accent text-white rounded-lg hover:bg-gym-accent/90 transition-colors font-medium"
                  >
                    Adicionar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Informações Técnicas */}
        <div className="bg-gradient-to-r from-gym-accent/10 to-gym-secondary/10 border border-gym-accent/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">📡 Protocolos Suportados</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gym-accent font-semibold mb-1">RTSP (Real Time Streaming Protocol)</p>
              <p className="text-gym-text-secondary">
                Protocolo padrão para câmeras IP profissionais
              </p>
            </div>
            <div>
              <p className="text-gym-accent font-semibold mb-1">ONVIF</p>
              <p className="text-gym-text-secondary">
                Compatível com câmeras que seguem padrão ONVIF
              </p>
            </div>
            <div>
              <p className="text-gym-accent font-semibold mb-1">HTTP/HTTPS</p>
              <p className="text-gym-text-secondary">
                Suporte para câmeras com streaming HTTP
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
