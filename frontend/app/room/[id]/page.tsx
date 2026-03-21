'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase, type Room, type Player } from '@/lib/supabase'
import QRDisplay from '@/components/QRDisplay'
import PlayerGrid from '@/components/PlayerGrid'
import ReasoningStream from '@/components/ReasoningStream'
import DecisionReveal from '@/components/DecisionReveal'

interface Props {
  params: { id: string }
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

  const handleStartDrop = async () => {
    if (!room) return

    // Fire audio without awaiting — don't block speaking round on ElevenLabs
    playAudio(`Your group needs to decide: ${room.decision}. Each person will have 15 seconds to speak their role.`, 'challenge')

    await fetch('/api/start-speaking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: room.id }),
    })
  }

  // Trigger reasoning whenever room status becomes 'reasoning' — covers both
  // the realtime path and the polling path (polling updates room state but
  // the realtime handler is the only other place handleStartReasoning was called)
  useEffect(() => {
    if (room?.status === 'reasoning' && !reasoningStarted.current) {
      handleStartReasoning()
    }
  }, [room?.status, handleStartReasoning])

  useEffect(() => {
    fetchData().then((initialRoom) => {
      if (initialRoom?.status === 'reasoning' && !reasoningStarted.current) {
        handleStartReasoning()
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
  }, [params.id, fetchData, handleStartReasoning])

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
          {room.location && (
            <p className="text-white/40 text-sm">📍 {room.location}</p>
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
            <div className="text-center mb-8">
              <h2 className="text-5xl font-black text-white mb-4">Speaking Round</h2>
              <p className="text-white/40 text-xl">Each person has 15 seconds to speak their role</p>
            </div>
            <PlayerGrid players={players} showSpeaking currentRole={room.current_speaker_role} />

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
            />
          </div>
        )}
      </div>
    </main>
  )
}
