import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'

export const metadata: Metadata = {
  title: 'GYM System - Gestão Inteligente de Academias',
  description: 'Sistema completo de gestão para academias com IA',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-gym-bg text-gym-text antialiased">
        <Sidebar />
        <div className="ml-[240px] min-h-screen transition-all duration-300">
          <Topbar />
          <main className="p-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
