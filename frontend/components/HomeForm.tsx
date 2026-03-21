'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'

export default function HomeForm() {
  const router = useRouter()
  const { isSignedIn } = useAuth()
  const [decision, setDecision] = useState('')
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!decision.trim()) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: decision.trim(), location: location.trim() || null }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create room')
      router.push(`/room/${data.roomId}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Try again.'
      setError(message)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-white/60 text-sm font-semibold uppercase tracking-widest mb-3">
          What does your group need to decide?
        </label>
        <textarea
          value={decision}
          onChange={e => setDecision(e.target.value)}
          placeholder="Where should we eat tonight?"
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-xl placeholder-white/20 focus:outline-none focus:border-[#FF5C00] focus:bg-white/10 resize-none transition-all duration-200"
          required
        />
      </div>

      <div>
        <label className="block text-white/60 text-sm font-semibold uppercase tracking-widest mb-3">
          Where are you? <span className="text-white/30 normal-case font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="Lower East Side, NYC"
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-lg placeholder-white/20 focus:outline-none focus:border-[#FF5C00] focus:bg-white/10 transition-all duration-200"
        />
      </div>

      {error && (
        <p className="text-red-400 text-sm text-center">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !decision.trim()}
        className="w-full bg-[#FF5C00] hover:bg-[#FF8C00] disabled:bg-white/10 disabled:text-white/30 text-white text-xl font-bold py-5 rounded-2xl transition-all duration-200 disabled:cursor-not-allowed orange-glow hover:scale-[1.02] active:scale-[0.98]"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-3">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Creating Drop...
          </span>
        ) : (
          'Start a Drop →'
        )}
      </button>

      <p className="text-center text-white/30 text-sm">
        {isSignedIn ? (
          <>
            No signup needed · Share a QR code ·{' '}
            <Link href="/dashboard" className="text-[#FF5C00] hover:text-[#FF8C00] transition-colors">
              View past Drops
            </Link>
          </>
        ) : (
          <>
            No signup needed · Share a QR code · Done in 90 seconds
          </>
        )}
      </p>
    </form>
  )
}
