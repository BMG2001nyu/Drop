import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { buildReasoningPrompt } from '@/lib/gemini'
import { searchPlaces, SEARCH_PLACES_TOOL } from '@/lib/tools/searchPlaces'
import { verifyPlace } from '@/lib/tools/verifyPlace'

const GEMINI_MODEL = 'gemini-2.5-pro'
const GEMINI_BASE = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent`
const GEMINI_STREAM = `${GEMINI_BASE}?alt=sse`

export async function POST(req: Request) {
  try {
    const { roomId } = await req.json()
    const supabase = createServerClient()

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
    const apiKey = process.env.GEMINI_API_KEY
    const hasPlacesKey = !!process.env.GOOGLE_PLACES_API_KEY

    await supabase.from('rooms').update({ status: 'reasoning' }).eq('id', roomId)

    // ── Build conversation history (with optional tool use turn) ──────────
    let conversationHistory: object[] = [
      { role: 'user', parts: [{ text: prompt }] },
    ]

    if (hasPlacesKey && room.location) {
      // Turn 1: Non-streaming call with tool definitions
      const turn1Res = await fetch(`${GEMINI_BASE}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: conversationHistory,
          tools: [{ function_declarations: [SEARCH_PLACES_TOOL] }],
          toolConfig: { function_calling_config: { mode: 'AUTO' } },
          generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
        }),
      })

      if (turn1Res.ok) {
        const turn1Data = await turn1Res.json()
        const parts: any[] = turn1Data.candidates?.[0]?.content?.parts ?? []
        const funcCallPart = parts.find((p: any) => p.functionCall)

        if (funcCallPart) {
          const { name, args } = funcCallPart.functionCall
          conversationHistory.push({ role: 'model', parts: [{ functionCall: { name, args } }] })

          if (name === 'searchPlaces') {
            const places = await searchPlaces(
              args.query,
              args.location ?? room.location
            )
            conversationHistory.push({
              role: 'user',
              parts: [{ functionResponse: { name, response: { places } } }],
            })
          }
        }
        // If Gemini returned text directly (no tool call), continue with original history
      }
    }

    // ── Turn 2 (or Turn 1 fallback): Stream final reasoning ───────────────
    const geminiRes = await fetch(`${GEMINI_STREAM}&key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: conversationHistory,
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
            lineBuffer += decoder.decode(value, { stream: true })
            const lines = lineBuffer.split('\n')
            lineBuffer = lines.pop() ?? ''
            for (const line of lines) processLine(line)
          }

          // Parse decision
          const decisionMatch = fullText.match(/DECISION:\s*(.+)/i)
          const becauseMatch = fullText.match(/BECAUSE:\s*(.+)/i)
          const finalDecision = decisionMatch?.[1]?.trim() || 'Go with your gut.'
          const finalReason = becauseMatch?.[1]?.trim() || ''

          // Verify the decision against Places API
          let verificationStatus = 'warning'
          let verificationMessage = "Couldn't confirm — call ahead"

          if (hasPlacesKey && finalDecision !== 'Go with your gut.') {
            const result = await verifyPlace(finalDecision, room.location)
            verificationStatus = result.status
            verificationMessage = result.message
          }

          // Save final decision + status first (always works)
          await supabase
            .from('rooms')
            .update({
              reasoning_stream: fullText,
              final_decision: finalDecision,
              final_reason: finalReason,
              status: 'done',
            })
            .eq('id', roomId)

          // Save verification separately — columns may not exist yet if migration hasn't run
          try {
            await supabase
              .from('rooms')
              .update({
                verification_status: verificationStatus,
                verification_message: verificationMessage,
              })
              .eq('id', roomId)
          } catch {
            // Migration not yet applied — verification badge will show as pending
          }

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
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    console.error('Start reasoning error:', err)
    return NextResponse.json({ error: 'Failed to start reasoning' }, { status: 500 })
  }
}
