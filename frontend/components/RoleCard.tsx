'use client'

import { useState, useEffect } from 'react'
import type { Role } from '@/lib/roles'

interface Props {
  role: Role
  playerName?: string
  revealed?: boolean
  isCurrent?: boolean
  hasSpoken?: boolean
}

export default function RoleCard({ role, playerName, revealed = false, isCurrent, hasSpoken }: Props) {
  const [flipped, setFlipped] = useState(false)

  useEffect(() => {
    if (revealed) {
      const timer = setTimeout(() => setFlipped(true), Math.random() * 500)
      return () => clearTimeout(timer)
    }
  }, [revealed])

  return (
    <div className="role-card h-32">
      <div className={`role-card-inner relative h-full ${flipped ? 'flipped' : ''}`}>
        {/* Front (empty) */}
        <div className="role-card-front absolute inset-0 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
          <span className="text-4xl opacity-20">?</span>
        </div>

        {/* Back (revealed) */}
        <div className={`role-card-back absolute inset-0 rounded-2xl border p-4 flex flex-col justify-between ${
          isCurrent
            ? 'bg-[#FF5C00]/20 border-[#FF5C00]'
            : hasSpoken
              ? 'bg-green-500/10 border-green-500/50'
              : 'bg-white/5 border-white/20'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{role.emoji}</span>
            <p className="text-white/60 text-xs uppercase tracking-widest leading-tight">{role.label}</p>
          </div>
          {playerName && (
            <p className="text-white font-bold text-lg">{playerName}</p>
          )}
          {isCurrent && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#FF5C00] animate-pulse" />
              <span className="text-[#FF5C00] text-xs font-bold">SPEAKING</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
