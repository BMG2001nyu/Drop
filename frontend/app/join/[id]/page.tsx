'use client'

import { useEffect, useState } from 'react'
import { supabase, type Room } from '@/lib/supabase'
import type { Role } from '@/lib/roles'
import SpeakingView from '@/components/SpeakingView'

interface Props {
  params: { id: string }
}

type JoinState = 'enter-name' | 'role-reveal' | 'waiting' | 'my-turn' | 'spoke' | 'done'

interface PlayerData {
  id: string
  name: string
  role: string
  role_emoji: string
  role_label: string
}

export default function JoinPage({ params }: Props) {
  const [state, setState] = useState<JoinState>('enter-name')
  const [name, setName] = useState('')
  const [player, setPlayer] = useState<PlayerData | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [transcript, setTranscript] = useState('')

  const handleJoin = async () => {
    if (!name.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/join-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: params.id, playerName: name.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to join')
      }

      const data = await res.json()
      setPlayer(data.player)
      setRole(data.role)
      setRoom({ ...data.room, status: 'waiting' } as Room)
      setState('role-reveal')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to join room'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleTranscriptSubmit = async (finalTranscript: string) => {
    if (!player || !room) return
    setTranscript(finalTranscript)

    await fetch('/api/submit-transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: player.id,
        transcript: finalTranscript,
        roomId: room.id,
      }),
    })
    setState('spoke')
  }

  // Listen for room status changes
  useEffect(() => {
    if (!player || !room) return

    const handleRoomUpdate = (updatedRoom: Room) => {
      setRoom(updatedRoom)
      if (updatedRoom.status === 'speaking' && updatedRoom.current_speaker_role === player.role) {
        setState('my-turn')
      }
      if (updatedRoom.status === 'done') {
        setState('done')
      }
    }

    // Poll every 2s as reliable backup to realtime
    const pollInterval = setInterval(async () => {
      const { data } = await supabase.from('rooms').select('*').eq('id', params.id).single()
      if (data) handleRoomUpdate(data as Room)
    }, 2000)

    const channel = supabase
      .channel(`join:${params.id}:${player.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
      }, (payload) => handleRoomUpdate(payload.new as Room))
      .subscribe()

    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
    }
  }, [player, params.id])

  // Check if it's this player's turn
  useEffect(() => {
    if (room?.status === 'speaking' && player?.role === room.current_speaker_role && state === 'waiting') {
      setState('my-turn')
    }
  }, [room?.current_speaker_role, room?.status, player?.role, state])

  const roomId = params.id.toUpperCase()

  return (
    <main className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4 py-8">

      {/* Enter Name */}
      {state === 'enter-name' && (
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <h1 className="text-6xl font-black gradient-text mb-3">Drop</h1>
            <div className="text-[#FF5C00] font-black text-3xl tracking-widest">{roomId}</div>
            {room && <p className="text-white/60 mt-3 text-lg">&ldquo;{room.decision}&rdquo;</p>}
          </div>

          <div className="space-y-4">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="Your first name"
              autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-5 text-white text-2xl placeholder-white/20 focus:outline-none focus:border-[#FF5C00] text-center"
            />

            {error && <p className="text-red-400 text-center text-sm">{error}</p>}

            <button
              onClick={handleJoin}
              disabled={loading || !name.trim()}
              className="w-full bg-[#FF5C00] hover:bg-[#FF8C00] disabled:bg-white/10 disabled:text-white/30 text-white text-2xl font-bold py-6 rounded-2xl transition-all duration-200"
            >
              {loading ? 'Joining...' : 'Join Drop →'}
            </button>
          </div>
        </div>
      )}

      {/* Role Reveal */}
      {state === 'role-reveal' && role && (
        <div className="w-full max-w-sm text-center">
          <p className="text-white/40 text-sm uppercase tracking-widest mb-8">Your role is</p>

          <div className="bg-white/5 border border-white/20 rounded-3xl p-10 mb-8">
            <div className="text-8xl mb-6">{role.emoji}</div>
            <h2 className="text-4xl font-black text-white mb-3">{role.label}</h2>
            <p className="text-white/60 text-lg leading-relaxed">{role.description}</p>
          </div>

          <div className="bg-[#FF5C00]/10 border border-[#FF5C00]/30 rounded-2xl p-5 mb-8">
            <p className="text-white/80 text-sm font-semibold uppercase tracking-widest mb-2">When it&apos;s your turn, say:</p>
            <p className="text-white text-base italic leading-relaxed">&ldquo;{role.prompt}&rdquo;</p>
          </div>

          <button
            onClick={() => setState('waiting')}
            className="w-full bg-white/10 hover:bg-white/20 text-white text-xl font-bold py-5 rounded-2xl transition-all duration-200"
          >
            Got it — I&apos;m ready
          </button>
        </div>
      )}

      {/* Waiting for turn */}
      {state === 'waiting' && player && role && (
        <div className="w-full max-w-sm text-center">
          <div className="text-6xl mb-6">{role.emoji}</div>
          <h2 className="text-3xl font-black text-white mb-3">You are {role.label}</h2>
          <p className="text-white/40 text-lg mb-10">Waiting for your turn...</p>

          <div className="flex justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#FF5C00] animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-[#FF5C00] animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-[#FF5C00] animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}

      {/* Speaking Turn */}
      {state === 'my-turn' && role && player && room && (
        <SpeakingView
          role={role}
          playerName={player.name}
          onSubmit={handleTranscriptSubmit}
        />
      )}

      {/* After speaking */}
      {state === 'spoke' && (
        <div className="w-full max-w-sm text-center">
          <div className="text-7xl mb-6">✅</div>
          <h2 className="text-3xl font-black text-white mb-3">Nice.</h2>
          <p className="text-white/60 text-xl">Drop is listening to everyone else.</p>
          {transcript && (
            <div className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="text-white/40 text-sm mb-1">You said:</p>
              <p className="text-white/80 italic">&ldquo;{transcript}&rdquo;</p>
            </div>
          )}
        </div>
      )}

      {/* Done */}
      {state === 'done' && room && (
        <div className="w-full max-w-sm text-center">
          <div className="text-7xl mb-6">🎯</div>
          <h2 className="text-3xl font-black gradient-text mb-3">Drop has decided!</h2>
          {room.final_decision && (
            <p className="text-white text-2xl font-bold mb-6">{room.final_decision}</p>
          )}
          <a
            href={`/card/${params.id}`}
            className="block w-full bg-[#FF5C00] text-white text-xl font-bold py-5 rounded-2xl text-center"
          >
            See Decision Card →
          </a>
          <a
            href="/"
            className="block w-full mt-3 bg-white/10 text-white text-xl font-bold py-5 rounded-2xl text-center"
          >
            Start a New Drop
          </a>
        </div>
      )}
    </main>
  )
}
