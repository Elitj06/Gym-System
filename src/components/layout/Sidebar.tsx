'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  UserCog,
  Dumbbell,
  DollarSign,
  Building2,
  Brain,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react'
import { useState } from 'react'

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/membros', label: 'Membros', icon: Users },
  { href: '/funcionarios', label: 'Funcionários', icon: UserCog },
  { href: '/treinos', label: 'Treinos', icon: Dumbbell },
  { href: '/financeiro', label: 'Financeiro', icon: DollarSign },
  { href: '/espacos', label: 'Espaços', icon: Building2 },
  { href: '/ia', label: 'IA Vision', icon: Brain },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart3 },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-gym-surface border-r border-gym-border z-40 transition-all duration-300 flex flex-col ${
        collapsed ? 'w-[72px]' : 'w-[240px]'
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-gym-border">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-9 h-9 rounded-lg bg-gym-accent flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-gym-bg" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-gym-text tracking-tight">GYM</span>
              <span className="text-[10px] font-medium text-gym-accent tracking-widest uppercase">System</span>
            </div>
          )}
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-gym-accent-dim text-gym-accent glow-accent'
                  : 'text-gym-text-secondary hover:text-gym-text hover:bg-gym-hover'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={`w-5 h-5 flex-shrink-0 transition-colors ${
                  isActive ? 'text-gym-accent' : 'text-gym-text-muted group-hover:text-gym-text-secondary'
                }`}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Collapse button */}
      <div className="p-3 border-t border-gym-border">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gym-text-muted hover:text-gym-text-secondary hover:bg-gym-hover transition-all text-xs"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span>Recolher</span>}
        </button>
      </div>
    </aside>
  )
}
