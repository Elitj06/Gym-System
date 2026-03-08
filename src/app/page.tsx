"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Zap } from "lucide-react"
import dynamic from "next/dynamic"

const LiquidCrystalBackground = dynamic(
  () => import("@/components/ui/liquid-crystal-shader"),
  { ssr: false }
)

export default function SplashPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<"enter" | "show" | "exit">("enter")

  useEffect(() => {
    // Phase 1: Enter animation (logo + text fade in)
    const t1 = setTimeout(() => setPhase("show"), 100)

    // Phase 2: Begin exit after 3s
    const t2 = setTimeout(() => setPhase("exit"), 3200)

    // Phase 3: Navigate after exit animation
    const t3 = setTimeout(() => {
      router.replace("/login")
    }, 4000)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [router])

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0a0f] overflow-hidden">
      {/* Shader background */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${
        phase === "enter" ? "opacity-0" : phase === "exit" ? "opacity-0" : "opacity-100"
      }`}>
        <LiquidCrystalBackground
          speed={0.4}
          radii={[0.25, 0.18, 0.28]}
          smoothK={[0.22, 0.3]}
        />
      </div>

      {/* Gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/40 via-transparent to-[#0a0a0f]/60" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full">

        {/* Logo icon */}
        <div className={`transition-all duration-700 ease-out ${
          phase === "enter"
            ? "opacity-0 scale-50"
            : phase === "exit"
            ? "opacity-0 scale-110 -translate-y-4"
            : "opacity-100 scale-100"
        }`}>
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-[#00d4aa] to-[#0099cc] flex items-center justify-center shadow-2xl shadow-[#00d4aa]/30">
            <Zap className="w-10 h-10 sm:w-14 sm:h-14 text-[#0a0a0f]" strokeWidth={2.5} />
          </div>
        </div>

        {/* App name */}
        <div className={`mt-6 text-center transition-all duration-700 ease-out delay-200 ${
          phase === "enter"
            ? "opacity-0 translate-y-4"
            : phase === "exit"
            ? "opacity-0 translate-y-[-8px]"
            : "opacity-100 translate-y-0"
        }`}>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            GYM
          </h1>
          <p className="text-[#00d4aa] text-sm sm:text-base font-semibold tracking-[0.35em] uppercase mt-1">
            System
          </p>
        </div>

        {/* Tagline */}
        <div className={`mt-4 transition-all duration-700 ease-out delay-500 ${
          phase === "enter"
            ? "opacity-0 translate-y-4"
            : phase === "exit"
            ? "opacity-0"
            : "opacity-100 translate-y-0"
        }`}>
          <p className="text-[#8888a0] text-xs sm:text-sm font-medium tracking-wide">
            Gestao Inteligente de Academias
          </p>
        </div>

        {/* Loading indicator */}
        <div className={`mt-10 transition-all duration-500 delay-700 ${
          phase === "enter" ? "opacity-0" : phase === "exit" ? "opacity-0" : "opacity-100"
        }`}>
          <div className="flex gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00d4aa] animate-pulse" style={{ animationDelay: "0ms" }} />
            <div className="w-1.5 h-1.5 rounded-full bg-[#00d4aa] animate-pulse" style={{ animationDelay: "300ms" }} />
            <div className="w-1.5 h-1.5 rounded-full bg-[#00d4aa] animate-pulse" style={{ animationDelay: "600ms" }} />
          </div>
        </div>
      </div>

      {/* Bottom version */}
      <div className={`absolute bottom-6 left-0 right-0 text-center transition-opacity duration-500 delay-700 ${
        phase === "enter" ? "opacity-0" : phase === "exit" ? "opacity-0" : "opacity-100"
      }`}>
        <p className="text-[#55556a] text-[10px] font-mono">v1.0.0</p>
      </div>
    </div>
  )
}
