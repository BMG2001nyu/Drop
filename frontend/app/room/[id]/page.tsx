'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase, type Room, type Player } from '@/lib/supabase'
import { ROLES, type Role } from '@/lib/roles'
import QRDisplay from '@/components/QRDisplay'
import PlayerGrid from '@/components/PlayerGrid'
import ReasoningStream from '@/components/ReasoningStream'
import DecisionReveal from '@/components/DecisionReveal'
import SpeakingView from '@/components/SpeakingView'

interface Props {
  params: { id: string }
}

interface HostPlayer {
  id: string
  name: string
  role: string
  roleLabel: string
  roleEmoji: string
}

async function playAudio(text: string, type: 'challenge' | 'decision') {
  try {
    const res = await fetch('/api/speak-decision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, type }),
    })
    if (!res.ok) return
    const audioBlob = await res.blob()
    const audioUrl = URL.createObjectURL(audioBlob)
    const audio = new Audio(audioUrl)
    await audio.play()
  } catch (e) {
    console.error('Audio playback failed:', e)
  }
}

export default function RoomPage({ params }: Props) {
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [reasoningText, setReasoningText] = useState('')
  const hasAnnouncedDecision = useRef(false)
  const reasoningStarted = useRef(false)
  const hasAnnouncedMidpoint = useRef(false)
  const hasPlayedInstructions = useRef(false)

  // Host auto-join state
  const [hostJoinState, setHostJoinState] = useState<'prompt' | 'joined' | 'pick-role'>('prompt')
  const [hostPlayer, setHostPlayer] = useState<HostPlayer | null>(null)
  const [hostName, setHostName] = useState('')
  const [hostJoining, setHostJoining] = useState(false)
  const [hostAvailableRoles, setHostAvailableRoles] = useState<Role[]>([])
  const [hostHasSpoken, setHostHasSpoken] = useState(false)
  const [hostSpeakingPhase, setHostSpeakingPhase] = useState<'instructions' | 'overview' | 'my-turn'>('instructions')

  // Auto-detected location state
  const [resolvedLocation, setResolvedLocation] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const [{ data: roomData }, { data: playersData }] = await Promise.all([
      supabase.from('rooms').select('*').eq('id', params.id).single(),
      supabase.from('players').select('*').eq('room_id', params.id).order('joined_at', { ascending: true }),
    ])
    if (roomData) setRoom(roomData as Room)
    if (playersData) setPlayers(playersData as Player[])
    setLoading(false)
    return roomData as Room | null
  }, [params.id])

  const tryAutoLocation = useCallback(async (roomId: string) => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { 'User-Agent': 'Drop-App/1.0' } }
          )
          const data = await res.json()
          // Extract neighborhood + city from Nominatim response
          const addr = data.address
          const parts = [
            addr.neighbourhood || addr.suburb || addr.quarter,
            addr.city || addr.town || addr.village,
            addr.state,
          ].filter(Boolean)
          const locationStr = parts.slice(0, 2).join(', ')
          if (locationStr) {
            setResolvedLocation(locationStr)
            // Save to Supabase
            await fetch('/api/update-location', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ roomId, location: locationStr }),
            })
            // Update local room state
            setRoom(prev => prev ? { ...prev, location: locationStr } : prev)
          }
        } catch { /* silently fail */ }
      },
      () => { /* permission denied — silently continue */ },
      { timeout: 8000 }
    )
  }, [])

  const handleStartReasoning = useCallback(async () => {
    if (reasoningStarted.current) return
    reasoningStarted.current = true
    setReasoningText('')

    const res = await fetch('/api/start-reasoning', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: params.id }),
    })

    if (!res.body || !res.ok) {
      console.error('start-reasoning failed:', res.status)
      reasoningStarted.current = false // allow retry
      return
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      setReasoningText(prev => prev + chunk)
    }

    // Stream is done — server has already updated status to 'done' in Supabase.
    // Fetch immediately instead of waiting up to 2s for the polling interval.
    await fetchData()
  }, [params.id, fetchData])

  const handleThoughtComplete = useCallback((_thought: string, _index: number) => {
    // Voice callouts during reasoning removed — browser blocks audio without user gesture
  }, [])

  // Trigger reasoning when room.status becomes 'reasoning' via polling path
  // (realtime handles it too, but polling only updates state without calling handleStartReasoning)
  useEffect(() => {
    if (room?.status === 'reasoning' && !reasoningStarted.current) {
      handleStartReasoning()
    }
  }, [room?.status, handleStartReasoning])

  const handleStartDrop = async () => {
    if (!room) return

    await fetch('/api/start-speaking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: room.id }),
    })
  }

  const handleHostJoin = async () => {
    if (!hostName.trim() || !room) return
    setHostJoining(true)
    try {
      const res = await fetch('/api/join-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id, playerName: hostName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const hp: HostPlayer = {
        id: data.player.id,
        name: data.player.name,
        role: data.player.role,
        roleLabel: data.player.role_label,
        roleEmoji: data.player.role_emoji,
      }
      setHostPlayer(hp)
      setHostJoinState('joined')
      localStorage.setItem(`drop_host_${room.id}`, JSON.stringify(hp))
      fetchData()
    } catch (err) {
      console.error('Host join failed:', err)
    } finally {
      setHostJoining(false)
    }
  }

  const handleHostChangeRole = async () => {
    if (!room) return
    const res = await fetch(`/api/available-roles?roomId=${room.id}`)
    if (!res.ok) return
    const data = await res.json()
    // Include host's current role so they can re-select it
    const roles: Role[] = data.availableRoles
    if (hostPlayer && !roles.find(r => r.id === hostPlayer.role)) {
      const current = ROLES.find(r => r.id === hostPlayer.role)
      if (current) roles.unshift(current)
    }
    setHostAvailableRoles(roles)
    setHostJoinState('pick-role')
  }

  const handleHostRoleSwap = async (newRoleId: string) => {
    if (!hostPlayer || !room) return
    if (newRoleId === hostPlayer.role) { setHostJoinState('joined'); return }
    try {
      const res = await fetch('/api/change-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: hostPlayer.id, roomId: room.id, newRoleId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const hp: HostPlayer = {
        ...hostPlayer,
        role: data.player.role,
        roleLabel: data.player.role_label,
        roleEmoji: data.player.role_emoji,
      }
      setHostPlayer(hp)
      localStorage.setItem(`drop_host_${room.id}`, JSON.stringify(hp))
      fetchData()
    } finally {
      setHostJoinState('joined')
    }
  }

  const handleHostTranscript = async (transcript: string) => {
    if (!hostPlayer || !room) return
    await fetch('/api/submit-transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: hostPlayer.id, transcript, roomId: room.id }),
    })
    setHostHasSpoken(true)
    setHostSpeakingPhase('overview')
  }

  // Sync hostHasSpoken from players data (handles page refresh)
  useEffect(() => {
    if (hostPlayer && players.length > 0) {
      const p = players.find(pl => pl.id === hostPlayer.id)
      if (p?.has_spoken && !hostHasSpoken) {
        setHostHasSpoken(true)
        setHostSpeakingPhase('overview')
      }
    }
  }, [players, hostPlayer, hostHasSpoken])

  // Play ElevenLabs audio when instructions screen appears
  useEffect(() => {
    if (
      room?.status === 'speaking' &&
      hostSpeakingPhase === 'instructions' &&
      hostPlayer &&
      !hasPlayedInstructions.current
    ) {
      hasPlayedInstructions.current = true
      const hostRole = ROLES.find(r => r.id === hostPlayer.role)
      if (hostRole) {
        playAudio(
          `The drop has started. Your group needs to decide: ${room.decision}. You are ${hostRole.label}. ${hostRole.prompt} You have 15 seconds when it's your turn.`,
          'challenge'
        )
      }
    }
  }, [room?.status, room?.decision, hostSpeakingPhase, hostPlayer])

  // Auto-transition from overview to my-turn when it's the host's turn
  useEffect(() => {
    if (
      room?.status === 'speaking' &&
      hostSpeakingPhase === 'overview' &&
      hostPlayer &&
      room.current_speaker_role === hostPlayer.role &&
      !hostHasSpoken
    ) {
      setHostSpeakingPhase('my-turn')
    }
  }, [room?.status, room?.current_speaker_role, hostSpeakingPhase, hostPlayer, hostHasSpoken])

  useEffect(() => {
    fetchData().then((initialRoom) => {
      if (initialRoom?.status === 'reasoning' && !reasoningStarted.current) {
        handleStartReasoning()
      }

      // Auto-detect location if not already set
      if (!initialRoom?.location && initialRoom?.status === 'waiting') {
        tryAutoLocation(initialRoom.id)
      }

      // Restore host join state from localStorage
      if (initialRoom) {
        const saved = localStorage.getItem(`drop_host_${initialRoom.id}`)
        if (saved) {
          try {
            setHostPlayer(JSON.parse(saved) as HostPlayer)
            setHostJoinState('joined')
          } catch {
            // Ignore malformed localStorage data
          }
        }
      }
    })

    // Poll every 2s as a reliable backup to realtime
    const pollInterval = setInterval(() => fetchData(), 2000)

    const channel = supabase
      .channel(`room:${params.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'players',
      }, () => fetchData())
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
      }, (payload) => {
        const updatedRoom = payload.new as Room
        setRoom(updatedRoom)

        // Auto-trigger reasoning when all have spoken
        if (updatedRoom.status === 'reasoning' && !reasoningStarted.current) {
          handleStartReasoning()
        }

        // Announce final decision
        if (updatedRoom.status === 'done' && updatedRoom.final_decision && !hasAnnouncedDecision.current) {
          hasAnnouncedDecision.current = true
          playAudio(
            `Drop has decided. ${updatedRoom.final_decision}. ${updatedRoom.final_reason}`,
            'decision'
          )
        }
      })
      .subscribe()

    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
    }
  }, [params.id, fetchData, handleStartReasoning, tryAutoLocation])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white/40 text-2xl animate-pulse">Loading Drop...</div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white/40 text-2xl">Room not found</div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-white/5">
        <h1 className="text-4xl font-black gradient-text">Drop</h1>
        <div className="text-center">
          <p className="text-white/40 text-sm uppercase tracking-widest">The Question</p>
          <p className="text-white text-xl font-bold max-w-lg">{room.decision}</p>
          {(room.location || resolvedLocation) && (
            <p className="text-white/40 text-sm">
              📍 {room.location || resolvedLocation}
              {resolvedLocation && !room.location && <span className="text-[#FF5C00]/60 text-xs ml-1">(auto)</span>}
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-[#FF5C00] font-black text-2xl tracking-widest">{room.id}</div>
          <div className={`text-sm font-semibold uppercase tracking-wider mt-1 ${
            room.status === 'waiting' ? 'text-yellow-400' :
            room.status === 'speaking' ? 'text-green-400' :
            room.status === 'reasoning' ? 'text-[#FF5C00]' :
            'text-white'
          }`}>
            {room.status === 'waiting' && '⏳ Waiting for players'}
            {room.status === 'speaking' && '🎤 Speaking Round'}
            {room.status === 'reasoning' && '🧠 Drop is deciding...'}
            {room.status === 'done' && '✅ Decision made'}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-6">

        {/* STATE A: Waiting */}
        {room.status === 'waiting' && (
          <div className="w-full max-w-6xl">
            <div className="grid grid-cols-2 gap-12 items-start">
              <div>
                {/* Host join prompt — shown until host joins */}
                {hostJoinState === 'prompt' && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
                    <p className="text-white/50 text-xs uppercase tracking-widest mb-2">You&apos;re the host — join first</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={hostName}
                        onChange={e => setHostName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleHostJoin()}
                        placeholder="Your name"
                        className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#FF5C00]"
                      />
                      <button
                        onClick={handleHostJoin}
                        disabled={!hostName.trim() || hostJoining}
                        className="bg-[#FF5C00] hover:bg-[#FF8C00] disabled:bg-white/10 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all"
                      >
                        {hostJoining ? '...' : 'Join →'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Show host's role once joined */}
                {hostJoinState === 'joined' && hostPlayer && (
                  <div className="bg-[#FF5C00]/10 border border-[#FF5C00]/30 rounded-2xl p-4 mb-4">
                    <p className="text-[#FF5C00] text-xs uppercase tracking-widest mb-1">You&apos;re in as Host</p>
                    <div className="flex items-center justify-between">
                      <p className="text-white font-bold">{hostPlayer.roleEmoji} {hostPlayer.name} · {hostPlayer.roleLabel}</p>
                      <button
                        onClick={handleHostChangeRole}
                        className="text-white/40 hover:text-white text-xs underline transition-colors ml-3"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                )}

                {/* Host role picker */}
                {hostJoinState === 'pick-role' && hostPlayer && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
                    <p className="text-white/50 text-xs uppercase tracking-widest mb-3">Pick a different role</p>
                    <div className="space-y-2">
                      {hostAvailableRoles.map(r => {
                        const isCurrent = r.id === hostPlayer.role
                        return (
                          <button
                            key={r.id}
                            onClick={() => handleHostRoleSwap(r.id)}
                            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-all text-sm ${
                              isCurrent ? 'bg-[#FF5C00]/20 border border-[#FF5C00]/40 text-white' : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10'
                            }`}
                          >
                            <span>{r.emoji}</span>
                            <span className="font-semibold">{r.label}</span>
                            {isCurrent && <span className="ml-auto text-[#FF5C00] text-xs">Current</span>}
                          </button>
                        )
                      })}
                    </div>
                    <button onClick={() => setHostJoinState('joined')} className="mt-2 text-white/30 text-xs hover:text-white/50 transition-colors">
                      Cancel
                    </button>
                  </div>
                )}

                <QRDisplay roomId={room.id} />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white/60 mb-6 uppercase tracking-widest">
                  Roles Filling In
                </h2>
                <PlayerGrid players={players} />

                {players.length >= 2 && (
                  <button
                    onClick={handleStartDrop}
                    className="mt-8 w-full bg-[#FF5C00] hover:bg-[#FF8C00] text-white text-2xl font-black py-6 rounded-2xl transition-all duration-200 orange-glow hover:scale-[1.02]"
                  >
                    Start Drop ({players.length} players) →
                  </button>
                )}

                {players.length < 2 && (
                  <p className="mt-8 text-white/30 text-center text-lg">
                    Waiting for at least 2 players to join...
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STATE B: Speaking */}
        {room.status === 'speaking' && (
          <div className="w-full max-w-4xl">
            {hostPlayer ? (() => {
              const hostRole = ROLES.find(r => r.id === hostPlayer.role)

              // Phase 1: Instructions screen
              if (hostSpeakingPhase === 'instructions' && hostRole) {
                return (
                  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                    <div className="mb-6">
                      <p className="text-white/40 text-xs uppercase tracking-widest mb-2">The Question</p>
                      <p className="text-white text-3xl font-bold">{room.decision}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 max-w-lg w-full mb-6">
                      <div className="text-6xl mb-4">{hostRole.emoji}</div>
                      <h2 className="text-2xl font-black text-white mb-2">{hostRole.label}</h2>
                      <p className="text-white/60 text-lg leading-relaxed">{hostRole.prompt}</p>
                    </div>
                    <p className="text-white/30 text-sm mb-8">You have 15 seconds when it&apos;s your turn</p>
                    <button
                      onClick={() => setHostSpeakingPhase('overview')}
                      className="bg-[#FF5C00] hover:bg-[#FF8C00] text-white text-xl font-black px-10 py-4 rounded-2xl transition-all orange-glow"
                    >
                      Got it, I&apos;m ready →
                    </button>
                  </div>
                )
              }

              // Phase 3: Host's speaking turn
              if (hostSpeakingPhase === 'my-turn' && hostRole) {
                return (
                  <div>
                    <p className="text-center text-white/40 text-sm uppercase tracking-widest mb-6">Your turn to speak</p>
                    <SpeakingView
                      role={hostRole}
                      playerName={hostPlayer.name}
                      onSubmit={handleHostTranscript}
                    />
                  </div>
                )
              }

              // Phase 2 / 4: Overview — watching others or already spoke
              return (
                <div>
                  <div className="text-center mb-8">
                    <h2 className="text-5xl font-black text-white mb-4">Speaking Round</h2>
                    <p className="text-white/40 text-xl">
                      {hostHasSpoken
                        ? "You've spoken — waiting for others..."
                        : 'Each person has 15 seconds to speak their role'}
                    </p>
                  </div>
                  <PlayerGrid players={players} showSpeaking currentRole={room.current_speaker_role} />
                </div>
              )
            })() : (
              <div>
                <div className="text-center mb-8">
                  <h2 className="text-5xl font-black text-white mb-4">Speaking Round</h2>
                  <p className="text-white/40 text-xl">Each person has 15 seconds to speak their role</p>
                </div>
                <PlayerGrid players={players} showSpeaking currentRole={room.current_speaker_role} />
              </div>
            )}

            {players.every(p => p.has_spoken) && (
              <div className="mt-8 text-center">
                <button
                  onClick={handleStartReasoning}
                  className="bg-[#FF5C00] hover:bg-[#FF8C00] text-white text-2xl font-black px-12 py-6 rounded-2xl transition-all duration-200 orange-glow"
                >
                  All Done — Drop is deciding...
                </button>
              </div>
            )}
          </div>
        )}

        {/* STATE C: Reasoning */}
        {room.status === 'reasoning' && (
          <div className="w-full max-w-3xl">
            <ReasoningStream
            text={reasoningText || room.reasoning_stream || ''}
            onThoughtComplete={handleThoughtComplete}
          />
          </div>
        )}

        {/* STATE D: Done */}
        {room.status === 'done' && room.final_decision && (
          <div className="w-full max-w-3xl">
            <DecisionReveal
              decision={room.final_decision}
              reason={room.final_reason || ''}
              roomId={room.id}
              players={players}
              verificationStatus={room.verification_status}
              verificationMessage={room.verification_message}
            />
          </div>
        )}
      </div>
    </main>
  )
}
