'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Dumbbell, AlertCircle, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Email ou senha incorretos')
        setLoading(false)
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gym-dark via-black to-gym-dark relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, #10b981 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-gym-secondary border border-gym-border rounded-2xl shadow-2xl p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-gym-accent to-gym-accent/80 rounded-xl flex items-center justify-center mb-4 shadow-lg">
              <Dumbbell className="w-10 h-10 text-black" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">GYM SYSTEM</h1>
            <p className="text-gym-text-secondary text-sm">Sistema de Gestão de Academia</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Alert */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gym-text-secondary mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gym-dark border border-gym-border rounded-lg text-white placeholder-gym-text-secondary focus:outline-none focus:ring-2 focus:ring-gym-accent focus:border-transparent transition-all"
                placeholder="seu@email.com"
                disabled={loading}
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gym-text-secondary mb-2">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gym-dark border border-gym-border rounded-lg text-white placeholder-gym-text-secondary focus:outline-none focus:ring-2 focus:ring-gym-accent focus:border-transparent transition-all"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-gym-accent to-gym-accent/90 text-black font-semibold py-3 px-4 rounded-lg hover:from-gym-accent/90 hover:to-gym-accent/80 focus:outline-none focus:ring-2 focus:ring-gym-accent focus:ring-offset-2 focus:ring-offset-gym-secondary transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Entrando...</span>
                </>
              ) : (
                <span>Entrar</span>
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 pt-6 border-t border-gym-border">
            <p className="text-xs text-gym-text-secondary text-center mb-3">Credenciais de teste:</p>
            <div className="space-y-2 text-xs bg-gym-dark rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-gym-text-secondary">Admin:</span>
                <span className="text-gym-accent font-mono">carlos.silva@gym.com</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gym-text-secondary">Instrutor:</span>
                <span className="text-gym-accent font-mono">ana.costa@gym.com</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gym-text-secondary">Recepção:</span>
                <span className="text-gym-accent font-mono">recepcao@gym.com</span>
              </div>
              <div className="pt-2 border-t border-gym-border mt-2">
                <span className="text-gym-text-secondary">Senha padrão:</span>
                <span className="text-white font-mono ml-2">gym123</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gym-text-secondary text-sm mt-6">
          © 2026 Gym System. Todos os direitos reservados.
        </p>
      </div>
    </div>
  )
}
