'use client'

import { useEffect, useRef, useState } from 'react'
import type { Role } from '@/lib/roles'

interface Props {
  role: Role
  playerName: string
  onSubmit: (transcript: string) => void
}

const SPEAKING_TIME = 15

export default function SpeakingView({ role, playerName: _playerName, onSubmit }: Props) {
  const [timeLeft, setTimeLeft] = useState(SPEAKING_TIME)
  const [isListening, setIsListening] = useState(false)
  const [liveTranscript, setLiveTranscript] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const recognitionRef = useRef<any>(null)
  const transcriptRef = useRef('')
  const timerRef = useRef<ReturnType<typeof setInterval>>()
  const submittedRef = useRef(false)

  const submitAndEnd = (finalTranscript: string) => {
    if (submittedRef.current) return
    submittedRef.current = true
    setSubmitted(true)
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    clearInterval(timerRef.current)
    onSubmit(finalTranscript || liveTranscript || "I'm not sure, whatever the group wants.")
  }

  const startRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setIsListening(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results as any[])
        .map((r: any) => r[0].transcript)
        .join(' ')
      setLiveTranscript(transcript)
      transcriptRef.current = transcript
    }

    recognition.onend = () => {
      if (!submittedRef.current) {
        submitAndEnd(transcriptRef.current)
      }
    }

    recognition.onerror = () => {
      if (!submittedRef.current) {
        submitAndEnd(transcriptRef.current)
      }
    }

    recognition.start()
    recognitionRef.current = recognition
    setIsListening(true)

    // Countdown timer
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          recognition.stop()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // Hard stop at 15s
    setTimeout(() => {
      recognition.stop()
    }, SPEAKING_TIME * 1000)
  }

  useEffect(() => {
    // Auto-start after 1 second delay
    const startTimer = setTimeout(startRecording, 1000)
    return () => {
      clearTimeout(startTimer)
      clearInterval(timerRef.current)
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference * (1 - timeLeft / SPEAKING_TIME)

  return (
    <div className="w-full max-w-sm text-center">
      <div className="bg-[#FF5C00]/10 border border-[#FF5C00]/30 rounded-3xl p-6 mb-6">
        <p className="text-[#FF5C00] text-sm font-bold uppercase tracking-widest mb-1">YOUR TURN</p>
        <p className="text-white font-black text-2xl">{role.emoji} {role.label}</p>
      </div>

      {/* Timer */}
      <div className="relative w-32 h-32 mx-auto mb-6">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r="45"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="8"
          />
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

      {/* Live transcript */}
      {liveTranscript && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 text-left">
          <p className="text-white/40 text-xs mb-1 uppercase tracking-wider">Hearing you...</p>
          <p className="text-white text-sm leading-relaxed">{liveTranscript}</p>
        </div>
      )}

      {/* Mic indicator */}
      <div className="flex items-center justify-center gap-3">
        <div className={`w-4 h-4 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-white/20'}`} />
        <span className="text-white/60 text-sm">
          {isListening ? 'Listening...' : 'Starting...'}
        </span>
      </div>

      {!submitted && (
        <button
          onClick={() => submitAndEnd(transcriptRef.current)}
          className="mt-6 w-full bg-white/10 hover:bg-white/20 text-white text-lg font-semibold py-4 rounded-2xl transition-all duration-200"
        >
          Done Speaking
        </button>
      )}
    </div>
  )
}
