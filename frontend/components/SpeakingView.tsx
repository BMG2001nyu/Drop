'use client'

import { useEffect, useRef, useState } from 'react'
import type { Role } from '@/lib/roles'

interface Props {
  role: Role
  playerName: string
  onSubmit: (transcript: string) => void
}

const SPEAKING_TIME = 15

type MicState = 'idle' | 'listening' | 'fallback' | 'submitted'

export default function SpeakingView({ role, playerName, onSubmit }: Props) {
  const [timeLeft, setTimeLeft] = useState(SPEAKING_TIME)
  const [micState, setMicState] = useState<MicState>('idle')
  const [liveTranscript, setLiveTranscript] = useState('')
  const [typedText, setTypedText] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const recognitionRef = useRef<any>(null)
  const transcriptRef = useRef('')
  const timerRef = useRef<ReturnType<typeof setInterval>>()
  const submittedRef = useRef(false)

  const isSpeechAvailable =
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    )

  const submitAndEnd = (finalTranscript: string) => {
    if (submittedRef.current) return
    submittedRef.current = true
    setMicState('submitted')
    clearInterval(timerRef.current)
    if (recognitionRef.current) recognitionRef.current.stop()
    onSubmit(finalTranscript.trim() || "I'm not sure, whatever the group wants.")
  }

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setMicState('listening')
      startTimer()
      setTimeout(() => recognition.stop(), SPEAKING_TIME * 1000)
    }

    recognition.onresult = (event: any) => {
      const text = Array.from(event.results as any[])
        .map((r: any) => r[0].transcript)
        .join(' ')
      setLiveTranscript(text)
      transcriptRef.current = text
    }

    recognition.onend = () => {
      if (!submittedRef.current) submitAndEnd(transcriptRef.current)
    }

    recognition.onerror = (event: any) => {
      clearInterval(timerRef.current)
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setErrorMsg('Mic permission denied. Type your answer below.')
      } else {
        setErrorMsg('Mic unavailable. Type your answer below.')
      }
      setMicState('fallback')
      startTimer()
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const handleTapToSpeak = () => {
    if (!isSpeechAvailable) {
      setErrorMsg('Voice not supported on this connection. Type your answer below.')
      setMicState('fallback')
      startTimer()
      return
    }
    startListening()
  }

  // Auto-trigger fallback text mode if speech unavailable
  useEffect(() => {
    if (!isSpeechAvailable) {
      setErrorMsg('Voice requires HTTPS. Type your answer below.')
      setMicState('fallback')
      startTimer()
    }
    return () => clearInterval(timerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference * (1 - timeLeft / SPEAKING_TIME)

  return (
    <div className="w-full max-w-sm text-center">
      {/* Role header */}
      <div className="bg-[#FF5C00]/10 border border-[#FF5C00]/30 rounded-3xl p-6 mb-6">
        <p className="text-[#FF5C00] text-sm font-bold uppercase tracking-widest mb-1">
          YOUR TURN — {playerName}
        </p>
        <p className="text-white font-black text-2xl">{role.emoji} {role.label}</p>
      </div>

      {/* Timer ring */}
      <div className="relative w-32 h-32 mx-auto mb-6">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="45"
            fill="none"
            stroke="#FF5C00"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-black text-white">{timeLeft}</span>
        </div>
      </div>

      {/* Prompt */}
      <div className="bg-white/5 rounded-2xl p-4 mb-6">
        <p className="text-white/80 text-base leading-relaxed italic">&ldquo;{role.prompt}&rdquo;</p>
      </div>

      {/* Error message */}
      {errorMsg && (
        <p className="text-yellow-400 text-sm mb-4">{errorMsg}</p>
      )}

      {/* STATE: idle — show tap to speak button */}
      {micState === 'idle' && (
        <button
          onClick={handleTapToSpeak}
          className="w-full bg-[#FF5C00] hover:bg-[#FF8C00] text-white text-xl font-black py-6 rounded-2xl transition-all duration-200 orange-glow flex items-center justify-center gap-3"
        >
          <span className="text-2xl">🎤</span> Tap to Speak
        </button>
      )}

      {/* STATE: listening — mic active */}
      {micState === 'listening' && (
        <>
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white/60 text-sm">Listening...</span>
          </div>
          {liveTranscript && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 text-left">
              <p className="text-white/40 text-xs mb-1 uppercase tracking-wider">Hearing you...</p>
              <p className="text-white text-sm leading-relaxed">{liveTranscript}</p>
            </div>
          )}
          <button
            onClick={() => submitAndEnd(transcriptRef.current)}
            className="w-full bg-white/10 hover:bg-white/20 text-white text-lg font-semibold py-4 rounded-2xl transition-all duration-200"
          >
            Done Speaking
          </button>
        </>
      )}

      {/* STATE: fallback — text input */}
      {micState === 'fallback' && (
        <>
          <textarea
            value={typedText}
            onChange={e => setTypedText(e.target.value)}
            placeholder="Type your response here..."
            rows={3}
            autoFocus
            className="w-full bg-white/5 border border-white/20 focus:border-[#FF5C00] rounded-2xl px-4 py-4 text-white text-base placeholder-white/20 focus:outline-none resize-none mb-4"
          />
          <button
            onClick={() => submitAndEnd(typedText)}
            className="w-full bg-[#FF5C00] hover:bg-[#FF8C00] text-white text-lg font-bold py-4 rounded-2xl transition-all duration-200"
          >
            Submit →
          </button>
        </>
      )}
    </div>
  )
}
