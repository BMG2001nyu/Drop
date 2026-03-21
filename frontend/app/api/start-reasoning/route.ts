import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { buildReasoningPrompt } from '@/lib/gemini'

const GEMINI_MODEL = 'gemini-1.5-pro'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent`

export async function POST(req: Request) {
  try {
    const { roomId } = await req.json()
    const supabase = createServerClient()

    // Fetch room + all transcripts
    const [{ data: room }, { data: players }] = await Promise.all([
      supabase.from('rooms').select('*').eq('id', roomId).single(),
      supabase.from('players').select('*').eq('room_id', roomId),
    ])

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    const transcripts = (players || [])
      .filter(p => p.transcript)
      .map(p => ({
        role: p.role,
        roleLabel: p.role_label,
        name: p.name,
        said: p.transcript!,
      }))

    if (transcripts.length === 0) {
      return NextResponse.json({ error: 'No transcripts found' }, { status: 400 })
    }

    const prompt = buildReasoningPrompt(room.decision, room.location, transcripts)

    // Update room status to reasoning
    await supabase.from('rooms').update({ status: 'reasoning' }).eq('id', roomId)

    // Call Gemini API directly with SSE streaming
    const geminiRes = await fetch(`${GEMINI_URL}?alt=sse&key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 8192 },
      }),
    })

    if (!geminiRes.ok || !geminiRes.body) {
      const errText = await geminiRes.text()
      console.error('Gemini API error:', errText)
      return NextResponse.json({ error: 'Gemini unavailable' }, { status: 502 })
    }

    let fullText = ''

    const stream = new ReadableStream({
      async start(controller) {
        const reader = geminiRes.body!.getReader()
        const decoder = new TextDecoder()
        let lineBuffer = ''

        const processLine = (line: string) => {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) return
          const jsonStr = trimmed.slice(5).trim()
          if (!jsonStr || jsonStr === '[DONE]') return
          try {
            const parsed = JSON.parse(jsonStr)
            const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text
            if (text) {
              fullText += text
              controller.enqueue(new TextEncoder().encode(text))
              if (fullText.length % 100 < text.length) {
                supabase.from('rooms').update({ reasoning_stream: fullText }).eq('id', roomId)
              }
            }
          } catch {
            // skip malformed chunks
          }
        }

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              if (lineBuffer) processLine(lineBuffer)
              break
            }

            // Buffer lines to handle chunks that split mid-line
            lineBuffer += decoder.decode(value, { stream: true })
            const lines = lineBuffer.split('\n')
            // Keep the last (possibly incomplete) line in the buffer
            lineBuffer = lines.pop() ?? ''
            for (const line of lines) processLine(line)
          }

          // Parse final decision and save
          const decisionMatch = fullText.match(/DECISION:\s*(.+)/i)
          const becauseMatch = fullText.match(/BECAUSE:\s*(.+)/i)

          await supabase
            .from('rooms')
            .update({
              reasoning_stream: fullText,
              final_decision: decisionMatch?.[1]?.trim() || 'Go with your gut.',
              final_reason: becauseMatch?.[1]?.trim() || '',
              status: 'done',
            })
            .eq('id', roomId)

          controller.close()
        } catch (err) {
          console.error('Stream error:', err)
          controller.error(err)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (err) {
    console.error('Start reasoning error:', err)
    return NextResponse.json({ error: 'Failed to start reasoning' }, { status: 500 })
  }
}
