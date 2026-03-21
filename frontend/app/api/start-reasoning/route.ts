import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServerClient } from '@/lib/supabase-server'
import { buildReasoningPrompt } from '@/lib/gemini'

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

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContentStream(prompt)

    let fullText = ''

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text()
            fullText += text
            controller.enqueue(new TextEncoder().encode(text))

            // Update reasoning stream in DB periodically
            if (fullText.length % 100 < text.length) {
              await supabase
                .from('rooms')
                .update({ reasoning_stream: fullText })
                .eq('id', roomId)
            }
          }

          // Parse final decision
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
