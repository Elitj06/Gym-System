'use client'

import { Bell, Search, User, Menu, LogOut, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'

export default function Topbar() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { data: session } = useSession()

  const getRoleName = (role?: string) => {
    const roles: { [key: string]: string } = {
      admin: 'Administrador',
      instructor: 'Instrutor',
      receptionist: 'Recepcionista',
    }
    return roles[role || ''] || 'Usuário'
  }

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' })
  }

  return (
    <header className="h-16 bg-gym-surface/80 backdrop-blur-md border-b border-gym-border sticky top-0 z-30 flex items-center justify-between px-6">
      {/* Left - Page context */}
      <div className="flex items-center gap-4">
        <div className="lg:hidden">
          <Menu className="w-5 h-5 text-gym-text-secondary" />
        </div>
        <div>
          <p className="text-xs text-gym-text-muted">Bem-vindo de volta</p>
          <p className="text-sm font-semibold text-gym-text">
            {session?.user?.name || 'Usuário'}
          </p>
        </div>
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-gym-text-muted hover:text-gym-text hover:bg-gym-hover transition-all"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <button className="w-9 h-9 rounded-lg flex items-center justify-center text-gym-text-muted hover:text-gym-text hover:bg-gym-hover transition-all relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-gym-accent rounded-full"></span>
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-gym-border mx-1"></div>

        {/* Profile with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gym-hover transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-gym-accent/20 flex items-center justify-center">
              <User className="w-4 h-4 text-gym-accent" />
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gym-text">
                {session?.user?.name || 'Admin'}
              </p>
              <p className="text-xs text-gym-text-muted">
                {getRoleName(session?.user?.role)}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-gym-text-muted hidden sm:block" />
          </button>

          {/* Dropdown Menu */}
          {menuOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              {/* Menu */}
              <div className="absolute right-0 mt-2 w-56 bg-gym-secondary border border-gym-border rounded-lg shadow-xl z-50 overflow-hidden">
                {/* User Info */}
                <div className="p-3 border-b border-gym-border">
                  <p className="text-sm font-medium text-gym-text">
                    {session?.user?.name}
                  </p>
                  <p className="text-xs text-gym-text-muted mt-0.5">
                    {session?.user?.email}
                  </p>
                  <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gym-accent/20 text-gym-accent">
                    {getRoleName(session?.user?.role)}
                  </div>
                </div>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gym-text hover:bg-gym-hover transition-all"
                >
                  <LogOut className="w-4 h-4 text-gym-text-muted" />
                  <span>Sair</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

