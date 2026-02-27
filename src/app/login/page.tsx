'use client'

import { signIn } from 'next-auth/react'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Dumbbell, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gym-dark via-black to-gym-dark relative overflow-hidden p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, #10b981 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-gym-secondary border border-gym-border rounded-2xl shadow-2xl p-6 sm:p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-6 sm:mb-8">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-gym-accent to-gym-accent/80 rounded-xl flex items-center justify-center mb-3 sm:mb-4 shadow-lg">
              <Dumbbell className="w-8 h-8 sm:w-10 sm:h-10 text-black" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">GYM SYSTEM</h1>
            <p className="text-gym-text-secondary text-xs sm:text-sm text-center">Sistema de Gestão de Academia</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Error Alert */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-200 text-xs sm:text-sm">{error}</p>
              </div>
            )}

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gym-text-secondary mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gym-dark border border-gym-border rounded-lg text-white text-sm sm:text-base placeholder-gym-text-secondary focus:outline-none focus:ring-2 focus:ring-gym-accent focus:border-transparent transition-all"
                placeholder="seu@email.com"
                disabled={loading}
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gym-text-secondary mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 sm:pr-12 bg-gym-dark border border-gym-border rounded-lg text-white text-sm sm:text-base placeholder-gym-text-secondary focus:outline-none focus:ring-2 focus:ring-gym-accent focus:border-transparent transition-all"
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gym-text-secondary hover:text-white transition-colors"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-gym-accent to-gym-accent/90 text-black font-semibold py-2.5 sm:py-3 px-4 rounded-lg text-sm sm:text-base hover:from-gym-accent/90 hover:to-gym-accent/80 focus:outline-none focus:ring-2 focus:ring-gym-accent focus:ring-offset-2 focus:ring-offset-gym-secondary transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  <span>Entrando...</span>
                </>
              ) : (
                <span>Entrar</span>
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gym-border">
            <p className="text-xs text-gym-text-secondary text-center mb-3">Credenciais de teste:</p>
            <div className="space-y-1.5 text-[10px] sm:text-xs bg-gym-dark rounded-lg p-2.5 sm:p-3">
              <div className="grid grid-cols-[auto,1fr] gap-x-2 gap-y-1 items-baseline">
                <span className="text-gym-text-secondary whitespace-nowrap">Admin:</span>
                <span className="text-gym-accent font-mono text-right sm:text-left">carlos.silva@gym.com</span>
                
                <span className="text-gym-text-secondary whitespace-nowrap">Instrutor:</span>
                <span className="text-gym-accent font-mono text-right sm:text-left">ana.costa@gym.com</span>
                
                <span className="text-gym-text-secondary whitespace-nowrap">Recepção:</span>
                <span className="text-gym-accent font-mono text-right sm:text-left">recepcao@gym.com</span>
              </div>
              
              <div className="pt-1.5 border-t border-gym-border mt-1.5 grid grid-cols-[auto,1fr] gap-x-2 items-baseline">
                <span className="text-gym-text-secondary whitespace-nowrap">Senha:</span>
                <span className="text-white font-mono text-right sm:text-left">gym123</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gym-text-secondary text-xs sm:text-sm mt-4 sm:mt-6">
          © 2026 Gym System. Todos os direitos reservados.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gym-dark">
        <Loader2 className="w-8 h-8 animate-spin text-gym-primary" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
