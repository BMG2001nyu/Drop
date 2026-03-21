import { NextResponse } from 'next/server'

const IMAGEN_URL = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict`

export async function POST(req: Request) {
  try {
    const { decision, finalDecision } = await req.json()

    const prompt = `Cinematic, dramatic, high-contrast photograph for a group decision: "${finalDecision || decision}". Epic lighting, dark moody atmosphere, vivid colors, photorealistic, ultra-detailed. No text, no words, no letters. Pure visual impact. Shot like a movie poster. Deep blacks, intense highlights.`

    const res = await fetch(`${IMAGEN_URL}?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '16:9',
          personGeneration: 'DONT_ALLOW',
        },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Imagen API error:', err)
      return NextResponse.json({ error: 'Image generation failed' }, { status: 502 })
    }

    const data = await res.json()
    const prediction = data?.predictions?.[0]

    if (!prediction?.bytesBase64Encoded) {
      console.error('No image in response:', JSON.stringify(data))
      return NextResponse.json({ error: 'No image returned' }, { status: 502 })
    }

    return NextResponse.json({
      imageBase64: prediction.bytesBase64Encoded,
      mimeType: prediction.mimeType || 'image/png',
    })
  } catch (err) {
    console.error('generate-decision-image error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
