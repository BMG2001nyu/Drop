'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Room, Player } from '@/lib/supabase'

interface Props {
  room: Room
  players: Player[]
}

export default function DecisionCard({ room, players }: Props) {
  const [copied, setCopied] = useState(false)

  const shareUrl = typeof window !== 'undefined'
    ? window.location.href
    : ''

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const decidedAt = new Date(room.created_at)
  const timeStr = decidedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="w-full max-w-lg">
      {/* Card */}
      <div className="bg-[#111111] border border-white/10 rounded-3xl overflow-hidden orange-glow">
        {/* Header */}
        <div className="bg-[#FF5C00] px-8 py-6">
          <div className="flex items-center justify-between">
            <span className="text-white font-black text-3xl tracking-tight">🎯 Drop</span>
            <span className="text-white/70 text-sm font-medium">{timeStr}</span>
          </div>
        </div>

        {/* Decision Question */}
        <div className="px-8 py-6 border-b border-white/10">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-2">The question</p>
          <p className="text-white/80 text-lg font-medium">{room.decision}</p>
          {room.location && (
            <p className="text-white/40 text-sm mt-1">📍 {room.location}</p>
          )}
        </div>

        {/* The Decision */}
        <div className="px-8 py-8 text-center border-b border-white/10">
          <p className="text-white/40 text-sm uppercase tracking-widest mb-4">Tonight you&apos;re going to:</p>
          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            {room.final_decision || 'Pending...'}
          </h2>
          {room.final_reason && (
            <p className="text-white/60 text-lg italic leading-relaxed">
              &ldquo;{room.final_reason}&rdquo;
            </p>
          )}
        </div>

        {/* Players */}
        <div className="px-8 py-6 border-b border-white/10">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-4">The voices</p>
          <div className="space-y-3">
            {players.map(p => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-2xl">{p.role_emoji}</span>
                <div>
                  <span className="text-white font-semibold">{p.name}</span>
                  <span className="text-white/40 text-sm"> · {p.role_label}</span>
                </div>
                {p.transcript && (
                  <span className="ml-auto text-white/30 text-sm italic truncate max-w-[150px]">
                    &ldquo;{p.transcript}&rdquo;
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 flex items-center justify-between">
          <p className="text-white/30 text-sm">drop.app · Decided in ~90 seconds</p>
          <div className="flex items-center gap-2">
            <span className="text-white/20 text-xs">Built on</span>
            <span className="text-white/40 text-xs">Vercel · Gemini · Supabase</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={copyLink}
          className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-base font-semibold py-4 rounded-2xl transition-all duration-200"
        >
          {copied ? '✓ Copied!' : '📋 Copy Link'}
        </button>
        <Link
          href="/"
          className="flex-1 bg-[#FF5C00] hover:bg-[#FF8C00] text-white text-base font-bold py-4 rounded-2xl text-center transition-all duration-200"
        >
          New Drop →
        </Link>
      </div>
    </div>
  )
}
