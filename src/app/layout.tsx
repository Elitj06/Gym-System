import type { Metadata, Viewport } from 'next'
import './globals.css'
import AuthProvider from '@/components/providers/AuthProvider'
import AppShell from '@/components/layout/AppShell'

export const metadata: Metadata = {
  title: 'GYM System - Gestão Inteligente de Academias',
  description: 'Sistema completo de gestão para academias com IA',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-gym-bg text-gym-text antialiased">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  )
}
