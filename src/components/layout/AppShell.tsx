'use client'

import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { status } = useSession()

  // Páginas que NÃO mostram sidebar/topbar
  const isAuthPage = pathname === '/login' || pathname === '/'

  // Se é página de auth ou não está logado, renderiza só o children
  if (isAuthPage || status === 'unauthenticated') {
    return <>{children}</>
  }

  return (
    <>
      <Sidebar />
      <div className="ml-0 md:ml-[240px] min-h-screen transition-all duration-300">
        <Topbar />
        <main className="p-3 sm:p-6">
          {children}
        </main>
      </div>
    </>
  )
}
