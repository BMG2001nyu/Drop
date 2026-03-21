'use client'

import { ROLES } from '@/lib/roles'
import type { Player } from '@/lib/supabase'

interface Props {
  players: Player[]
  showSpeaking?: boolean
  currentRole?: string | null
}

export default function PlayerGrid({ players, showSpeaking, currentRole }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {ROLES.map((role) => {
        const player = players.find(p => p.role === role.id)
        const isCurrent = showSpeaking && currentRole === role.id
        const hasSpoken = player?.has_spoken

        return (
          <div
            key={role.id}
            className={`relative rounded-2xl border transition-all duration-500 overflow-hidden ${
              player
                ? isCurrent
                  ? 'border-[#FF5C00] bg-[#FF5C00]/20 scale-105'
                  : hasSpoken
                    ? 'border-green-500/50 bg-green-500/10'
                    : 'border-white/20 bg-white/5'
                : 'border-white/5 bg-white/2'
            }`}
          >
            {player ? (
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{role.emoji}</span>
                  <div>
                    <p className="text-white/60 text-xs uppercase tracking-widest">{role.label}</p>
                    <p className="text-white font-bold text-lg">{player.name}</p>
                  </div>
                  {hasSpoken && !isCurrent && (
                    <span className="ml-auto text-green-400 text-xl">✓</span>
                  )}
                  {isCurrent && (
                    <span className="ml-auto text-[#FF5C00] text-sm font-bold animate-pulse">
                      SPEAKING
                    </span>
                  )}
                </div>
                {player.transcript && (
                  <p className="mt-2 text-white/40 text-sm italic truncate">
                    &ldquo;{player.transcript}&rdquo;
                  </p>
                )}
              </div>
            ) : (
              <div className="p-4 flex items-center gap-3 opacity-30">
                <span className="text-3xl grayscale">{role.emoji}</span>
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-widest">{role.label}</p>
                  <p className="text-white/20 text-sm">Empty</p>
                </div>
              </div>
            )}

            {isCurrent && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#FF5C00] animate-pulse" />
            )}
          </div>
        )
      })}
    </div>
  )
}
