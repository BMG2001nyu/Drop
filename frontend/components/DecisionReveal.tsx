'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Player } from '@/lib/supabase'

interface Props {
  decision: string
  reason: string
  roomId: string
  players: Player[]
  verificationStatus?: string | null
  verificationMessage?: string | null
}

export default function DecisionReveal({ decision, reason, roomId, players, verificationStatus, verificationMessage }: Props) {
  const [phase, setPhase] = useState<'black' | 'flash' | 'blast' | 'full'>('black')
  const [imageData, setImageData] = useState<{ base64: string; mime: string } | null>(null)
  const [imageLoading, setImageLoading] = useState(true)

  // Sequence: black → flash → blast (text + shockwave) → full (image + details)
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('flash'), 200)
    const t2 = setTimeout(() => setPhase('blast'), 700)
    const t3 = setTimeout(() => setPhase('full'), 1400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  // Fetch Gemini image in background
  useEffect(() => {
    fetch('/api/generate-decision-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, finalDecision: decision }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.imageBase64) {
          setImageData({ base64: data.imageBase64, mime: data.mimeType })
        }
        setImageLoading(false)
      })
      .catch(() => setImageLoading(false))
  }, [decision])

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center overflow-hidden">

      {/* Cinematic background image */}
      {imageData && (
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:${imageData.mime};base64,${imageData.base64}`}
            alt="decision visual"
            className="w-full h-full object-cover bg-sharpen"
          />
          {/* Dark vignette overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/40" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
        </div>
      )}

      {/* Loading state — subtle pulse while image loads */}
      {imageLoading && (
        <div className="absolute inset-0 z-0">
          <div className="w-full h-full bg-[#0a0a0a]" />
          <div className="absolute inset-0 bg-gradient-radial from-orange-900/20 via-transparent to-transparent reasoning-bg" />
        </div>
      )}

      {/* WHITE FLASH */}
      {phase === 'flash' && (
        <div className="absolute inset-0 z-50 bg-white blast-flash pointer-events-none" />
      )}

      {/* SHOCKWAVE RINGS — centered, behind text */}
      {(phase === 'blast' || phase === 'full') && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="absolute w-32 h-32 rounded-full border-2 border-[#FF5C00] shockwave" />
          <div className="absolute w-32 h-32 rounded-full border border-[#FF8C00]/60 shockwave-2" />
          <div className="absolute w-32 h-32 rounded-full border border-white/20 shockwave-3" />
        </div>
      )}

      {/* MAIN CONTENT */}
      {(phase === 'blast' || phase === 'full') && (
        <div className="relative z-20 flex flex-col items-center text-center px-8 max-w-4xl w-full">

          {/* "Drop has decided" label */}
          <p
            className="text-[#FF5C00] text-sm uppercase tracking-[0.3em] font-bold mb-6"
            style={{ animationDelay: '0.1s' }}
          >
            <span className="slide-up" style={{ animationDelay: '0.1s', display: 'inline-block' }}>
              Drop has decided
            </span>
          </p>

          {/* THE DECISION — crashes in */}
          <h1 className="text-crash text-6xl md:text-7xl font-black text-white leading-tight mb-6 glow-pulse">
            {decision}
          </h1>

          {/* Reason */}
          {reason && phase === 'full' && (
            <p
              className="reason-fade text-white/70 text-xl italic max-w-2xl leading-relaxed mb-10"
              style={{ animationDelay: '0.3s' }}
            >
              &ldquo;{reason}&rdquo;
            </p>
          )}

          {/* Verification badge */}
          {phase === 'full' && (
            <div className="slide-up mb-8" style={{ animationDelay: '0.4s' }}>
              {!verificationStatus ? (
                <span className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white/40">
                  <span className="w-2 h-2 rounded-full bg-white/20 animate-pulse" />
                  Verifying...
                </span>
              ) : verificationStatus === 'verified' ? (
                <span className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-4 py-2 text-sm text-green-400 font-medium">
                  ✅ {verificationMessage}
                </span>
              ) : verificationStatus === 'warning' ? (
                <span className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-2 text-sm text-yellow-400 font-medium">
                  ⚠️ {verificationMessage}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-full px-4 py-2 text-sm text-red-400 font-medium">
                  ❌ {verificationMessage}
                </span>
              )}
            </div>
          )}

          {/* Players */}
          {phase === 'full' && (
            <div
              className="slide-up flex flex-wrap justify-center gap-3 mb-10"
              style={{ animationDelay: '0.5s' }}
            >
              {players.map(p => (
                <span
                  key={p.id}
                  className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-sm text-white/80"
                >
                  {p.role_emoji} {p.name} · {p.role_label}
                </span>
              ))}
            </div>
          )}

          {/* CTA Button */}
          {phase === 'full' && (
            <div className="btn-enter" style={{ animationDelay: '0.8s' }}>
              <Link
                href={`/card/${roomId}`}
                className="inline-block bg-[#FF5C00] hover:bg-[#FF8C00] text-white text-xl font-bold px-10 py-5 rounded-2xl transition-all duration-200 orange-glow hover:scale-[1.02] active:scale-[0.98]"
              >
                See Decision Card →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
