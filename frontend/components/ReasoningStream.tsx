'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  text: string
  onThoughtComplete?: (thought: string, index: number) => void
}

export default function ReasoningStream({ text, onThoughtComplete }: Props) {
  const prevThoughtCount = useRef(0)
  const [visible, setVisible] = useState(true)

  // Split into completed thoughts and the current in-progress thought
  const parts = text.split('\n')
  const completedThoughts = parts.slice(0, -1).filter(l => l.trim())
  const currentThought = parts[parts.length - 1] || ''

  const isDecisionLine = (line: string) => /^DECISION:/i.test(line.trim())
  const isBecauseLine = (line: string) => /^BECAUSE:/i.test(line.trim())

  const decisionThought = completedThoughts.find(isDecisionLine)
  const reasoningThoughts = completedThoughts.filter(l => !isDecisionLine(l) && !isBecauseLine(l))

  // Notify parent when a new thought completes
  useEffect(() => {
    const count = completedThoughts.length
    if (count > prevThoughtCount.current && onThoughtComplete) {
      const newThought = completedThoughts[count - 1]
      onThoughtComplete(newThought, count - 1)
      prevThoughtCount.current = count
    }
  }, [completedThoughts, onThoughtComplete])

  // Show last 3 completed reasoning thoughts as history
  const historyThoughts = reasoningThoughts.slice(-3)
  const historyOpacities = ['opacity-10', 'opacity-20', 'opacity-40']
  const historySizes = ['text-sm', 'text-base', 'text-lg']

  // Is the current in-progress thought a DECISION line?
  const currentIsDecision = isDecisionLine(currentThought)

  // Pulse animation on mount
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={containerRef} className="w-full min-h-[70vh] flex flex-col items-center justify-center relative px-4">

      {/* Header pulse */}
      <div className="absolute top-0 left-0 right-0 flex justify-center pt-2">
        <div className="inline-flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#FF5C00] animate-pulse" />
          <div className="w-2 h-2 rounded-full bg-[#FF5C00] animate-pulse" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-[#FF5C00] animate-pulse" style={{ animationDelay: '300ms' }} />
          <span className="text-white/40 text-xs uppercase tracking-widest ml-2">Drop is deciding</span>
        </div>
      </div>

      {/* History thoughts — fade up above center */}
      <div className="flex flex-col items-center gap-3 mb-10 w-full max-w-2xl">
        {historyThoughts.map((thought, i) => {
          const relativeIndex = i - (historyThoughts.length - 1) + 2
          const opacityClass = historyOpacities[Math.max(0, relativeIndex)]
          const sizeClass = historySizes[Math.max(0, relativeIndex)]
          return (
            <p
              key={`${thought}-${i}`}
              className={`text-white text-center leading-relaxed transition-all duration-700 ${opacityClass} ${sizeClass}`}
            >
              {thought}
            </p>
          )
        })}
      </div>

      {/* Divider */}
      {(currentThought || completedThoughts.length > 0) && (
        <div className="w-32 h-px bg-white/10 mb-10" />
      )}

      {/* DECISION reveal */}
      {decisionThought && !currentIsDecision ? (
        <div className="text-center animate-pulse-once">
          <p className="text-white/40 text-sm uppercase tracking-widest mb-4">Drop has spoken</p>
          <p className="text-[#FF5C00] font-black text-4xl leading-tight max-w-xl">
            {decisionThought.replace(/^DECISION:\s*/i, '')}
          </p>
        </div>
      ) : (
        /* Current thought being typed */
        <div className="text-center max-w-2xl">
          {currentIsDecision ? (
            <div>
              <p className="text-white/40 text-sm uppercase tracking-widest mb-4">Drop has spoken</p>
              <p className="text-[#FF5C00] font-black text-4xl leading-tight">
                {currentThought.replace(/^DECISION:\s*/i, '')}
                <span className="inline-block w-1 h-8 bg-[#FF5C00] animate-pulse ml-2 align-middle" />
              </p>
            </div>
          ) : (
            <p className="text-white font-black text-3xl leading-relaxed">
              {currentThought || (completedThoughts.length === 0 ? '' : '')}
              {!decisionThought && (
                <span className="inline-block w-1 h-7 bg-white animate-pulse ml-1 align-middle" />
              )}
            </p>
          )}
        </div>
      )}

      {/* Empty state */}
      {!text && (
        <div className="text-center">
          <h2 className="text-5xl font-black gradient-text mb-4">Drop is deciding...</h2>
          <p className="text-white/30 text-lg">Analyzing what everyone said</p>
        </div>
      )}
    </div>
  )
}
