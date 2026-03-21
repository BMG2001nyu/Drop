'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Player } from '@/lib/supabase'

interface Props {
  decision: string
  reason: string
  roomId: string
  players: Player[]
}

export default function DecisionReveal({ decision, reason, roomId, players }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className={`text-center transition-all duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <p className="text-white/40 text-xl uppercase tracking-widest mb-4">Tonight you&apos;re going to:</p>

      <div className="decision-drop">
        <h2 className="text-6xl font-black text-white leading-tight mb-6 gradient-text">
          {decision}
        </h2>
      </div>

      {reason && (
        <p className="text-white/60 text-2xl italic max-w-2xl mx-auto mb-12 leading-relaxed">
          &ldquo;{reason}&rdquo;
        </p>
      )}

      <div className="flex flex-wrap justify-center gap-3 mb-12">
        {players.map(p => (
          <span
            key={p.id}
            className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white/70"
          >
            {p.role_emoji} {p.name} · {p.role_label}
          </span>
        ))}
      </div>

      <Link
        href={`/card/${roomId}`}
        className="inline-block bg-[#FF5C00] hover:bg-[#FF8C00] text-white text-xl font-bold px-10 py-5 rounded-2xl transition-all duration-200 orange-glow hover:scale-[1.02]"
      >
        See Decision Card →
      </Link>
    </div>
  )
}
