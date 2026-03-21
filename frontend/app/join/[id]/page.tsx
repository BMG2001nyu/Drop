'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, type Room, type Player } from '@/lib/supabase'
import type { Role } from '@/lib/roles'
import SpeakingView from '@/components/SpeakingView'
import ReasoningStream from '@/components/ReasoningStream'
import DecisionReveal from '@/components/DecisionReveal'

interface Props {
  params: { id: string }
}

type JoinState = 'enter-name' | 'pick-role' | 'role-reveal' | 'waiting' | 'my-turn' | 'spoke' | 'done'

interface PlayerData {
  id: string
  name: string
  role: string
  role_emoji: string
  role_label: string
}

interface PlayerInRoom {
  id: string
  name: string
  role: string
  role_emoji: string
  role_label: string
  has_spoken: boolean
  transcript: string | null
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
  const [availableRoles, setAvailableRoles] = useState<Role[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [showDecision, setShowDecision] = useState(false)
  const decisionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchPlayers = useCallback(async () => {
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', params.id)
      .order('joined_at', { ascending: true })
    if (data) setAllPlayers(data)
  }, [params.id])

  // Fetch available roles from the server
  const fetchAvailableRoles = async (excludePlayerId?: string) => {
    const res = await fetch(`/api/available-roles?roomId=${params.id}`)
    if (!res.ok) return
    const data = await res.json()
    // If the current player already has a role, include it back as available for display
    // (they can re-pick their own role or swap to another)
    if (excludePlayerId && player?.role) {
      const currentRole = data.availableRoles.find((r: Role) => r.id === player.role)
      if (!currentRole) {
        // Their own role won't appear as "available" since they occupy it — add it back
        // so they can see all roles except those taken by others
      }
    }
    setAvailableRoles(data.availableRoles)
  }

  // Step 1: Name entered → show role picker
  const handleNameSubmit = async () => {
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      await fetchAvailableRoles()
      setState('pick-role')
    } catch {
      setError('Failed to load roles')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Role picked → join room with that role
  const handleRolePick = async (roleId: string) => {
    setSelectedRoleId(roleId)
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/join-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: params.id, playerName: name.trim(), roleId }),
      })

      if (!res.ok) {
        const data = await res.json()
        // If role was just taken, refresh available roles and stay on picker
        if (res.status === 409) {
          await fetchAvailableRoles()
          setSelectedRoleId(null)
          throw new Error(data.error || 'That role was just taken — pick another')
        }
        throw new Error(data.error || 'Failed to join')
      }

      const data = await res.json()
      setPlayer(data.player)
      setRole(data.role)
      setRoom({ ...data.room, status: 'waiting' } as Room)
      setState('role-reveal')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to join room')
    } finally {
      setLoading(false)
    }
  }

  // "Change Role" — release current role and go back to picker
  const handleChangeRole = async () => {
    if (!player || !room) return
    setLoading(true)
    setError('')
    try {
      // Fetch fresh available roles. The player's current role will now appear
      // available to others, but we need to show them all roles except those
      // occupied by OTHER players. We handle this by fetching after the change
      // or by temporarily treating their own role as free.
      // For simplicity: fetch available roles — their slot will still show as
      // occupied until they pick a new one, so we manually add it back.
      const res = await fetch(`/api/available-roles?roomId=${params.id}`)
      if (!res.ok) throw new Error('Failed to load roles')
      const data = await res.json()

      // Include the player's current role so they can re-select it
      const currentRoleInList = data.availableRoles.find((r: Role) => r.id === player.role)
      if (!currentRoleInList && role) {
        setAvailableRoles([role, ...data.availableRoles])
      } else {
        setAvailableRoles(data.availableRoles)
      }

      setSelectedRoleId(null)
      setState('pick-role')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load roles')
    } finally {
      setLoading(false)
    }
  }

  // Role swap — player already joined, picking a different role
  const handleRoleSwap = async (newRoleId: string) => {
    if (!player || newRoleId === player.role) {
      // Re-selected same role — just go back to reveal
      setState('role-reveal')
      return
    }

    setSelectedRoleId(newRoleId)
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/change-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id, roomId: params.id, newRoleId }),
      })

      if (!res.ok) {
        const data = await res.json()
        if (res.status === 409) {
          // Role taken — refresh picker
          await handleChangeRole()
          setSelectedRoleId(null)
          throw new Error(data.error || 'That role was just taken — pick another')
        }
        throw new Error(data.error || 'Failed to change role')
      }

      const data = await res.json()
      setPlayer(data.player)
      setRole(data.role)
      setState('role-reveal')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to change role')
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

  // Fetch room on mount + poll so even pre-join users see reasoning/done screens
  useEffect(() => {
    const fetch = () =>
      supabase.from('rooms').select('*').eq('id', params.id).single()
        .then(({ data }) => { if (data) setRoom(data as Room) })
    fetch()
    fetchPlayers()
    const interval = setInterval(fetch, 2000)
    return () => clearInterval(interval)
  }, [params.id, fetchPlayers])

  // Listen for room status changes + subscribe to players table
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

    // Fetch players initially and poll every 5s as backup
    fetchPlayers()
    const playersInterval = setInterval(fetchPlayers, 5000)

    const channel = supabase
      .channel(`join:${params.id}:${player.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
      }, (payload) => handleRoomUpdate(payload.new as Room))
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'players',
        filter: `room_id=eq.${params.id}`,
      }, () => fetchPlayers())
      .subscribe()

    return () => {
      clearInterval(pollInterval)
      clearInterval(playersInterval)
      supabase.removeChannel(channel)
    }
  }, [player, params.id, fetchPlayers])

  // Check if it's this player's turn
  useEffect(() => {
    if (room?.status === 'speaking' && player?.role === room.current_speaker_role && state === 'waiting') {
      setState('my-turn')
    }
  }, [room?.current_speaker_role, room?.status, player?.role, state])

  const roomId = params.id.toUpperCase()
  const isWaiting = room?.status === 'waiting'

  // Reusable players panel shown in role-reveal, waiting, and spoke states
  const PlayersPanel = () => (
    <div className="mt-8 w-full max-w-sm">
      <p className="text-white/30 text-xs uppercase tracking-widest mb-3">In this Drop</p>
      <div className="space-y-2">
        {allPlayers.map(p => {
          const isCurrent = room?.current_speaker_role === p.role && room?.status === 'speaking'
          return (
            <div key={p.id} className={`rounded-xl p-3 border transition-all ${
              isCurrent ? 'bg-[#FF5C00]/10 border-[#FF5C00]/40' : 'bg-white/5 border-white/10'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <span>{p.role_emoji}</span>
                <span className="text-white font-semibold text-sm">{p.name}</span>
                <span className="text-white/30 text-xs">{p.role_label}</span>
                {isCurrent && <span className="ml-auto text-[#FF5C00] text-xs font-bold animate-pulse">SPEAKING</span>}
                {p.has_spoken && !isCurrent && <span className="ml-auto text-green-400 text-xs">✓ Spoke</span>}
              </div>
              {p.has_spoken && p.transcript && (
                <p className="text-white/50 text-xs italic pl-6 leading-relaxed">&ldquo;{p.transcript}&rdquo;</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  // When reasoning completes, hold on the DECISION: reveal for 4s before blasting in
  useEffect(() => {
    if (room?.status === 'done' && !showDecision) {
      if (decisionTimerRef.current) return
      decisionTimerRef.current = setTimeout(() => setShowDecision(true), 5000)
    }
    return () => {
      if (decisionTimerRef.current) {
        clearTimeout(decisionTimerRef.current)
        decisionTimerRef.current = null
      }
    }
  }, [room?.status, showDecision])

  // Override all local states when room is reasoning or done — show shared experience
  if (room?.status === 'reasoning' || (room?.status === 'done' && !showDecision)) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex flex-col">
        <ReasoningStream text={room.reasoning_stream || ''} />
      </main>
    )
  }

  if (room?.status === 'done' && room.final_decision && showDecision) {
    return (
      <DecisionReveal
        decision={room.final_decision}
        reason={room.final_reason || ''}
        roomId={params.id}
        players={allPlayers}
        reasoning={room.reasoning_stream || ''}
      />
    )
  }

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
              onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
              placeholder="Your first name"
              autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-5 text-white text-2xl placeholder-white/20 focus:outline-none focus:border-[#FF5C00] text-center"
            />

            {error && <p className="text-red-400 text-center text-sm">{error}</p>}

            <button
              onClick={handleNameSubmit}
              disabled={loading || !name.trim()}
              className="w-full bg-[#FF5C00] hover:bg-[#FF8C00] disabled:bg-white/10 disabled:text-white/30 text-white text-2xl font-bold py-6 rounded-2xl transition-all duration-200"
            >
              {loading ? 'Loading roles...' : 'Pick Your Role →'}
            </button>
          </div>
        </div>
      )}

      {/* Role Picker */}
      {state === 'pick-role' && (
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-white mb-2">Pick Your Role</h2>
            <p className="text-white/40 text-base">
              {player ? 'Swap to a different role' : `Hey ${name}, choose your voice`}
            </p>
          </div>

          {error && <p className="text-red-400 text-center text-sm mb-4">{error}</p>}

          <div className="space-y-3">
            {availableRoles.map((r) => {
              const isCurrentRole = player?.role === r.id
              const isSelected = selectedRoleId === r.id
              return (
                <button
                  key={r.id}
                  onClick={() => player ? handleRoleSwap(r.id) : handleRolePick(r.id)}
                  disabled={loading}
                  style={{ borderColor: isSelected || isCurrentRole ? r.color : undefined }}
                  className={`w-full flex items-center gap-4 bg-white/5 border rounded-2xl px-5 py-4 text-left transition-all duration-150 disabled:opacity-50
                    ${isSelected || isCurrentRole
                      ? 'border-2 bg-white/10'
                      : 'border-white/10 hover:bg-white/10 hover:border-white/30'
                    }`}
                >
                  <span className="text-4xl">{r.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-lg leading-tight">{r.label}</p>
                    <p className="text-white/50 text-sm leading-snug">{r.description}</p>
                  </div>
                  {isCurrentRole && (
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-white/10 text-white/60 shrink-0">
                      Current
                    </span>
                  )}
                </button>
              )
            })}

            {availableRoles.length === 0 && (
              <p className="text-white/40 text-center py-8">No roles available — room may be full.</p>
            )}
          </div>

          {/* Back button (only shown before joining) */}
          {!player && (
            <button
              onClick={() => { setState('enter-name'); setError('') }}
              className="w-full mt-6 bg-white/5 hover:bg-white/10 text-white/50 text-lg font-medium py-4 rounded-2xl transition-all duration-200"
            >
              ← Change Name
            </button>
          )}
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

          <div className="bg-[#FF5C00]/10 border border-[#FF5C00]/30 rounded-2xl p-5 mb-6">
            <p className="text-white/80 text-sm font-semibold uppercase tracking-widest mb-2">When it&apos;s your turn, say:</p>
            <p className="text-white text-base italic leading-relaxed">&ldquo;{role.prompt}&rdquo;</p>
          </div>

          {/* Change Role — only visible while room is still 'waiting' */}
          {isWaiting && (
            <button
              onClick={handleChangeRole}
              disabled={loading}
              className="w-full mb-3 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-white/60 text-lg font-medium py-4 rounded-2xl transition-all duration-200"
            >
              {loading ? 'Loading...' : 'Change Role'}
            </button>
          )}

          <button
            onClick={() => setState('waiting')}
            className="w-full bg-white/10 hover:bg-white/20 text-white text-xl font-bold py-5 rounded-2xl transition-all duration-200"
          >
            Got it — I&apos;m ready
          </button>

          <PlayersPanel />
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

          <PlayersPanel />
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

          <PlayersPanel />
        </div>
      )}

    </main>
  )
}
