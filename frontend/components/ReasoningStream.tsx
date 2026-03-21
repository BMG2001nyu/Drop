'use client'

import { useEffect, useRef } from 'react'

interface Props {
  text: string
  onThoughtComplete?: (thought: string, index: number) => void
}

export default function ReasoningStream({ text, onThoughtComplete }: Props) {
  const prevThoughtCount = useRef(0)

  const parts = text.split('\n')
  const completedThoughts = parts.slice(0, -1).filter(l => l.trim())
  const currentThought = parts[parts.length - 1] || ''

  const isDecisionLine = (line: string) => /^DECISION:/i.test(line.trim())
  const isBecauseLine = (line: string) => /^BECAUSE:/i.test(line.trim())

  const decisionThought = completedThoughts.find(isDecisionLine)
  const becauseThought = completedThoughts.find(isBecauseLine)
  const reasoningThoughts = completedThoughts.filter(l => !isDecisionLine(l) && !isBecauseLine(l))
  const currentIsDecision = isDecisionLine(currentThought)
  const hasDecision = !!(decisionThought || currentIsDecision)

  useEffect(() => {
    const count = completedThoughts.length
    if (count > prevThoughtCount.current && onThoughtComplete) {
      onThoughtComplete(completedThoughts[count - 1], count - 1)
      prevThoughtCount.current = count
    }
  }, [completedThoughts, onThoughtComplete])

  // Show last 4 completed reasoning thoughts, oldest→newest (top→bottom)
  const historyThoughts = reasoningThoughts.slice(-4)
  // Opacity/size per position — index 0 = oldest shown, last = newest
  const opacities = ['opacity-[6%]', 'opacity-[15%]', 'opacity-[32%]', 'opacity-[58%]']
  const sizes = ['text-xs', 'text-sm', 'text-sm', 'text-base']

  const decisionText = (decisionThought || currentThought).replace(/^DECISION:\s*/i, '')
  const decisionFontSize =
    decisionText.length > 80 ? 'text-2xl sm:text-3xl md:text-4xl' :
    decisionText.length > 45 ? 'text-3xl sm:text-4xl md:text-5xl' :
    'text-4xl sm:text-5xl md:text-6xl'

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] z-30 flex flex-col">

      {/* Ambient pulsing glow — shifts to stronger orange when decision arrives */}
      <div className={`absolute inset-0 pointer-events-none transition-all duration-1000 ${hasDecision ? 'decision-ambient' : 'reasoning-ambient'}`} />

      {/* Top status pill */}
      <div className="relative z-10 flex justify-center pt-10">
        {hasDecision ? (
          <div className="inline-flex items-center gap-2 bg-[#FF5C00]/10 border border-[#FF5C00]/40 rounded-full px-5 py-2 slide-up">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF5C00]" />
            <span className="text-[#FF5C00] text-xs uppercase tracking-[0.25em] font-bold">Drop has spoken</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-5 py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF5C00] animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF5C00] animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF5C00] animate-bounce" style={{ animationDelay: '300ms' }} />
            <span className="text-white/40 text-xs uppercase tracking-[0.2em] font-medium ml-1">Drop is deciding</span>
          </div>
        )}
      </div>

      {/* Main content area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-2xl">

          {!hasDecision ? (
            <>
              {/* Fading history thoughts — oldest at top, dimmer */}
              {historyThoughts.length > 0 && (
                <div className="space-y-3 mb-8 w-full">
                  {historyThoughts.map((thought, i) => (
                    <p
                      key={`${i}-${thought.slice(0, 20)}`}
                      className={`text-white text-center leading-relaxed transition-all duration-700 ${opacities[i] || 'opacity-[4%]'} ${sizes[i] || 'text-xs'}`}
                    >
                      {thought}
                    </p>
                  ))}
                </div>
              )}

              {/* Separator */}
              {historyThoughts.length > 0 && (
                <div className="flex justify-center mb-8">
                  <div className="w-20 h-px bg-gradient-to-r from-transparent via-[#FF5C00]/40 to-transparent" />
                </div>
              )}

              {/* Current live thought being typed */}
              <div className="text-center">
                <p className="text-white font-bold text-xl md:text-2xl leading-relaxed">
                  {currentThought}
                  <span className="inline-block w-0.5 h-6 bg-[#FF5C00] animate-pulse ml-1 align-middle" />
                </p>
              </div>

              {/* Empty — waiting for stream to start */}
              {!text && (
                <p className="text-white/20 text-base text-center mt-4">Analyzing what everyone said...</p>
              )}
            </>
          ) : (
            /* ── DECISION REVEALED ── */
            <div className="text-center">
              <h2 className={`text-crash ${decisionFontSize} font-black text-white leading-tight mb-4 glow-pulse break-words`}>
                {decisionText}
                {currentIsDecision && (
                  <span className="inline-block w-0.5 h-10 bg-[#FF5C00] animate-pulse ml-2 align-middle" />
                )}
              </h2>
              {becauseThought && (
                <p className="reason-fade text-white/50 text-base md:text-lg italic max-w-xl mx-auto leading-relaxed mt-4">
                  &ldquo;{becauseThought.replace(/^BECAUSE:\s*/i, '')}&rdquo;
                </p>
              )}
              <p className="text-white/20 text-xs uppercase tracking-widest mt-8 slide-up" style={{ animationDelay: '0.8s' }}>
                Final decision incoming...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom thought counter */}
      {reasoningThoughts.length > 0 && !hasDecision && (
        <div className="relative z-10 pb-8 text-center">
          <p className="text-white/15 text-xs tracking-widest uppercase">
            {reasoningThoughts.length} thought{reasoningThoughts.length !== 1 ? 's' : ''} processed
          </p>
        </div>
      )}
    </div>
  )
}
