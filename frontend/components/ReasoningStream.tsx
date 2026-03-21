'use client'

import { useEffect, useRef } from 'react'

interface Props {
  text: string
}

export default function ReasoningStream({ text }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [text])

  const lines = text.split('\n').filter(l => l.trim())
  const isDecisionLine = (line: string) => line.match(/^DECISION:/i)
  const isBecauseLine = (line: string) => line.match(/^BECAUSE:/i)

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="w-3 h-3 rounded-full bg-[#FF5C00] animate-pulse" />
          <div className="w-3 h-3 rounded-full bg-[#FF5C00] animate-pulse delay-150" />
          <div className="w-3 h-3 rounded-full bg-[#FF5C00] animate-pulse delay-300" />
        </div>
        <h2 className="text-5xl font-black gradient-text">Drop is deciding...</h2>
      </div>

      {/* Reasoning text */}
      <div
        ref={containerRef}
        className="bg-white/3 border border-white/10 rounded-3xl p-8 max-h-[60vh] overflow-y-auto space-y-3"
      >
        {lines.map((line, i) => (
          <div
            key={i}
            className={`text-xl leading-relaxed transition-all duration-300 ${
              isDecisionLine(line)
                ? 'text-[#FF5C00] font-black text-3xl mt-6 pt-6 border-t border-white/10'
                : isBecauseLine(line)
                  ? 'text-white/80 text-xl italic'
                  : 'text-white/70'
            }`}
          >
            {line}
          </div>
        ))}
        {text && !text.match(/DECISION:/i) && (
          <div className="inline-block w-2 h-6 bg-[#FF5C00] animate-pulse ml-1 align-middle" />
        )}
      </div>
    </div>
  )
}
