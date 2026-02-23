'use client'

import { Bell, Search, User, Menu } from 'lucide-react'
import { useState } from 'react'

export default function Topbar() {
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <header className="h-16 bg-gym-surface/80 backdrop-blur-md border-b border-gym-border sticky top-0 z-30 flex items-center justify-between px-6">
      {/* Left - Page context */}
      <div className="flex items-center gap-4">
        <div className="lg:hidden">
          <Menu className="w-5 h-5 text-gym-text-secondary" />
        </div>
        <div>
          <p className="text-xs text-gym-text-muted">Bem-vindo de volta</p>
          <p className="text-sm font-semibold text-gym-text">Administrador</p>
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

        {/* Profile */}
        <button className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gym-hover transition-all">
          <div className="w-8 h-8 rounded-lg bg-gym-accent/20 flex items-center justify-center">
            <User className="w-4 h-4 text-gym-accent" />
          </div>
          <span className="text-sm font-medium text-gym-text hidden sm:block">Admin</span>
        </button>
      </div>
    </header>
  )
}
