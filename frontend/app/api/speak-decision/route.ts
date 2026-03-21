import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { text, type } = await req.json()
    // type: 'challenge' | 'decision'

    const voiceId = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB'
    const apiKey = process.env.ELEVENLABS_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: 'ElevenLabs not configured' }, { status: 500 })
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2',
          voice_settings: {
            stability: type === 'decision' ? 0.3 : 0.5,
            similarity_boost: 0.8,
            style: type === 'decision' ? 1.0 : 0.5,
            use_speaker_boost: true,
          },
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`ElevenLabs error: ${response.statusText}`)
    }

    const audioBuffer = await response.arrayBuffer()

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err) {
    console.error('Speak decision error:', err)
    return NextResponse.json({ error: 'Failed to generate speech' }, { status: 500 })
  }
}
